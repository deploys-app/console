import { listLoad } from '$lib/loaders'

export const load = listLoad<Api.PullSecret, 'pullSecrets'>('pullSecret.list', 'pullSecrets')
