import { listLoad } from '$lib/loaders'

export const load = listLoad<Api.Domain, 'domains'>('domain.list', 'domains')
