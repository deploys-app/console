// Permission matching mirrors the server's effective-grant check exactly.
// `permissions` is the caller's effective grant set and may contain the
// wildcards '*' (all) and '<resource>.*' (all actions on a resource). `admin`
// means platform admin — it holds everything. Keep this in lockstep with the
// backend so a button rendered enabled here never gets rejected by the API
// (and vice versa).

/**
 * @param {string[] | undefined} permissions  effective grants (may include '*' and '<resource>.*')
 * @param {boolean} admin
 * @param {string} permission  e.g. 'deployment.deploy'
 * @returns {boolean}
 */
export function hasPermission (permissions, admin, permission) {
	if (admin) return true
	if (!permissions || permissions.length === 0) return false
	if (permissions.includes('*')) return true
	const dot = permission.indexOf('.')
	if (dot > 0 && permissions.includes(permission.slice(0, dot) + '.*')) return true
	return permissions.includes(permission)
}

/**
 * Default tooltip shown on a denied action control.
 * @param {string} permission  the missing permission, e.g. 'deployment.deploy'
 * @returns {string}
 */
export function denyTooltip (permission) {
	return `You don't have permission to do this (requires ${permission}).`
}
