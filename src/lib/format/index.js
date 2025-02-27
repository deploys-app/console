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
export function cpuLimited (v) {
	if (v === '0' || !v) {
		return 'Cluster Default'
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
 * @param {number} v
 * @returns {string}
 */
export function storage (v) {
	return (v / 1024 / 1024 / 1024).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' GiB'
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
 * @param {string} v
 * @returns {number}
 */
export function unixDatetime (v) {
	if (!v) {
		return 0
	}
	return dayjs(v).unix()
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
 * @param {Api.DeploymentType} t
 * @returns {string}
 */
export function deploymentType (t) {
	return {
		WebService: 'Web Service',
		TCPService: 'TCP Service',
		InternalTCPService: 'Internal TCP Service',
		Worker: 'Worker',
		CronJob: 'Cron Job'
	}[t] || t
}

/**
 * @param {string} s
 * @returns {string}
 */
export function shortDigest (s) {
	return s.replace(/^sha256:/, '').slice(0, 12)
}
