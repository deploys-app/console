import { listLoad } from '$lib/loaders'

export const load = listLoad<Api.NotificationItem, 'channels'>('notification.list', 'channels')
