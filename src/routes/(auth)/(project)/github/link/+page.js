import api from '$lib/api'

export async function load ({ parent, url, fetch }) {
	const { project } = await parent()

	const urlInstallationId = url.searchParams.get('installation_id')
		? Number(url.searchParams.get('installation_id'))
		: null
	const hasValidUrlId = urlInstallationId !== null && Number.isInteger(urlInstallationId) && urlInstallationId > 0

	// If a valid installation_id came from GitHub's setup redirect, persist it
	// BEFORE calling listRepos — the backend now restricts listRepos to saved ids.
	/** @type {Api.Error | undefined} */
	let addInstallationError
	if (hasValidUrlId) {
		const addResp = await api.invoke('github.addInstallation', { project, installationId: urlInstallationId }, fetch)
		if (!addResp.ok) {
			addInstallationError = addResp.error
		}
	}

	const [links, serviceAccounts, appInfo, installations] = await Promise.all([
		api.invoke('github.list', { project }, fetch),
		api.invoke('serviceAccount.list', { project }, fetch),
		api.invoke('github.getApp', { project }, fetch),
		api.invoke('github.listInstallations', { project }, fetch)
	])

	// Collect unique installation ids from saved installations + existing links + url param
	/** @type {Set<number>} */
	const installationIds = new Set()
	const savedItems = installations.result?.items ?? []
	for (const s of savedItems) {
		const id = s.installationId
		if (Number.isInteger(id) && id > 0) installationIds.add(id)
	}
	const linkItems = links.result?.items ?? []
	for (const l of linkItems) {
		const id = l.installationId
		if (Number.isInteger(id) && id > 0) installationIds.add(id)
	}
	if (hasValidUrlId) installationIds.add(urlInstallationId)

	// Fetch repos for each installation id in parallel
	/** @type {Map<number, Api.GithubRepoItem>} */
	const repoMap = new Map()
	/** @type {Api.Error | undefined} */
	let repoError = addInstallationError

	await Promise.all(
		[...installationIds].map(async (installationId) => {
			const resp = await api.invoke('github.listRepos', { project, installationId }, fetch)
			if (!resp.ok) {
				repoError = resp.error
				return
			}
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
		error,
		repoError
	}
}
