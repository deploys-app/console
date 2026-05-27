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

const compactNumber = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })

/**
 * Compact count, e.g. 950, 1.2K, 3.4M. Used for hit/match totals.
 * @param {number} v
 * @returns {string}
 */
export function count (v) {
	return compactNumber.format(v ?? 0)
}

/**
 * @param {string | undefined | null} v
 * @returns {string}
 */
export function datetime (v) {
	if (!v || v.startsWith('0001-01-01')) {
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

/**
 * @param {number} seconds
 * @returns {string}
 */
export function duration (seconds) {
	if (!seconds || seconds <= 0) {
		return ''
	}
	const d = Math.floor(seconds / 86400)
	const h = Math.floor((seconds % 86400) / 3600)
	const m = Math.floor((seconds % 3600) / 60)
	const s = Math.floor(seconds % 60)
	const parts = []
	if (d) parts.push(`${d}d`)
	if (h) parts.push(`${h}h`)
	if (m) parts.push(`${m}m`)
	if (s && !d && !h) parts.push(`${s}s`)
	return parts.join(' ') || '0s'
}

/**
 * @param {number} ttlSeconds
 * @returns {string}
 */
export function ttlExpireAt (ttlSeconds) {
	if (!ttlSeconds || ttlSeconds <= 0) {
		return ''
	}
	return dayjs().add(ttlSeconds, 'second').format('YYYY-MM-DD HH:mm:ss')
}
