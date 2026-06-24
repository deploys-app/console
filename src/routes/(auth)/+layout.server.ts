import type { LayoutServerLoad } from './$types'

// Expose whether a session cookie is present. The token is httpOnly so the
// universal +layout.ts can't read it — but it needs to tell two unauthorized
// cases apart: a first-time visitor with no session (bounce straight to
// sign-in) vs an expired session whose token the API now rejects (show the
// "Sign in to continue" page so the user re-authenticates deliberately).
export const load: LayoutServerLoad = ({ locals }) => {
	return { hasToken: !!locals.token }
}
