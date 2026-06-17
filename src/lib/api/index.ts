import { invalidate } from '$app/navigation'

const endpoint = '/api'

let onUnauth: (() => void) | undefined

interface InvokeOptions {
	/**
	 * when `silent`, an unauthorized response is flagged on the result but the
	 * global `onUnauth` handler is NOT fired. Use it for best-effort / background
	 * fan-outs (e.g. the search palette) where a single transient unauthorized
	 * must not reload the whole app.
	 */
	silent?: boolean
}

async function invoke<T> (fn: string, args: unknown, fetch: typeof globalThis.fetch, opts?: InvokeOptions): Promise<Api.Response<T>> {
	const resp = await fetch(`${endpoint}/${fn}`, {
		method: 'POST',
		body: JSON.stringify(args || {}),
		headers: {
			'content-type': 'application/json'
		}
	})

	// A failed upstream (or the proxy itself) can answer with a non-JSON body —
	// e.g. a gateway/ingress HTML error page on a 5xx. Parsing then throws, which
	// would escape every caller. Fall back to a synthesized error envelope so the
	// result shape is always `Api.Response`.
	let body: any
	try {
		body = await resp.json()
	} catch {
		body = null
	}
	if (!body || typeof body !== 'object') {
		return { ok: false, error: { message: `api: server error (${resp.status})` } }
	}

	if (!body.ok) {
		const msg = body.error?.message || ''
		switch (msg) {
		case 'api: unauthorized':
			body.error.unauth = true
			if (!opts?.silent) {
				onUnauth?.()
			}
			break
		case 'api: forbidden':
			body.error.forbidden = true
			break
		case 'iam: forbidden':
			body.error.forbidden = true
			break
		case 'api: validate error':
			body.error.validate = body.error.items
			break
		default:
			if (msg.startsWith('api: domain in used')) {
				// "api: domain in used by route(s): a/, b/api (+3 more)" — surface
				// the blocking routes so the UI can tell the user what to delete.
				body.error.domainInUsed = true
				const m = msg.match(/by route\(s\): (.+)$/)
				if (m) {
					const more = m[1].match(/\(\+(\d+) more\)\s*$/)
					body.error.routesMore = more ? Number(more[1]) : 0
					body.error.routes = m[1]
						.replace(/\s*\(\+\d+ more\)\s*$/, '')
						.split(', ')
						.map((s: string) => s.trim())
						.filter(Boolean)
				} else {
					body.error.routes = []
					body.error.routesMore = 0
				}
			} else if (msg.includes('api: ') && msg.includes('not found')) {
				body.error.notFound = true
			}
			break
		}
	}
	return body
}

function setOnUnauth (callback: () => void): void {
	onUnauth = callback
}

function wrapInvalidate (fn: string): Promise<void> {
	return invalidate(`${endpoint}/${fn}`)
}

/**
 * intervalInvalidate calls callback every interval milliseconds
 * must be called in onMount
 * callback can return a number to override the interval for only the next call
 */
function intervalInvalidate (callback: () => Promise<number | void>, interval: number): () => void {
	let p: ReturnType<typeof setTimeout>

	const f = async () => {
		let newInterval = await callback()
		if (!newInterval) {
			newInterval = interval
		}
		p = setTimeout(f, newInterval)
	}
	p = setTimeout(f, interval)

	return () => {
		clearTimeout(p)
	}
}

export default {
	invoke,
	setOnUnauth,
	invalidate: wrapInvalidate,
	intervalInvalidate
}
