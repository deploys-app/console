import { listLoad } from '$lib/loaders'

export const load = listLoad<Api.AlertItem, 'alerts'>('alert.list', 'alerts')
