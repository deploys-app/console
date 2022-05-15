import JSONBig from 'json-bigint'

const jsonBig = JSONBig({ storeAsString: true })

const endpoint = 'https://api.deploys.app'

let _token = ''

async function invoke (fn, args = {}) {
	const response = await fetch(`${endpoint}/${fn}`, {
		method: 'POST',
		body: JSONBig.stringify(args),
		headers: {
			'content-type': 'application/json',
			'authorization': _token ? `Bearer ${_token}` : undefined
		}
	})
	const body = jsonBig.parse(await response.text())
	if (!body.ok) {
		throw new Error(body.error)
	}
	return body.result
}

export default {
	loadToken: (storage) => {
		_token = storage.getItem('__token') || ''
	},
	setToken: (storage, token) => {
		// TODO: don't store token in localStorage when production
		storage.setItem('__token', token || '')
		_token = token
	},
	signOut: (goto) => {
		const url = `${endpoint}/auth/signout?token=${_token}&callback=https://www.deploys.app/`
		return goto(url)
	},
	randomState: (crypto) => {
		const x = new Uint8Array(16)
		crypto.getRandomValues(x)
		return Array.from(x, (d) => d.toString(16).padStart(2, '0')).join('')
	},
	me: {
		get: () => invoke('me.get'),
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
		}
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
	}
}
