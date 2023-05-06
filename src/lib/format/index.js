import dayjs from 'dayjs'

export default {
	cpu (v) {
		if (v === '0') {
			return 'Shared'
		}
		return `${v} vCPU`
	},
	memory (v) {
		if (v === '0') {
			return 'Shared'
		}
		const m = v.match(/^(\d+)(\w+)$/)
		if (m.length !== 3) {
			return v
		}
		return `${m[1]} ${m[2]}B`
	},
	datetime (v) {
		if (!v) {
			return ''
		}
		return dayjs(v).format('YYYY-MM-DD HH:mm:ss')
	},
	gsaBinding (project, name, gsa, locationProject) {
		const namespace = 'deploys'
		const matched = gsa.match(/^.*@([^.]+)\.iam.gserviceaccount.com$/) || []
		const googleProject = matched.length > 1 ? `\n    --project ${matched[1]} \\` : ''
		return `gcloud iam service-accounts add-iam-policy-binding \\
    --role roles/iam.workloadIdentityUser \\
    --member "serviceAccount:${locationProject}.svc.id.goog[${namespace}/${name}-${project}]" \\${googleProject}
    ${gsa}`
	},
	deploymentType (t) {
		return {
			WebService: 'Web Service',
			TCPService: 'TCP Service',
			InternalTCPService: 'Internal TCP Service'
		}[t] || t
	}
}
