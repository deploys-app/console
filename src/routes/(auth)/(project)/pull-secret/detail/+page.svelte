<script>
	import { setupCopy } from '$lib/clipboard'
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import DangerZone from '$lib/components/DangerZone.svelte'

	const { data } = $props()

	const project = $derived(data.project)
	const location = $derived(data.location)
	const name = $derived(data.name)
	const pullSecret = $derived(data.pullSecret)

	onMount(() => {
		return setupCopy('.copy')
	})

	function deleteItem () {
		modal.confirm({
			title: `Delete "${pullSecret.name}"?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('pullSecret.delete', { project, location, name }, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await goto(`/pull-secret?project=${project}`)
			}
		})
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/pull-secret?project=${project}`} class="link"><h6>Pull Secrets</h6></a>
	</div>
	<div class="breadcrumb-item">
		<h6>{pullSecret.name}</h6>
	</div>
</div>

<br>
<div class="panel is-level-300 grid gap-6">
	<div class="grid grid-cols-1 gap-3">
		<h3><strong>Pull secret "{pullSecret.name}"</strong></h3>
	</div>

	<hr>

	<div class="content grid gap-4 w-full">
		<div class="field">
			<label for="input-name">Name</label>
			<div class="input">
				<input id="input-name" value={pullSecret.name} readonly disabled>
			</div>
		</div>
		<div class="field">
			<label for="input-location">Location</label>
			<div class="input">
				<input id="input-location" value={pullSecret.location} readonly disabled>
			</div>
		</div>
		<div class="field">
			<label for="input-server">Server</label>
			<div class="input -has-icon-right">
				<input id="input-server" value={pullSecret.spec.server} readonly disabled>
				<span class="icon -is-right copy"
					data-clipboard-text={pullSecret.spec.server}>
					<i class="fa-light fa-copy"></i>
				</span>
			</div>
		</div>
		<div class="field">
			<label for="input-username">Username</label>
			<div class="input -has-icon-right">
				<input id="input-username" value={pullSecret.spec.username} readonly disabled>
				<span class="icon -is-right copy"
					data-clipboard-text={pullSecret.spec.username}>
					<i class="fa-light fa-copy"></i>
				</span>
			</div>
		</div>
		<div class="field">
			<label for="input-password">Password</label>
			<div class="input -has-icon-right">
				<input id="input-password" type="password" value={pullSecret.spec.password} readonly disabled>
				<span class="icon -is-right copy"
					data-clipboard-text={pullSecret.spec.password}>
					<i class="fa-light fa-copy"></i>
				</span>
			</div>
		</div>

		<DangerZone description="Permanently delete this pull secret. Deployments using it will fail to pull images.">
			<button class="button is-variant-negative" type="button" onclick={deleteItem}>Delete</button>
		</DangerZone>
	</div>
</div>
