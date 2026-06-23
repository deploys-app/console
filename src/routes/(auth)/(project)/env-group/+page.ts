import { listLoad } from '$lib/loaders'

export const load = listLoad<Api.EnvGroupListItem, 'envGroups'>('envGroup.list', 'envGroups')
