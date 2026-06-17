import { listLoad } from '$lib/loaders'

export const load = listLoad<Api.Disk, 'disks'>('disk.list', 'disks')
