import { listLoad } from '$lib/loaders'

// me.listTokens lists the caller's OWN active scoped tokens for the project
// (auth-only, no permission). The token value is never returned.
export const load = listLoad<Api.ScopedToken, 'tokens'>('me.listTokens', 'tokens')
