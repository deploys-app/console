export async function GET ({ locals, url }) {
	const state = url.searchParams.get('state')
	const code = url.searchParams.get('code')

	if (state !== locals.state) {
		return new Response('invalid state', { status: 400 })
	}

	locals.state = null
	locals.token = code

	return new Response(undefined, {
		status: 302,
		headers: {
			location: '/'
		}
	})
}
