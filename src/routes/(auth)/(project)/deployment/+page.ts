import { listLoad } from '$lib/loaders'

export const load = listLoad<Api.Deployment, 'deployments'>('deployment.list', 'deployments')
