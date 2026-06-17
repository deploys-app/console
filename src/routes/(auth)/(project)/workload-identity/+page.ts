import { listLoad } from '$lib/loaders'

export const load = listLoad<Api.WorkloadIdentity, 'workloadIdentities'>('workloadIdentity.list', 'workloadIdentities')
