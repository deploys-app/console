type DeploymentStatusFields = {
	action: Api.DeploymentAction
	status: Api.DeploymentStatus
}

export type DeploymentStatusTone = 'positive' | 'warning' | 'negative'

export type DeploymentStatusView = {
	label: string
	tone: DeploymentStatusTone
}

/**
 * Canonical status copy + tone for a deployment. Shared by the list page and
 * the detail header so the two cannot drift.
 *
 * Action is checked before status: a pending delete also has `status: 'pending'`,
 * which would otherwise label as Pending.
 */
export function deploymentStatus (d: DeploymentStatusFields): DeploymentStatusView {
	let label: string
	if (d.action === 'pause') label = 'Paused'
	else if (d.action === 'delete') label = 'Deleting'
	else if (d.status === 'pending') label = 'Pending'
	else if (d.status === 'error') label = 'Error'
	else if (d.status === 'cancelled') label = 'Cancelled'
	else label = 'Success'

	let tone: DeploymentStatusTone
	if (d.status === 'success' && d.action === 'pause') tone = 'warning'
	else if (d.status === 'success') tone = 'positive'
	else if (d.status === 'pending') tone = 'warning'
	else tone = 'negative'

	return { label, tone }
}

/** Pill next to the name. Hidden for a healthy running deployment. */
export function deploymentStatusPill (d: DeploymentStatusFields): DeploymentStatusView | null {
	if (d.action === 'deploy' && d.status === 'success') return null
	return deploymentStatus(d)
}
