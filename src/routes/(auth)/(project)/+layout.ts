import { error, redirect } from '@sveltejs/kit'
import api from '$lib/api'
import { browser } from '$app/environment'
import type { LayoutLoad } from './$types'

interface BrowserCache {
	project: string
	projectInfo: Api.Project
	locations: Api.Location[]
	permissions: string[] // caller's effective grants for this project
	permissionsAdmin: boolean // caller is a platform admin
}

let browserCache: BrowserCache | null = null

export const load: LayoutLoad = async ({ url, data, fetch }) => {
	const project = url.searchParams.get('project')
	const { restoreProject } = data || {}

	if (!project && restoreProject) {
		const q = new URLSearchParams(url.search)
		q.set('project', restoreProject)
		redirect(302, `?${q.toString()}`)
	}
	if (!project) redirect(302, '/project')

	if (browser && browserCache?.project === project) {
		return {
			project,
			projectInfo: browserCache.projectInfo,
			locations: browserCache.locations,
			permissions: browserCache.permissions,
			permissionsAdmin: browserCache.permissionsAdmin
		}
	}

	const projectInfo = await api.invoke<Api.Project>('project.get', { project }, fetch)
	if (!projectInfo.ok) {
		// not allow to access if user don't have permission 'project.get'
		if (projectInfo.error?.forbidden || projectInfo.error?.notFound) {
			redirect(302, '/project')
		}
		error(500, `project: ${projectInfo.error?.message}`)
	}
	if (!projectInfo.result) redirect(302, '/project')

	const locations = await api.invoke<Api.List<Api.Location>>('location.list', { project }, fetch)
	if (!locations.ok) error(500, `locations: ${locations.error?.message}`)
	if (!locations.result) redirect(302, '/project')

	// Effective permissions for the current user on this project. A non-ok
	// response must never break the page — gate everything off instead (empty
	// grants + non-admin), so action buttons render disabled rather than the
	// whole project layout failing to load.
	const permissionsResp = await api.invoke<{ permissions: string[], admin: boolean }>('me.permissions', { project }, fetch)
	const permissions = permissionsResp.ok ? (permissionsResp.result?.permissions ?? []) : []
	const permissionsAdmin = permissionsResp.ok ? (permissionsResp.result?.admin === true) : false

	if (browser) {
		browserCache = {
			project,
			projectInfo: projectInfo.result,
			locations: locations.result.items ?? [],
			permissions,
			permissionsAdmin
		}
	}

	return {
		project,
		projectInfo: projectInfo.result,
		locations: locations.result.items ?? [],
		permissions,
		permissionsAdmin
	}
}
