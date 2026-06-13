import api from '$lib/api'

export async function load ({ parent, url, fetch }) {
	const { project } = await parent()

	const urlInstallationId = url.searchParams.get('installation_id')
		? Number(url.searchParams.get('installation_id'))
		: null
	const hasValidUrlId = urlInstallationId !== null && Number.isInteger(urlInstallationId) && urlInstallationId > 0

	// If a valid installation_id came from GitHub's setup redirect, persist it
	// BEFORE the client calls listRepos — the backend restricts listRepos to saved ids.
	/** @type {Api.Error | undefined} */
	let addInstallationError
	if (hasValidUrlId) {
		const addResp = await api.invoke('github.addInstallation', { project, installationId: urlInstallationId }, fetch)
		if (!addResp.ok) {
			addInstallationError = addResp.error
		}
	}

	const [
		links,
		serviceAccounts,
		appInfo,
		installations,
		canCreateSaResp,
		canBindResp,
		canCreateRoleResp,
		githubDeployRole
	] = await Promise.all([
		api.invoke('github.list', { project }, fetch),
		api.invoke('serviceAccount.list', { project }, fetch),
		api.invoke('github.getApp', { project }, fetch),
		api.invoke('github.listInstallations', { project }, fetch),
		// Up-front permission probes — me.authorized is a logical AND over the
		// listed permissions. A failed probe just gates the affordance off; it
		// must never break the page, so any non-ok response is treated as false.
		api.invoke('me.authorized', { project, permissions: ['serviceAccount.create'] }, fetch),
		api.invoke('me.authorized', { project, permissions: ['role.bind'] }, fetch),
		api.invoke('me.authorized', { project, permissions: ['role.create'] }, fetch),
		api.invoke('role.get', { project, role: 'github-deploy' }, fetch)
	])

	const canCreateServiceAccount = canCreateSaResp.result?.authorized === true
	const canBindRole = canBindResp.result?.authorized === true
	const canCreateRole = canCreateRoleResp.result?.authorized === true
	const githubDeployRoleExists = githubDeployRole.ok && !!githubDeployRole.result
	// Granting the deploy role needs role.bind, plus role.create only when the
	// shared github-deploy role doesn't exist yet.
	const canGrantRole = canBindRole && (githubDeployRoleExists || canCreateRole)

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

	// Set of already-linked repository ids
	const linkedRepoIds = new Set(linkItems.map((l) => l.repositoryId))

	/** @type {Api.Error | undefined} */
	const error = links.error ?? serviceAccounts.error ?? appInfo.error

	return {
		serviceAccounts: serviceAccounts.result?.items ?? [],
		installUrl: appInfo.result?.installUrl ?? '',
		linkedRepoIds: [...linkedRepoIds],
		error,
		addInstallationError,
		installationIds: [...installationIds],
		canCreateServiceAccount,
		canGrantRole
	}
}
