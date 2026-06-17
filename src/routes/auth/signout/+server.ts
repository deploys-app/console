import type { RequestHandler } from './$types'
import { env } from '$env/dynamic/private'

const authEndpoint = env.AUTH_ENDPOINT || 'https://auth.deploys.app'
const landing = 'https://www.deploys.app/'

export const POST: RequestHandler = async ({ locals }) => {
	const token = locals.token

	if (token) {
		const q = new URLSearchParams()
		q.set('token', token)
		q.set('callback', landing)

		return new Response(undefined, {
			status: 302,
			headers: {
				location: `${authEndpoint}/revoke?${q.toString()}`
			}
		})
	}

	return new Response(undefined, {
		status: 302,
		headers: {
			location: landing
		}
	})
}
