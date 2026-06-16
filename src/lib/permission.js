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
	// The server only honors a '<resource>.*' wildcard for TWO-segment
	// permissions (iam.validPermissions checks len(parts)==2). Three-segment
	// permissions like 'serviceaccount.key.create' require an exact grant (or
	// '*'); 'serviceaccount.*' does NOT cover them. Mirror that exactly.
	const parts = permission.split('.')
	if (parts.length === 2 && permissions.includes(parts[0] + '.*')) return true
	return permissions.includes(permission)
}

/**
 * Default tooltip shown on a denied action control.
 * @param {string | undefined} permission  the missing permission, e.g. 'deployment.deploy'
 * @returns {string}
 */
export function denyTooltip (permission) {
	if (!permission) return 'You don\'t have permission to do this.'
	return `You don't have permission to do this (requires ${permission}).`
}
