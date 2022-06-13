<script context="module">
	import api from '$lib/api'

	export async function load ({ url, stuff, fetch }) {
		const { project } = stuff
		const location = url.searchParams.get('location')
		const name = url.searchParams.get('name')
		const pullSecret = await api.invoke('pullSecret.get', { project, location, name }, fetch)
		if (!pullSecret.ok) {
			if (pullSecret.error.notFound) {
				return {
					status: 302,
					redirect: `/pull-secret?project=${project}`
				}
			}
			return {
				status: 500,
				error: `pullSecret: ${pullSecret.error.message}`
			}
		}
		return {
			props: {
				location,
				name,
				pullSecret: pullSecret.result
			}
		}
	}
</script>

<script>
	import ClipboardJS from 'clipboard'
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import modal from '$lib/modal'

	export let location
	export let name
	export let pullSecret

	$: project = $page.stuff.project

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

<div>
	<ul class="moon-breadcrumb">
		<li>
			<a href={`/pull-secret`} class="moon-link"><h6>Pull Secrets</h6></a>
		</li>
		<li>
			<h6>{pullSecret.name}</h6>
		</li>
	</ul>
</div>
<br>
<div class="moon-panel _dp-g _gg-16px">
	<div class="lo-12 _gg-12px">
		<div class="_dp-g _gg-16px _gatf-r _gatf-cl-lg _jtfct-spbtw">
			<h3><strong>Pull secret "{pullSecret.name}"</strong></h3>
			<div class="_dp-f">
				<button class="moon-button -small -negative -tertiary" type="button" on:click={deleteItem}>Delete</button>
			</div>
		</div>
	</div>

	<hr>

	<div class="_dp-g _gg-16px _w-100pct _mxw-512px">
		<div class="moon-field">
			<label for="input-name">Name</label>
			<div class="moon-input">
				<input id="input-name" type="text" value={pullSecret.name} readonly disabled>
			</div>
		</div>
		<div class="moon-field">
			<label for="input-location">Location</label>
			<div class="moon-input">
				<input id="input-location" type="text" value={pullSecret.location} readonly disabled>
			</div>
		</div>
		<div class="moon-field">
			<label for="input-server">Server</label>
			<div class="moon-input -has-icon-right">
				<input id="input-server" type="text" value={pullSecret.spec.server} readonly disabled>
				<span class="_cl-text-mute _cl-white-hover _cs-pt _ussl-n _mgl-12px _fs-600 icon -is-right copy"
					data-clipboard-text={pullSecret.spec.server}>
					<i class="fal fa-copy"></i>
				</span>
			</div>
		</div>
		<div class="moon-field">
			<label for="input-username">Username</label>
			<div class="moon-input -has-icon-right">
				<input id="input-username" type="text" value={pullSecret.spec.username} readonly disabled>
				<span class="_cl-text-mute _cl-white-hover _cs-pt _ussl-n _mgl-12px _fs-600 icon -is-right copy"
					data-clipboard-text={pullSecret.spec.username}>
					<i class="fal fa-copy"></i>
				</span>
			</div>
		</div>
		<div class="moon-field">
			<label for="input-password">Password</label>
			<div class="moon-input -has-icon-right">
				<input id="input-password" type="password" value={pullSecret.spec.password} readonly disabled>
				<div class="icon -is-right">
					<span class="_cl-text-mute _cl-white-hover _cs-pt _ussl-n _fs-600 copy"
						data-clipboard-text={pullSecret.spec.password}>
						<i class="fal fa-copy"></i>
					</span>
				</div>
			</div>
		</div>
	</div>
</div>
