import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

export function cpu (v: string): string {
	if (v === '0') {
		return 'Shared'
	}
	return `${v} vCPU`
}

export function cpuLimited (v: string): string {
	if (v === '0' || !v) {
		return 'Default'
	}
	return `${v} vCPU`
}

export function memory (v: string): string {
	if (v === '0') {
		return 'Shared'
	}
	const m = v.match(/^(\d+)(\w+)$/) ?? []
	if (m.length !== 3) {
		return v
	}
	return `${m[1]} ${m[2]}B`
}

export function storage (v: number): string {
	return ((v ?? 0) / 1024 / 1024 / 1024).toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' GiB'
}

const compactNumber = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })

/**
 * Compact count, e.g. 950, 1.2K, 3.4M. Used for hit/match totals.
 */
export function count (v: number): string {
	return compactNumber.format(v ?? 0)
}

export function datetime (v: string | undefined | null): string {
	if (!v || v.startsWith('0001-01-01')) {
		return ''
	}
	return dayjs(v).format('YYYY-MM-DD HH:mm:ss')
}

export function gsaBinding (project: string, name: string, gsa: string, locationProject: string): string {
	const namespace = 'deploys'
	const matched = gsa.match(/^.*@([^.]+)\.iam.gserviceaccount.com$/) ?? []
	const googleProject = matched.length > 1 ? `\n    --project ${matched[1]} \\` : ''
	return `gcloud iam service-accounts add-iam-policy-binding \\
    --role roles/iam.workloadIdentityUser \\
    --member "serviceAccount:${locationProject}.svc.id.goog[${namespace}/${name}-${project}]" \\${googleProject}
    ${gsa}`
}

export function deploymentType (t: Api.DeploymentType): string {
	return {
		WebService: 'Web Service',
		TCPService: 'TCP Service',
		InternalTCPService: 'Internal TCP Service',
		Worker: 'Worker',
		CronJob: 'Cron Job',
		Static: 'Static'
	}[t] || t
}

export function shortDigest (s: string): string {
	return s.replace(/^sha256:/, '').slice(0, 12)
}

/**
 * releaseSha extracts a Static deployment's release-sha. A Static deployment
 * carries its release pointer either as a `site://<bucket>/<project>/<name>@<sha>`
 * URI (the `site` field) or as a bare digest (`siteManifestDigest`). Pass both;
 * the URI's trailing `@<sha>` wins, falling back to the bare digest, then to the
 * raw site string.
 */
export function releaseSha (d?: { site?: string, siteManifestDigest?: string }): string {
	const site = d?.site ?? ''
	const at = site.lastIndexOf('@')
	if (at >= 0) return site.slice(at + 1)
	return d?.siteManifestDigest || site
}

export function duration (seconds: number): string {
	if (!seconds || seconds <= 0) {
		return ''
	}
	const d = Math.floor(seconds / 86400)
	const h = Math.floor((seconds % 86400) / 3600)
	const m = Math.floor((seconds % 3600) / 60)
	const s = Math.floor(seconds % 60)
	const parts: string[] = []
	if (d) parts.push(`${d}d`)
	if (h) parts.push(`${h}h`)
	if (m) parts.push(`${m}m`)
	if (s && !d && !h) parts.push(`${s}s`)
	return parts.join(' ') || '0s'
}

export function ttlExpireAt (ttlSeconds: number): string {
	if (!ttlSeconds || ttlSeconds <= 0) {
		return ''
	}
	return dayjs().add(ttlSeconds, 'second').format('YYYY-MM-DD HH:mm:ss')
}

/**
 * Human-friendly relative time, e.g. "3 days ago". Empty for zero/unset dates.
 */
export function fromNow (v: string | undefined | null): string {
	if (!v || v.startsWith('0001-01-01')) {
		return ''
	}
	return dayjs(v).fromNow()
}
