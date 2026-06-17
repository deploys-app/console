import api from '$lib/api'
import type { LoadEvent } from '@sveltejs/kit'

type ListData<K extends string, T> = { [P in K]: T[] } & { error?: Api.Error }

/**
 * Standard list-page loader. Fetches a project-scoped `*.list` RPC and returns
 * its items under `key` plus the error envelope — the identical body that was
 * repeated across every resource list page.
 *
 * Usage (in a `+page.ts`):
 *   export const load = listLoad<Api.Disk, 'disks'>('disk.list', 'disks')
 *
 * `project` comes from the parent (project) layout's data. Pages that need
 * extra fetches, args, or returned fields keep their own bespoke loader.
 */
export function listLoad<T, K extends string> (fn: string, key: K) {
	return async ({ parent, fetch }: LoadEvent): Promise<ListData<K, T>> => {
		const { project } = await parent() as { project: string }
		const res = await api.invoke<Api.List<T>>(fn, { project }, fetch)
		return { [key]: res.result?.items ?? [], error: res.error } as ListData<K, T>
	}
}
