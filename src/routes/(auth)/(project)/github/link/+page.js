import api from '$lib/api'
import { hasPermission } from '$lib/permission'

export async function load ({ parent, url, fetch }) {
	const parentData = await parent()
	const { project, permissions, permissionsAdmin } = parentData

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
		githubDeployRole
	] = await Promise.all([
		api.invoke('github.list', { project }, fetch),
		api.invoke('serviceAccount.list', { project }, fetch),
		api.invoke('github.getApp', { project }, fetch),
		api.invoke('github.listInstallations', { project }, fetch),
		// Still needed to decide whether the shared github-deploy role already
		// exists (vs. needing role.create to grant it below).
		api.invoke('role.get', { project, role: 'github-deploy' }, fetch)
	])

	// Permission flags come from the project layout's effective grants (me.permissions)
	// rather than per-affordance me.authorized probes. hasPermission mirrors the
	// server's wildcard matching, so a denied grant just gates the affordance off.
	const canCreateServiceAccount = hasPermission(permissions, permissionsAdmin, 'serviceAccount.create')
	const githubDeployRoleExists = githubDeployRole.ok && !!githubDeployRole.result
	// Granting the deploy role needs role.bind, plus role.create only when the
	// shared github-deploy role doesn't exist yet.
	const canGrantRole = hasPermission(permissions, permissionsAdmin, 'role.bind') &&
		(githubDeployRoleExists || hasPermission(permissions, permissionsAdmin, 'role.create'))

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
