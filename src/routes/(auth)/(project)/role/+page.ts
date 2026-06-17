import { listLoad } from '$lib/loaders'

export const load = listLoad<Api.Role, 'roles'>('role.list', 'roles')
