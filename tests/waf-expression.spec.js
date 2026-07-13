// Unit/round-trip regression tests for the WAF CEL expression engine and rule
// helpers. These modules are pure (no Svelte/SvelteKit imports), so they're
// imported directly and exercised without a browser — fast and deterministic.
//
// The central invariant guarded here: `parseExpression` is the exact inverse of
// `buildGroup`/`buildExpression` for every form the generator can emit, and
// returns `null` for anything the visual builder can't faithfully represent
// (the page relies on that null to drop into raw-CEL mode).
import { test, expect } from '@playwright/test'
import {
	celString,
	parseList,
	getField,
	operatorsForField,
	isMultiOperator,
	buildExpression,
	combineExpression,
	buildGroup,
	parseExpression,
	wafListRefs
} from '../src/lib/waf/expression.js'
import {
	parseIPListEntries,
	validIPListEntry,
	validListName
} from '../src/lib/waf/lists.js'
import {
	ruleForm,
	genId,
	normalizeRules,
	toApiRules,
	DEFAULT_STATUS,
	DEFAULT_MESSAGE
} from '../src/lib/waf/rules.js'

test.describe('waf expression: celString', () => {
	test('escapes backslash, quote, and control chars', () => {
		expect(celString('a"b')).toBe('a\\"b')
		expect(celString('a\\b')).toBe('a\\\\b')
		expect(celString('a\nb\tc\rd')).toBe('a\\nb\\tc\\rd')
		expect(celString('plain')).toBe('plain')
	})

	test('coerces nullish to empty string', () => {
		expect(celString(/** @type {any} */ (undefined))).toBe('')
		expect(celString(/** @type {any} */ (null))).toBe('')
	})
})

test.describe('waf expression: parseList', () => {
	test('splits on commas and newlines, trims, drops empties', () => {
		expect(parseList('a, b\nc')).toEqual(['a', 'b', 'c'])
		expect(parseList(' a ,, \n b \n')).toEqual(['a', 'b'])
		expect(parseList('')).toEqual([])
	})
})

test.describe('waf expression: operatorsForField', () => {
	test('HTTP method offers membership only (no prefix/regex/contains)', () => {
		const ops = operatorsForField(getField('method')).map((o) => o.value)
		expect(ops).toEqual(['equals', 'not_equals', 'in_list', 'not_in_list'])
		expect(ops).not.toContain('contains_any')
		expect(ops).not.toContain('starts_with')
	})

	test('string field offers the full operator set', () => {
		const ops = operatorsForField(getField('path')).map((o) => o.value)
		expect(ops).toContain('contains_any')
		expect(ops).toContain('starts_with')
		expect(ops).toContain('matches_regex')
	})

	test('ip / numeric / membership / tls field types map to their operator sets', () => {
		expect(operatorsForField(getField('remote_ip')).map((o) => o.value))
			.toEqual(['in_cidr', 'ip_equals', 'in_ip_list', 'not_in_ip_list'])
		expect(operatorsForField(getField('content_length')).map((o) => o.value))
			.toEqual(['num_eq', 'num_ne', 'num_lt', 'num_gt', 'num_le', 'num_ge'])
		expect(operatorsForField(getField('country')).map((o) => o.value))
			.toEqual(['equals', 'not_equals', 'in_list', 'not_in_list'])
		// TLS is a fixed on/off toggle — no operators.
		expect(operatorsForField(getField('scheme'))).toEqual([])
	})

	test('isMultiOperator covers exactly the list operators', () => {
		expect(isMultiOperator('contains_any')).toBe(true)
		expect(isMultiOperator('in_list')).toBe(true)
		expect(isMultiOperator('not_in_list')).toBe(true)
		expect(isMultiOperator('equals')).toBe(false)
		expect(isMultiOperator('starts_with')).toBe(false)
	})
})

