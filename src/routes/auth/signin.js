let webcrypto

// workaround for dev
if (typeof crypto === 'undefined') {
	import('node:crypto')
		.then((imp) => {
			webcrypto = imp.webcrypto
		})
		.catch(() => {
			// don't throw error on compile time
		})
} else {
	webcrypto = crypto
}

function randomState () {
	const x = new Uint8Array(16)
	webcrypto.getRandomValues(x)
	return Array.from(x, (d) => d.toString(16).padStart(2, '0')).join('')
}

export async function GET ({ locals, url }) {
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
