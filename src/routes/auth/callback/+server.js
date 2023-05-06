/** @type {import('@sveltejs/kit').RequestHandler} */
export async function GET ({ cookies, url }) {
	const state = url.searchParams.get('state')
	const code = url.searchParams.get('code')

	if (state !== cookies.get('state')) {
		return new Response('invalid state', { status: 400 })
	}

	cookies.set('token', code, {
		httpOnly: true,
		maxAge: 60 * 60 * 24 * 7,
		sameSite: 'lax',
		path: '/',
		secure: import.meta.env.PROD
	})
	cookies.delete('state', {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		secure: import.meta.env.PROD
	})

	return new Response(undefined, {
		status: 302,
		headers: {
			location: '/'
		}
	})
}
