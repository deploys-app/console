import { listLoad } from '$lib/loaders'

export const load = listLoad<Api.DeploymentListItem, 'deployments'>('deployment.list', 'deployments')
