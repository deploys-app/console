import { listLoad } from '$lib/loaders'

export const load = listLoad<Api.ServiceAccount, 'serviceAccounts'>('serviceAccount.list', 'serviceAccounts')
