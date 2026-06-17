import { listLoad } from '$lib/loaders'

export const load = listLoad<Api.EnvGroup, 'envGroups'>('envGroup.list', 'envGroups')
