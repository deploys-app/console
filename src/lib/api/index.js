import JSONBig from 'json-bigint'

const jsonBig = JSONBig({ storeAsString: true })

const endpoint = '/api'

async function _invoke (fn, args, fetch) {
	const response = await fetch(`${endpoint}/${fn}`, {
		method: 'POST',
		body: JSONBig.stringify(args),
		headers: {
			'content-type': 'application/json'
		}
	})
	return jsonBig.parse(await response.text())
}

let onUnauth

async function invoke (fn, args, fetch) {
	const body = await _invoke(fn, args || {}, fetch)
	if (!body.ok) {
		if (body.error?.message === 'api: unauthorized') {
			body.error.unauth = true
			onUnauth && onUnauth()
		}
		// throw new Error(body.error)
	}
	return body
}

export default {
	invoke,
	setOnUnauth: (callback) => {
		onUnauth = callback
	},
	signOut: (goto) => {
		// const url = `${endpoint}/auth/signout?token=${}&callback=https://www.deploys.app/`
		// return goto(url)
	},
	me: {
		get: (fetch) => invoke('me.get', {}, fetch),
		authorized: ({ projectId, project, permissions }) => invoke('me.authorized', { projectId, project, permissions })
	},
	project: {
		list: async () => {
			const result = await invoke('project.list')
			return result.projects
		},
		usage: async ({ project }) => {
			const result = await invoke('project.usage', { project })
			return {
				cpu: +result.cpu,
				cpuUsage: +result.cpuUsage,
				disk: +result.disk,
				egress: +result.egress,
				memory: +result.memory,
				replica: +result.replica
			}
		}
	},
	billing: {
		project: async ({ project }) => {
			const result = await invoke('billing.project', { project })
			return {
				price: +result.price
			}
		}
	},
	deployment: {
		list: async ({ project }) => {
			const result = await invoke('deployment.list', { project })
			return result.deployments
		},
		get: ({ project, location, name }) => invoke('deployment.get', { project, location, name })
	},
	route: {
		list: async ({ project }) => {
			const result = await invoke('route.list', { project })
			return result.items || []
		}
	},
	workloadIdentity: {
		list: async ({ project }) => {
			const result = await invoke('workloadidentity.list', { project })
			return result.list
		}
	},
	disk: {
		list: async ({ project }) => {
			const result = await invoke('disk.list', { project })
			return result.list
		}
	},
	pullSecret: {
		list: ({ project }) => invoke('pullsecret.list', { project })
	},
	role: {
		list: ({ project }) => invoke('role.list', { project }),
		users: ({ project }) => invoke('role.users', { project })
	},
	serviceAccount: {
		list: ({ project }) => invoke('serviceaccount.list', { project }),
		get: ({ project, id }) => invoke('serviceaccount.get', { project, id }),
		delete: ({ project, id }) => invoke('serviceaccount.delete', { project, id }),
		createKey: ({ project, id }) => invoke('serviceaccount.createKey', { project, id }),
		deleteKey: ({ project, id, secret }) => invoke('serviceaccount.deleteKey', { project, id, secret }),
	}
}
