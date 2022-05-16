import { sequence } from '@sveltejs/kit/hooks'
import { handleSession } from 'svelte-kit-cookie-session'

const sessionSecret = import.meta.env.VITE_SESSION_SECRET

export function getSession ({ locals }) {
	return {
		project: locals.session.data?.project || ''
	}
}

function storeProject ({ event, resolve }) {
	const { url, locals } = event
	const project = url.searchParams.get('project')
	if (project && project !== locals.session.data?.project) {
		locals.session.data = {
			...locals.session.data,
			project
		}
	}

	return resolve(event)
}

export const handle = sequence(
	handleSession({
		secret: sessionSecret,
		rolling: 50,
		expires: 7,
		cookie: {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: import.meta.env.PROD
		}
	}),
	storeProject
)