test.describe('waf expression: buildExpression', () => {
	test('string operators', () => {
		expect(buildExpression({ field: 'path', operator: 'equals', value: '/admin' }))
			.toBe('request.path == "/admin"')
		expect(buildExpression({ field: 'path', operator: 'not_equals', value: '/admin' }))
			.toBe('request.path != "/admin"')
		expect(buildExpression({ field: 'path', operator: 'starts_with', value: '/admin' }))
			.toBe('request.path.startsWith("/admin")')
		expect(buildExpression({ field: 'path', operator: 'not_starts_with', value: '/admin' }))
			.toBe('!request.path.startsWith("/admin")')
		expect(buildExpression({ field: 'path', operator: 'ends_with', value: '.php' }))
			.toBe('request.path.endsWith(".php")')
		expect(buildExpression({ field: 'path', operator: 'not_ends_with', value: '.php' }))
			.toBe('!request.path.endsWith(".php")')
		expect(buildExpression({ field: 'path', operator: 'matches_regex', value: '^/api/' }))
			.toBe('regexMatch(request.path, "^/api/")')
	})

	test('list operators (contains_any / in_list / not_in_list)', () => {
		expect(buildExpression({ field: 'path', operator: 'contains_any', values: 'a\nb' }))
			.toBe('containsAny(request.path, ["a", "b"])')
		expect(buildExpression({ field: 'path', operator: 'in_list', values: '/a\n/b' }))
			.toBe('request.path in ["/a", "/b"]')
		expect(buildExpression({ field: 'path', operator: 'not_in_list', values: '/a\n/b' }))
			.toBe('!(request.path in ["/a", "/b"])')
	})

	test('named map fields lowercase the name', () => {
		expect(buildExpression({ field: 'header', name: 'User-Agent', operator: 'equals', value: 'curl' }))
			.toBe('request.headers["user-agent"] == "curl"')
		expect(buildExpression({ field: 'cookie', name: 'Session', operator: 'equals', value: 'abc' }))
			.toBe('request.cookies["session"] == "abc"')
		expect(buildExpression({ field: 'arg', name: 'q', operator: 'equals', value: 'x' }))
			.toBe('request.args["q"] == "x"')
	})

	test('tls toggle ignores the operator (on → https, off → http)', () => {
		expect(buildExpression({ field: 'scheme', operator: 'equals', tls: true }))
			.toBe('request.scheme == "https"')
		expect(buildExpression({ field: 'scheme', operator: 'equals', tls: false }))
			.toBe('request.scheme == "http"')
		// tls defaults to on when unspecified.
		expect(buildExpression({ field: 'scheme', operator: 'equals' }))
			.toBe('request.scheme == "https"')
	})

	test('ip operators', () => {
		expect(buildExpression({ field: 'remote_ip', operator: 'in_cidr', value: '10.0.0.0/8' }))
			.toBe('ipInCidr(request.remote_ip, "10.0.0.0/8")')
		expect(buildExpression({ field: 'remote_ip', operator: 'ip_equals', value: '1.2.3.4' }))
			.toBe('request.remote_ip == "1.2.3.4"')
	})

	test('named IP list operators emit the ipInList platform macro', () => {
		expect(buildExpression({ field: 'remote_ip', operator: 'in_ip_list', value: 'office-ips' }))
			.toBe('ipInList(request.remote_ip, "office-ips")')
		expect(buildExpression({ field: 'remote_ip', operator: 'not_in_ip_list', value: 'office-ips' }))
			.toBe('!ipInList(request.remote_ip, "office-ips")')
		// The macro's name literal admits no escapes — only a valid list name may
		// be spliced (same grammar wafList.set accepts).
		expect(buildExpression({ field: 'remote_ip', operator: 'in_ip_list', value: 'a"b' })).toBe('')
		expect(buildExpression({ field: 'remote_ip', operator: 'in_ip_list', value: 'ab' })).toBe('') // too short
		expect(buildExpression({ field: 'remote_ip', operator: 'in_ip_list', value: 'Office' })).toBe('') // uppercase
		expect(buildExpression({ field: 'remote_ip', operator: 'in_ip_list', value: '' })).toBe('')
	})

	test('numeric operators', () => {
		expect(buildExpression({ field: 'content_length', operator: 'num_gt', value: '1048576' }))
			.toBe('request.content_length > 1048576')
		expect(buildExpression({ field: 'content_length', operator: 'num_le', value: '0' }))
			.toBe('request.content_length <= 0')
	})

	test('country membership quotes operands; asn membership keeps raw ints', () => {
		expect(buildExpression({ field: 'country', operator: 'in_list', values: 'US\nGB' }))
			.toBe('request.country in ["US", "GB"]')
		expect(buildExpression({ field: 'country', operator: 'not_in_list', values: 'US\nGB' }))
			.toBe('!(request.country in ["US", "GB"])')
		expect(buildExpression({ field: 'asn', operator: 'in_list', values: '13335\n16509' }))
			.toBe('request.asn in [13335, 16509]')
		expect(buildExpression({ field: 'asn', operator: 'equals', value: '13335' }))
			.toBe('request.asn == 13335')
	})

	test('escapes embedded quotes in operands', () => {
		expect(buildExpression({ field: 'path', operator: 'equals', value: 'a"b' }))
			.toBe('request.path == "a\\"b"')
	})

	test('returns empty string for incomplete specs', () => {
		expect(buildExpression({ field: 'path', operator: 'equals', value: '' })).toBe('')
		expect(buildExpression({ field: 'header', operator: 'equals', value: 'x' })).toBe('') // no name
		expect(buildExpression({ field: 'path', operator: 'in_list', values: '' })).toBe('') // empty list
		expect(buildExpression({ field: 'content_length', operator: 'num_gt', value: 'abc' })).toBe('') // not int
		expect(buildExpression({ field: 'asn', operator: 'equals', value: 'x' })).toBe('') // not digits
		expect(buildExpression({ field: 'remote_ip', operator: 'in_cidr', value: '' })).toBe('')
		expect(buildExpression({ field: 'nope', operator: 'equals', value: 'x' })).toBe('') // unknown field
	})
})

