// workaround for dev
if (typeof crypto === 'undefined') {
	var crypto
	import('node:crypto')
		.then((imp) => {
			crypto = imp.webcrypto
		})
		.catch(() => {
			// don't throw error on compile time
		})
}

function randomState () {
	const x = new Uint8Array(16)
	crypto.getRandomValues(x)
	return Array.from(x, (d) => d.toString(16).padStart(2, '0')).join('')
}

export async function get ({ locals, url }) {
	const state = randomState()

	const callback = new URL(url.toString())
	callback.pathname = '/auth/callback'

	const q = new URLSearchParams()
	q.set('callback', callback.toString())
	q.set('state', state)

	locals.state = state

	return {
		status: 302,
		headers: {
			location: `https://api.deploys.app/auth?${q.toString()}`
		}
	}
}
