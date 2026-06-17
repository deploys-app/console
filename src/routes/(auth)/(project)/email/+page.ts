import { listLoad } from '$lib/loaders'

export const load = listLoad<Api.EmailDomain, 'domains'>('email.list', 'domains')
