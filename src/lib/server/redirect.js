/**
 * sanitizeRedirect validates a post-login return path.
 *
 * The value travels through a query param and a cookie before it is emitted as
 * a `Location` header, so it is an open-redirect sink: an attacker who can craft
 * the sign-in URL must not be able to bounce the user to another origin after a
 * successful login. We therefore accept only same-origin absolute paths:
 *
 *  - must start with a single "/" (a path, never an absolute or scheme-relative URL)
 *  - must not start with "//" (protocol-relative — browsers treat these as URLs)
 *  - must not contain backslashes (some parsers fold "\" to "/") or control characters
 *    (CR/LF would enable header injection)
 *  - must not point back at the auth endpoints themselves (avoids a sign-in loop)
 *
 * Returns the safe path, or '' when the input is missing or fails any check.
 *
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function sanitizeRedirect (value) {
	if (!value) return ''
	if (!value.startsWith('/')) return ''
	if (value.startsWith('//')) return ''
	if (value.includes('\\')) return ''
	for (let i = 0; i < value.length; i++) {
		const c = value.charCodeAt(i)
		if (c <= 0x1f || c === 0x7f) return '' // C0 control characters and DEL
	}
	if (value === '/auth' || value.startsWith('/auth/')) return ''
	return value
}
