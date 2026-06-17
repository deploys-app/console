import { listLoad } from '$lib/loaders'

export const load = listLoad<Api.SchedulerJob, 'jobs'>('scheduler.list', 'jobs')