test.describe('waf expression: combineExpression', () => {
	test('replace / and / or, with empty existing handled', () => {
		expect(combineExpression('', 'A', 'and')).toBe('A')
		expect(combineExpression('A', 'B', 'replace')).toBe('B')
		expect(combineExpression('A', 'B', 'and')).toBe('A && B')
		expect(combineExpression('A', 'B', 'or')).toBe('A || B')
	})
})

test.describe('waf expression: buildGroup', () => {
	test('joins complete conditions and drops incomplete ones', () => {
		const conditions = [
			{ field: 'path', operator: 'equals', value: '/admin' },
			{ field: 'method', operator: 'equals', value: 'POST' },
			{ field: 'host', operator: 'equals', value: '' } // incomplete → dropped
		]
		expect(buildGroup('and', conditions))
			.toBe('request.path == "/admin" && request.method == "POST"')
		expect(buildGroup('or', conditions))
			.toBe('request.path == "/admin" || request.method == "POST"')
	})

	test('empty conditions produce an empty string', () => {
		expect(buildGroup('and', [])).toBe('')
	})
})

test.describe('waf expression: parseExpression round-trips', () => {
	// Every canonical string the generator can emit must parse back into specs
	// that regenerate the identical string (with the right combinator).
	const representable = [
		// string field, all operators
		'request.path == "/admin"',
		'request.path != "/admin"',
		'request.path in ["/a", "/b"]',
		'!(request.path in ["/a", "/b"])',
		'containsAny(request.path, ["a", "b"])',
		'request.path.startsWith("/admin")',
		'!request.path.startsWith("/admin")',
		'request.path.endsWith(".php")',
		'!request.path.endsWith(".php")',
		'regexMatch(request.path, "^/api/")',
		// method (membership)
		'request.method == "GET"',
		'request.method in ["GET", "POST"]',
		// named map fields
		'request.headers["user-agent"] == "curl"',
		'request.args["q"] != "x"',
		'request.cookies["session"] in ["a", "b"]',
		// tls
		'request.scheme == "https"',
		'request.scheme == "http"',
		// ip
		'ipInCidr(request.remote_ip, "10.0.0.0/8")',
		'request.remote_ip == "1.2.3.4"',
		// named IP lists (platform macro)
		'ipInList(request.remote_ip, "office-ips")',
		'!ipInList(request.remote_ip, "office-ips")',
		'ipInList(request.remote_ip, "office-ips") && request.path == "/admin"',
		// numeric
		'request.content_length > 1048576',
		'request.content_length <= 0',
		// country
		'request.country == "US"',
		'request.country in ["US", "GB"]',
		'!(request.country in ["US", "GB"])',
		// asn
		'request.asn == 13335',
		'request.asn in [13335, 16509]',
		'!(request.asn in [13335, 16509])',
		// escaped operand
		'request.path == "a\\"b"'
	]

	for (const cel of representable) {
		test(`round-trips: ${cel}`, () => {
			const parsed = parseExpression(cel)
			if (!parsed) throw new Error(`should be representable: ${cel}`)
			// Regenerating the parsed specs reproduces the exact input string.
			expect(buildGroup(parsed.combinator, parsed.conditions)).toBe(cel)
		})
	}

	test('multi-condition AND / OR keep their combinator', () => {
		const andExpr = 'request.path == "/a" && request.method == "GET"'
		const parsedAnd = parseExpression(andExpr)
		if (!parsedAnd) throw new Error('AND expression should be representable')
		expect(parsedAnd.combinator).toBe('and')
		expect(parsedAnd.conditions).toHaveLength(2)
		expect(buildGroup('and', parsedAnd.conditions)).toBe(andExpr)

		const orExpr = 'request.path == "/a" || request.path == "/b"'
		const parsedOr = parseExpression(orExpr)
		if (!parsedOr) throw new Error('OR expression should be representable')
		expect(parsedOr.combinator).toBe('or')
		expect(buildGroup('or', parsedOr.conditions)).toBe(orExpr)
	})

	test('empty expression is an empty AND group (not null)', () => {
		expect(parseExpression('')).toEqual({ combinator: 'and', conditions: [] })
		expect(parseExpression('   ')).toEqual({ combinator: 'and', conditions: [] })
	})
})

