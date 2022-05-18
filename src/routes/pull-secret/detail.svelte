<script context="module">
	import api from '$lib/api'

	export async function load ({ url, stuff, fetch }) {
		const { project } = stuff
		const location = url.searchParams.get('location')
		const name = url.searchParams.get('name')
		const pullSecret = await api.invoke('pullsecret.get', { project, location, name }, fetch)
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
	import { onDestroy, onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'

	export let location
	export let name
	export let pullSecret

	$: project = $page.stuff.project


	let showPassword
	let copyPassword
	let copyPasswordClipboard

	onMount(() => {
		copyPasswordClipboard = new ClipboardJS(copyPassword)
	})

	onDestroy(() => {
		copyPasswordClipboard?.destroy()
	})

	function deleteItem () {
		window.dispatchEvent(new CustomEvent('confirm', {
			detail: {
				title: `Delete "${pullSecret.name}" ?`,
				callback: async () => {
					const result = await api.invoke('pullsecret.delete', { project, location, name }, fetch)
					if (!result.ok) {
						window.dispatchEvent(new CustomEvent('error', {
							detail: {
								error: result.error
							}
						}))
						return
					}
					await goto(`/pull-secret?project=${project}`)
				}
			}
		}))
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
<!--				<form method="POST" action="{{route "pullsecret.delete"}}"-->
<!--					data-confirm="Delete {pullSecret.name} ?" data-confirm-yes="Delete" data-confirm-danger>-->
<!--					<input name="name" type="hidden" value="{{.Secret.Name}}">-->
<!--				<input name="location" type="hidden" value="{{.Secret.Location}}">-->
<!--				<input name="project" type="hidden" value="{{.Page.Project}}">-->
<!--				<button class="moon-button -small -negative -tertiary">Delete</button>-->
<!--				</form>-->
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
			<label for="input-value">Value</label>
			<div class="_dp-f _alit-ct _fw-w">
				<div class="moon-input moon-input-icon-wrap _dp-ilf _alit-ct _f-1">
					<input id="input-value"
						class="_mgr-16px"
						type={showPassword ? 'text' : 'password'}
						value={pullSecret.value}
						readonly>
					<div class="moon-input-icon _cs-pt">
						<i on:click={() => showPassword = !showPassword}
							class={showPassword ? 'fas fa-eye-slash hide' : 'fas fa-eye show'}></i>
					</div>
				</div>
				<span bind:this={copyPassword} class="_cl-primary-500 _cl-primary-400-hover _cs-pt _ussl-n"
					data-clipboard-text="{pullSecret.value}">Copy</span>
			</div>
		</div>
	</div>
</div>
