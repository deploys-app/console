import api from '$lib/api'

export async function load ({ parent, url, fetch }) {
	const { project } = await parent()

	const urlInstallationId = url.searchParams.get('installation_id')
		? Number(url.searchParams.get('installation_id'))
		: null

	const [links, serviceAccounts, appInfo] = await Promise.all([
		api.invoke('github.list', { project }, fetch),
		api.invoke('serviceAccount.list', { project }, fetch),
		api.invoke('github.getApp', { project }, fetch)
	])

	// Collect unique installation ids from existing links + url param
	/** @type {Set<number>} */
	const installationIds = new Set()
	const linkItems = links.result?.items ?? []
	for (const l of linkItems) {
		if (l.installationId) installationIds.add(l.installationId)
	}
	if (urlInstallationId) installationIds.add(urlInstallationId)

	// Fetch repos for each installation id in parallel
	/** @type {Map<number, Api.GithubRepoItem>} */
	const repoMap = new Map()

	await Promise.all(
		[...installationIds].map(async (installationId) => {
			const resp = await api.invoke('github.listRepos', { project, installationId }, fetch)
			for (const item of resp.result?.items ?? []) {
				if (!repoMap.has(item.repositoryId)) {
					repoMap.set(item.repositoryId, { ...item, installationId })
				}
			}
		})
	)

	// Sort by repository name
	const repos = [...repoMap.values()].sort((a, b) => a.repository.localeCompare(b.repository))

	// Set of already-linked repository ids
	const linkedRepoIds = new Set(linkItems.map((l) => l.repositoryId))

	/** @type {Api.Error | undefined} */
	const error = links.error ?? serviceAccounts.error ?? appInfo.error

	return {
		repos,
		serviceAccounts: serviceAccounts.result?.items ?? [],
		installUrl: appInfo.result?.installUrl ?? '',
		linkedRepoIds: [...linkedRepoIds],
		error
	}
}
