import crypto from 'crypto'

function randomState () {
	return crypto.randomBytes(16).toString('hex')
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