test.describe('waf expression: parseExpression rejects non-representable input', () => {
	const complex = [
		'request.path == "/a" && request.method == "GET" || request.host == "x"', // mixed && / ||
		'(request.path == "/a")', // grouping
		'lower(request.path) == "/a"', // unknown function
		'request.path.contains("admin")', // unsupported method
		'request.path == ', // missing operand
		'request.path = "/a"', // not a valid operator
		'request.unknown == "x"', // unknown accessor
		'request.path in []', // empty list never emitted
		'request.asn == abc', // non-numeric asn operand
		'ipInList(request.path, "office-ips")', // non-ip accessor
		'ipInList(request.remote_ip, "ab")', // list name too short
		'ipInList(request.remote_ip, "a\\"b")', // escaped name never emitted
		'ipInList(request.remote_ip, "office-ips", "extra")' // extra argument
	]

	for (const cel of complex) {
		test(`returns null: ${cel}`, () => {
			expect(parseExpression(cel)).toBeNull()
		})
	}
})

test.describe('waf rules helpers', () => {
	test('ruleForm fills defaults for a blank rule', () => {
		const f = ruleForm()
		expect(f.action).toBe('log')
		expect(f.status).toBe(DEFAULT_STATUS)
		expect(f.message).toBe(DEFAULT_MESSAGE)
		expect(f.expression).toBe('')
	})

	test('genId produces unique ids that avoid the taken set', () => {
		const taken = []
		for (let i = 0; i < 50; i++) {
			const id = genId(taken)
			expect(taken).not.toContain(id)
			expect(id).toMatch(/^rule-[a-z0-9]+$/)
			taken.push(id)
		}
	})

	test('normalizeRules sorts by priority and keeps order = execution order', () => {
		const out = normalizeRules([
			{ id: 'b', description: '', expression: 'x', action: 'log', priority: 2 },
			{ id: 'a', description: '', expression: 'y', action: 'log', priority: 1 }
		])
		expect(out.map((r) => r.id)).toEqual(['a', 'b'])
	})

	test('normalizeRules assigns ids to rules missing/duplicating one', () => {
		const out = normalizeRules([
			{ id: '', description: '', expression: 'x', action: 'log', priority: 0 },
			{ id: 'dup', description: '', expression: 'y', action: 'log', priority: 1 },
			{ id: 'dup', description: '', expression: 'z', action: 'log', priority: 2 }
		])
		const ids = out.map((r) => r.id)
		expect(new Set(ids).size).toBe(3) // all unique
		expect(ids.every((id) => id.length > 0)).toBe(true)
	})

	test('toApiRules sets priority from row order', () => {
		const api = toApiRules([
			{ id: 'r1', description: 'first', expression: 'a', action: 'log', status: null, message: '' },
			{ id: 'r2', description: 'second', expression: 'b', action: 'allow', status: null, message: '' }
		])
		expect(api.map((r) => r.priority)).toEqual([0, 1])
	})

	test('toApiRules includes status/message only for block, with fallbacks', () => {
		const [logRule, blockRule, blockDefault] = toApiRules([
			{ id: 'r1', description: '', expression: 'a', action: 'log', status: 500, message: 'x' },
			{ id: 'r2', description: '', expression: 'b', action: 'block', status: 429, message: 'Too many' },
			{ id: 'r3', description: '', expression: 'c', action: 'block', status: null, message: '' }
		])
		// Non-block rules never carry a response status/message.
		expect(logRule.status).toBeUndefined()
		expect(logRule.message).toBeUndefined()
		// Block rules carry their configured status/message.
		expect(blockRule.status).toBe(429)
		expect(blockRule.message).toBe('Too many')
		// Block rules fall back to the defaults when unset.
		expect(blockDefault.status).toBe(DEFAULT_STATUS)
		expect(blockDefault.message).toBe(DEFAULT_MESSAGE)
	})
})

