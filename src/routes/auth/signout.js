const landing = 'https://www.deploys.app/'

export async function POST ({ locals }) {
	const token = locals.token

	if (token) {
		const q = new URLSearchParams()
		q.set('token', token)
		q.set('callback', landing)

		return {
			status: 302,
			headers: {
				location: `https://api.deploys.app/auth/signout?${q.toString()}`
			}
		}
	}

	return {
		status: 302,
		headers: {
			location: landing
		}
	}
}
