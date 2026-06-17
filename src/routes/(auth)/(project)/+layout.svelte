<script lang="ts">
	import type { LayoutData } from './$types'
	import type { Snippet } from 'svelte'
	import Cookie from 'js-cookie'
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { hasPermission, setPermissionContext } from '$lib/permission'

	const { data, children }: { data: LayoutData, children: Snippet } = $props()

	const project = $derived(data.project)

	// Provide a reactive `can(permission)` to every descendant page/component so
	// gated action controls (GuardedButton) can ask whether the current user is
	// allowed, without each page re-fetching permissions.
	//
	// Reactive source: the app `page` store ($page.data) rather than this
	// layout's own `data` prop. Both update on client-side navigation while this
	// layout stays mounted, but $page.data is the canonical merged load data and
	// matches the page-store convention used elsewhere in this repo — it stays
	// correct even if the permission fields were ever moved to a different load
	// level. `can` reads $page.data at call time, so it always reflects the
	// current project's permissions after navigation.
	setPermissionContext({
		can: (p: string) => hasPermission($page.data.permissions, $page.data.permissionsAdmin, p)
	})

	onMount(() => {
		Cookie.set('project', project, { expires: 7 })
	})
</script>

{@render children?.()}
