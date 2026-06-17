// Permission matching mirrors the server's effective-grant check exactly.
// `permissions` is the caller's effective grant set and may contain the
// wildcards '*' (all) and '<resource>.*' (all actions on a resource). `admin`
// means platform admin — it holds everything. Keep this in lockstep with the
// backend so a button rendered enabled here never gets rejected by the API
// (and vice versa).

/**
 * @param permissions effective grants (may include '*' and '<resource>.*')
 * @param permission e.g. 'deployment.deploy'
 */
export function hasPermission (permissions: string[] | undefined, admin: boolean, permission: string): boolean {
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
 * @param permission the missing permission, e.g. 'deployment.deploy'
 */
export function denyTooltip (permission: string | undefined): string {
	if (!permission) return 'You don\'t have permission to do this.'
	return `You don't have permission to do this (requires ${permission}).`
}