test.describe('waf lists: wafListRefs (macro scanner)', () => {
	test('extracts, de-duplicates, and sorts referenced names', () => {
		expect(wafListRefs('ipInList(request.remote_ip, "office-ips")'))
			.toEqual(['office-ips'])
		expect(wafListRefs(
			'ipInList(request.remote_ip, "zeta") && !ipInList(request.remote_ip, "alpha") || ipInList(request.headers["x-real-ip"], "zeta")'
		)).toEqual(['alpha', 'zeta'])
		expect(wafListRefs('request.path == "/admin"')).toEqual([])
		expect(wafListRefs('')).toEqual([])
	})

	test('tolerates whitespace inside the macro punctuation', () => {
		expect(wafListRefs('ipInList( request.remote_ip ,\n\t"office-ips" )'))
			.toEqual(['office-ips'])
	})

	test('ignores the token inside string literals and comments', () => {
		// double- and single-quoted literals
		expect(wafListRefs('request.query == "ipInList(a, \\"office-ips\\")"')).toEqual([])
		expect(wafListRefs("request.query == 'ipInList(request.remote_ip, \"office-ips\")'")).toEqual([])
		// raw string literal (no escape processing)
		expect(wafListRefs('regexMatch(request.path, r"ipInList(request.remote_ip, \\"office-ips\\")")')).toEqual([])
		// triple-quoted literal
		expect(wafListRefs('request.query == """ipInList(request.remote_ip, "office-ips")"""')).toEqual([])
		// comment to end of line
		expect(wafListRefs('// ipInList(request.remote_ip, "office-ips")\nrequest.path == "/"')).toEqual([])
	})

	test('a longer identifier containing the token is not a macro', () => {
		expect(wafListRefs('myipInList(request.remote_ip, "office-ips")')).toEqual([])
		expect(wafListRefs('ipInListX(request.remote_ip, "office-ips")')).toEqual([])
	})

	test('malformed usages carry no resolvable ref', () => {
		expect(wafListRefs('ipInList(request.remote_ip)')).toEqual([]) // missing name
		expect(wafListRefs('ipInList(request.remote_ip, office)')).toEqual([]) // unquoted name
		expect(wafListRefs('ipInList(lower(request.path), "office-ips")')).toEqual([]) // call operand
		expect(wafListRefs('ipInList(request.remote_ip, "ab")')).toEqual([]) // name too short
		expect(wafListRefs('ipInList')).toEqual([]) // bare token
	})
})

