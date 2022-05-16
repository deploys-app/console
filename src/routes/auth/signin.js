import crypto from 'crypto'

function randomState () {
	return crypto.randomBytes(16).toString('hex')
	// const x = new Uint8Array(16)
	// crypto.getRandomValues(x)
	// return Array.from(x, (d) => d.toString(16).padStart(2, '0')).join('')
}

export async function get ({ locals, url }) {
	const state = randomState()

	const callback = new URL(url.toString())
	callback.pathname = '/auth/callback'

	const q = new URLSearchParams()
	q.set('callback', callback.toString())
	q.set('state', state)

	locals.session.data = {
		state,
		token: ''
	}
	console.log(`https://api.deploys.app/auth?${q.toString()}`)

	return {
		status: 302,
		headers: {
			location: `https://api.deploys.app/auth?${q.toString()}`
		}
	}
}
