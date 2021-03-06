export async function GET ({ locals, url }) {
	const state = url.searchParams.get('state')
	const code = url.searchParams.get('code')

	if (state !== locals.state) {
		return {
			status: 400,
			body: 'invalid state'
		}
	}

	locals.state = null
	locals.token = code

	return {
		status: 302,
		headers: {
			location: '/'
		}
	}
}