test.describe('waf lists: validListName', () => {
	test('accepts the wafList.set name grammar (3..26, lowercase/digits/hyphens)', () => {
		expect(validListName('office-ips')).toBe(true)
		expect(validListName('abc')).toBe(true)
		expect(validListName('a2c')).toBe(true)
		expect(validListName('ab')).toBe(false) // too short
		expect(validListName('a'.repeat(27))).toBe(false) // too long
		expect(validListName('Office')).toBe(false) // uppercase
		expect(validListName('1abc')).toBe(false) // starts with a digit
		expect(validListName('abc-')).toBe(false) // ends with a hyphen
		expect(validListName('a b')).toBe(false)
	})
})

test.describe('waf lists: entry validation', () => {
	test('accepts IPv4/IPv6 addresses and CIDRs', () => {
		expect(validIPListEntry('203.0.113.7')).toBe(true)
		expect(validIPListEntry('203.0.113.0/24')).toBe(true)
		expect(validIPListEntry('0.0.0.0/0')).toBe(true)
		expect(validIPListEntry('2001:db8::1')).toBe(true)
		expect(validIPListEntry('2001:db8::/48')).toBe(true)
		expect(validIPListEntry('::1')).toBe(true)
		expect(validIPListEntry('::')).toBe(true)
		expect(validIPListEntry('::ffff:192.0.2.1')).toBe(true)
		expect(validIPListEntry('1:2:3:4:5:6:7:8')).toBe(true)
	})

	test('rejects garbage, zoned addresses, and out-of-range prefixes', () => {
		expect(validIPListEntry('not-an-ip')).toBe(false)
		expect(validIPListEntry('256.1.1.1')).toBe(false)
		expect(validIPListEntry('01.2.3.4')).toBe(false) // leading zero (netip-strict)
		expect(validIPListEntry('1.2.3')).toBe(false)
		expect(validIPListEntry('fe80::1%eth0')).toBe(false) // zoned
		expect(validIPListEntry('10.0.0.0/33')).toBe(false)
		expect(validIPListEntry('2001:db8::/129')).toBe(false)
		expect(validIPListEntry('10.0.0.0/08')).toBe(false) // leading-zero bits
		expect(validIPListEntry('1:2:3:4:5:6:7:8:9')).toBe(false) // too many groups
		expect(validIPListEntry('1::2::3')).toBe(false) // double '::'
	})
})

test.describe('waf lists: parseIPListEntries', () => {
	test('splits lines, trims, drops empties, keeps input order', () => {
		const { entries, errors } = parseIPListEntries('  203.0.113.7 \n\n2001:db8::/48\n')
		expect(entries).toEqual(['203.0.113.7', '2001:db8::/48'])
		expect(errors).toEqual([])
	})

	test('reports invalid lines by line number', () => {
		const { entries, errors } = parseIPListEntries('203.0.113.7\nnope\n10.0.0.0/8')
		expect(entries).toEqual(['203.0.113.7', 'nope', '10.0.0.0/8'])
		expect(errors).toHaveLength(1)
		expect(errors[0]).toContain('line 2')
		expect(errors[0]).toContain('nope')
	})

	test('flags duplicates against the first occurrence', () => {
		const { errors } = parseIPListEntries('203.0.113.7\n10.0.0.0/8\n203.0.113.7')
		expect(errors).toHaveLength(1)
		expect(errors[0]).toContain('line 3')
		expect(errors[0]).toContain('line 1')
	})

	test('flags over-long entries and oversize lists', () => {
		const long = '1'.repeat(65)
		expect(parseIPListEntries(long).errors[0]).toContain('64')
		const big = Array.from({ length: 1001 }, (_, i) => `10.${Math.floor(i / 250)}.${Math.floor(i / 10) % 25}.${(i % 10) + 1}/32`).join('\n')
		const { errors } = parseIPListEntries(big)
		expect(errors.some((e) => e.includes('1000'))).toBe(true)
	})

	test('empty input parses to an empty, error-free list', () => {
		expect(parseIPListEntries('')).toEqual({ entries: [], errors: [] })
		expect(parseIPListEntries('  \n ')).toEqual({ entries: [], errors: [] })
	})
})
