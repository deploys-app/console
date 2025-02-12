<script>
	import ClipboardJS from 'clipboard'
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()

	const project = $derived(data.project)
	const location = $derived(data.location)
	const name = $derived(data.name)
	const pullSecret = $derived(data.pullSecret)

	onMount(() => {
		const copyList = new ClipboardJS('.copy')
		return () => {
			copyList?.destroy()
		}
	})

	function deleteItem () {
		modal.confirm({
			title: `Delete "${pullSecret.name}" ?`,
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

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href={`/pull-secret?project=${project}`} class="nm-link"><h6>Pull Secrets</h6></a>
	</div>
	<div class="nm-breadcrumb-item">
		<h6>{pullSecret.name}</h6>
	</div>
</div>

<br>
<div class="nm-panel is-level-300 _dp-g _g-6">
	<div class="lo-12 _g-5">
		<h3><strong>Pull secret "{pullSecret.name}"</strong></h3>
	</div>

	<hr>

	<div class="content _dp-g _g-6 _w-100pct">
		<div class="nm-field">
			<label for="input-name">Name</label>
			<div class="nm-input">
				<input id="input-name" value={pullSecret.name} readonly disabled>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-location">Location</label>
			<div class="nm-input">
				<input id="input-location" value={pullSecret.location} readonly disabled>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-server">Server</label>
			<div class="nm-input -has-icon-right">
				<input id="input-server" value={pullSecret.spec.server} readonly disabled>
				<span class="icon -is-right copy"
					data-clipboard-text={pullSecret.spec.server}>
					<i class="fa-light fa-copy"></i>
				</span>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-username">Username</label>
			<div class="nm-input -has-icon-right">
				<input id="input-username" value={pullSecret.spec.username} readonly disabled>
				<span class="icon -is-right copy"
					data-clipboard-text={pullSecret.spec.username}>
					<i class="fa-light fa-copy"></i>
				</span>
			</div>
		</div>
		<div class="nm-field">
			<label for="input-password">Password</label>
			<div class="nm-input -has-icon-right">
				<input id="input-password" type="password" value={pullSecret.spec.password} readonly disabled>
				<span class="icon -is-right copy"
					data-clipboard-text={pullSecret.spec.password}>
					<i class="fa-light fa-copy"></i>
				</span>
			</div>
		</div>

		<hr>

		<div class="_dp-f _g-6">
			<button class="nm-button" type="button" onclick={deleteItem}>Delete</button>
		</div>
	</div>
</div>
