import dayjs from 'dayjs'

/**
 * @param {string} v
 * @returns {string}
 */
export function cpu (v) {
	if (v === '0') {
		return 'Shared'
	}
	return `${v} vCPU`
}

/**
 * @param {string} v
 * @returns {string}
 */
export function memory (v) {
	if (v === '0') {
		return 'Shared'
	}
	const m = v.match(/^(\d+)(\w+)$/) ?? []
	if (m.length !== 3) {
		return v
	}
	return `${m[1]} ${m[2]}B`
}

/**
 * @param {string} v
 * @returns {string}
 */
export function datetime (v) {
	if (!v) {
		return ''
	}
	return dayjs(v).format('YYYY-MM-DD HH:mm:ss')
}

/**
 * @param {string} project
 * @param {string} name
 * @param {string} gsa
 * @param {string} locationProject
 * @returns {string}
 */
export function gsaBinding (project, name, gsa, locationProject) {
	const namespace = 'deploys'
	const matched = gsa.match(/^.*@([^.]+)\.iam.gserviceaccount.com$/) ?? []
	const googleProject = matched.length > 1 ? `\n    --project ${matched[1]} \\` : ''
	return `gcloud iam service-accounts add-iam-policy-binding \\
    --role roles/iam.workloadIdentityUser \\
    --member "serviceAccount:${locationProject}.svc.id.goog[${namespace}/${name}-${project}]" \\${googleProject}
    ${gsa}`
}

/**
 * @param {string} t
 * @returns {string}
 */
export function deploymentType (t) {
	return {
		WebService: 'Web Service',
		TCPService: 'TCP Service',
		InternalTCPService: 'Internal TCP Service'
	}[t] || t
}
