import { listLoad } from '$lib/loaders'

export const load = listLoad<Api.Route, 'routes'>('route.list', 'routes')
