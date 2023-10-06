const landing = 'https://www.deploys.app/'

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST ({ locals }) {
	const token = locals.token

	if (token) {
		const q = new URLSearchParams()
		q.set('token', token)
		q.set('callback', landing)

		return new Response(undefined, {
			status: 302,
			headers: {
				location: `https://auth.deploys.app/revoke?${q.toString()}`
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
