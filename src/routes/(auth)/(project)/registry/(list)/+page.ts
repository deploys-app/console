import { listLoad } from '$lib/loaders'

export const load = listLoad<Api.Repository, 'repositories'>('registry.list', 'repositories')
