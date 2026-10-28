import { error, redirect } from '@sveltejs/kit'
import api from '$lib/api'
import { hasPermission } from '$lib/permission'
import type { PageLoad } from './$types'

// Order is the deny tooltip: the first grant the caller lacks.
const REGISTRY_PULL_PERMISSIONS = [
	'serviceaccount.create',
	'serviceaccount.key.create',
	'pullsecret.create',
	'role.bind'
] as const

function missingRegistryPullPermission (
	permissions: string[] | undefined,
	admin: boolean,
	roleExists: boolean
): string {
	for (const permission of REGISTRY_PULL_PERMISSIONS) {
		if (!hasPermission(permissions, admin, permission)) return permission
	}
	// role.create is required only when the dedicated role is not already there.
	if (!roleExists && !hasPermission(permissions, admin, 'role.create')) return 'role.create'
	return ''
}

export const load: PageLoad = async ({ url, parent, fetch }) => {
	const { project, permissions, permissionsAdmin } = await parent()
	const location = url.searchParams.get('location')
	const name = url.searchParams.get('name')

	const deploymentPromise = (location && name)
		? api.invoke<Api.Deployment>('deployment.get', { project, location, name }, fetch)
		: Promise.resolve(null)
	// Existence is ok AND result.role === 'registry-pull'. The dev mock returns
	// some other role when the name is absent, so an ok response alone is not
	// existence.
	const rolePromise = api.invoke<Api.Role>('role.get', { project, role: 'registry-pull' }, fetch)

	const [deployment, registryPullRole] = await Promise.all([deploymentPromise, rolePromise])
	if (deployment && !deployment.ok) {
		if (deployment.error?.notFound) redirect(302, `/deployment?project=${project}`)
		error(500, deployment.error?.message)
	}

	const registryPullRoleExists = registryPullRole.ok && registryPullRole.result?.role === 'registry-pull'
	const registryPullMissingPermission = missingRegistryPullPermission(
		permissions,
		permissionsAdmin,
		registryPullRoleExists
	)

	return {
		deployment: deployment?.result,
		canProvisionRegistryPull: registryPullMissingPermission === '',
		registryPullMissingPermission
	}
}
