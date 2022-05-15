<script>
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import { project } from '$lib/stores'
	import api from '$lib/api'
	import format from '$lib/format'

	let detail
	const id = $page.url.searchParams.get('id')

	async function fetchDetail () {
		try {
			detail = await api.serviceAccount.get({ project: $project, id })
		} catch (e) {
			await goto(`/service-account?project=${$project}`, { replaceState: true })
		}
	}

	$: {
		$project
		fetchDetail()
	}

	async function deleteItem () {
		window.dispatchEvent(new CustomEvent('confirm', {
			detail: {
				title: `Delete "${detail.name}" service account`,
				callback: async () => {
					await api.serviceAccount.delete({ project: $project, id })
					await goto(`/service-account?project=${$project}`)
				}
			}
		}))
	}

	let loadingCreateKey

	async function createKey () {
		if (loadingCreateKey) {
			return
		}

		try {
			loadingCreateKey = true
			await api.serviceAccount.createKey({ project: $project, id })
			await fetchDetail()
		} catch (e) {
			window.dispatchEvent(new CustomEvent('error', {
				detail: {
					error: e
				}
			}))
		} finally {
			loadingCreateKey = false
		}
	}

	async function deleteKey (secret) {
		window.dispatchEvent(new CustomEvent('confirm', {
			detail: {
				title: 'Confirm delete key ?',
				callback: async () => {
					await api.serviceAccount.deleteKey({ project: $project, id, secret })
					await fetchDetail()
				}
			}
		}))
	}
</script>

{#if !detail}
	Loading...
{:else}
	<div>
		<ul class="moon-breadcrumb">
			<li>
				<a href={`/service-account?project=${$project}`} class="moon-link"><h6>Service Accounts</h6></a>
			</li>
			<li>
				<h6>{detail.name}</h6>
			</li>
		</ul>
	</div>
	<br>

	<div class="moon-panel _dp-g _gg-24px">
		<div class="lo-12 _gg-12px">
			<div class="_dp-g _gg-16px _gatf-r _gatf-cl-lg _jtfct-spbtw">
				<h3 class="_mgr-24px _mgbt-16px _mgbt-0px-lg"><strong>{detail.name}</strong>
				</h3>
				<div class="_dp-f">
					<button class="moon-button -small -negative -tertiary" type="button" on:click={deleteItem}>
						Delete service account
					</button>
				</div>
			</div>
		</div>

		<hr>

		<div class="_dp-g _gg-16px _w-100pct _mxw-512px _mgbt-20px">
			<div class="moon-field">
				<label for="input-email">Email</label>
				<div class="moon-input">
					<input type="text" id="input-email" value={detail.email} readonly>
				</div>
			</div>
			<div class="moon-field">
				<label for="input-name">Name</label>
				<div class="moon-input">
					<input type="text" id="input-name" value={detail.name} readonly>
				</div>
			</div>
			<div class="moon-field">
				<label for="input-description">Description</label>
				<div class="moon-textarea">
					<textarea id="input-description" rows="5" readonly>{detail.description}</textarea>
				</div>
			</div>
			<div class="moon-field">
				<label for="input-created-at">Created At</label>
				<div class="moon-input">
					<input type="text" id="input-created-at" value="{format.datetime(detail.createdAt)}" readonly>
				</div>
			</div>
			<div class="moon-field">
				<label for="input-created-by">Created By</label>
				<div class="moon-input">
					<input type="text" id="input-created-by" value="{detail.createdBy}" readonly>
				</div>
			</div>
		</div>

		<hr class="_w-100pct _mxw-512px">

		<h6><strong>Keys</strong></h6>
		<div class="_dp-g _gg-16px _w-100pct _mxw-512px">
			{#each (detail.keys || []) as key}
				<div class="moon-input -has-icon-right">
					<input type="text" value="{key.secret}" readonly>
					<div class="icon -is-right _cs-pt">
						<button class="_bgcl-tpr _cs-pt _bdw-0px _cl-light-primary" style="outline: none;" on:click={() => deleteKey(key.secret)} type="button">
							<i class="fas fa-trash-alt"></i>
						</button>
					</div>
				</div>
			{/each}
			<div class="_dp-g _gg-16px _w-100pct _mxw-512px">
				<button class="moon-button -small icon-button _mgh-at" class:loading={loadingCreateKey} on:click={createKey} disabled={loadingCreateKey} type="button">
					<i class="fas fa-plus _mgr-12px"></i>
					Create key
				</button>
			</div>
		</div>
	</div>
{/if}
<br>
<br>
