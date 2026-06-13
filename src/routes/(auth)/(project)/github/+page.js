import api from '$lib/api'
import { hasPermission } from '$lib/permission'

export async function load ({ parent, fetch }) {
	const { project, permissions, permissionsAdmin } = await parent()

	const [links, locations, envGroups, pullSecrets, githubPullRole] = await Promise.all([
		api.invoke('github.list', { project }, fetch),
		api.invoke('location.list', { project }, fetch),
		api.invoke('envGroup.list', { project }, fetch),
		// No location => every location's pull secrets; the generator filters by
		// the selected location client-side.
		api.invoke('pullSecret.list', { project }, fetch),
		// Decides whether provisioning the dedicated pull service account still
		// needs role.create (vs. the shared github-pull role already existing).
		api.invoke('role.get', { project, role: 'github-pull' }, fetch)
	])

	const githubPullRoleExists = githubPullRole.ok && !!githubPullRole.result
	// The "create dedicated pull secret" flow needs to: make a pull-only service
	// account, mint a key, bind the registry.pull role, and create the pull
	// secret. Gate the affordance on that whole set (lowercase canonical names,
	// matching the server's effective grants), plus role.create only when the
	// shared github-pull role doesn't exist yet.
	const canProvisionPullSecret =
		hasPermission(permissions, permissionsAdmin, 'serviceaccount.create') &&
		hasPermission(permissions, permissionsAdmin, 'serviceaccount.key.create') &&
		hasPermission(permissions, permissionsAdmin, 'pullsecret.create') &&
		hasPermission(permissions, permissionsAdmin, 'role.bind') &&
		(githubPullRoleExists || hasPermission(permissions, permissionsAdmin, 'role.create'))

	return {
		links: links.result?.items ?? [],
		locations: locations.result?.items ?? [],
		envGroups: envGroups.result?.items ?? [],
		pullSecrets: pullSecrets.result?.items ?? [],
		canProvisionPullSecret,
		error: links.error
	}
}
