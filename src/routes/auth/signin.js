import { webcrypto } from 'node:crypto'

const crypto = webcrypto

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
	console.log('set locals.state to', locals.state)

	return {
		status: 302,
		headers: {
			location: `https://api.deploys.app/auth?${q.toString()}`
		}
	}
}
