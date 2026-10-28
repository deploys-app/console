const REGISTRY_HOST = 'registry.deploys.app'

// True only when the image host is registry.deploys.app (optional :port) and
// the first path segment equals project. A repository segment is required; a
// tag and a digest are optional. Nested repositories count.
export function sameProjectRegistryImage (image: string, project: string): boolean {
	if (!project) return false
	const ref = image.trim()
	if (!ref || /\s/.test(ref)) return false

	const digestAt = ref.indexOf('@')
	const withoutDigest = digestAt === -1 ? ref : ref.slice(0, digestAt)
	if (!withoutDigest) return false

	// No slash means there is no registry host (nginx:latest, or a tag on a
	// single name). A colon in that form is a tag, not a port.
	const slash = withoutDigest.indexOf('/')
	if (slash <= 0) return false

	const hostPort = withoutDigest.slice(0, slash)
	const repoPath = stripTag(withoutDigest.slice(slash + 1))
	if (!repoPath) return false

	// A colon in the first segment is a registry port (host:port/repo).
	const colon = hostPort.lastIndexOf(':')
	let host = hostPort
	if (colon !== -1) {
		const port = hostPort.slice(colon + 1)
		if (!/^\d+$/.test(port)) return false
		host = hostPort.slice(0, colon)
	}
	if (host.toLowerCase() !== REGISTRY_HOST) return false

	const segments = repoPath.split('/')
	// Namespace alone (registry.deploys.app/<project>) is not an image.
	if (segments.length < 2) return false
	if (segments.some((segment) => segment.length === 0)) return false
	return segments[0] === project
}

// A colon after the last slash is an image tag (name:tag), not a registry port.
function stripTag (path: string): string {
	const slash = path.lastIndexOf('/')
	const colon = path.lastIndexOf(':')
	if (colon > slash) return path.slice(0, colon)
	return path
}
