export async function get ({ locals, url }) {
	const state = url.searchParams.get('state')
	const code = url.searchParams.get('code')

	console.log(state, code, locals.session.data)

	if (state !== locals.session.data?.state) {
		return {
			status: 400,
			body: 'invalid state'
		}
	}

	locals.session.data = {
		state: '',
		token: code
	}

	return {
		status: 302,
		headers: {
			location: '/'
		}
	}
}
