<script context="module">
	import api from '$lib/api'

	export async function load ({ url, fetch }) {
		const project = url.searchParams.get('project')

		let projectInfo
		if (project) {
			projectInfo = await api.invoke('project.get', { project }, fetch)
			if (!projectInfo.ok) {
				if (projectInfo.error.notFound) {
					return {
						status: 302,
						redirect: '/project'
					}
				}
				return {
					status: 500,
					error: `project: ${projectInfo.error.message}`
				}
			}
		}

		const billingAccounts = await api.invoke('billing.list', {}, fetch)
		if (!billingAccounts.ok) {
			return {
				status: 500,
				error: `billingAccounts: ${billingAccounts.error.message}`
			}
		}

		return {
			props: {
				project: projectInfo?.result,
				billingAccounts: billingAccounts.result.billings || []
			}
		}
	}
</script>

<script>
	import { goto, invalidate } from '$app/navigation'

	export let project
	export let billingAccounts

	let form = {
		sid: project?.project || '',
		name: project?.name || '',
		billingAccount: project?.billingAccount || ''
	}

	let saving
	async function save () {
		if (saving) {
			return
		}

		saving = true
		try {
			const resp = project
				? await api.invoke('project.update', {
					project: form.sid,
					name: form.name,
					billingAccount: form.billingAccount
				}, fetch)
				: await api.invoke('project.create', {
					sid: form.sid,
					name: form.name,
					billingAccount: form.billingAccount
				}, fetch)
			if (!resp.ok) {
				window.dispatchEvent(new CustomEvent('error', {
					detail: {
						error: resp.error
					}
				}))
				return
			}
			await invalidate('projects')
			await goto(`/?project=${form.sid}`)
		} finally {
			saving = false
		}
	}
</script>

<div>
	<ul class="moon-breadcrumb">
		<li>
			<a href="/project" class="moon-link"><h6>Projects</h6></a>
		</li>
		{#if project}
			<li>
				<a href={`/?project=${project.project}`} class="moon-link"><h6>{project.name}</h6></a>
			</li>
		{/if}
		<li>
			<h6>{#if project}Update{:else}Create{/if}</h6>
		</li>
	</ul>
</div>
<br>
<div class="moon-panel _dp-g _gg-24px">
	<div class="lo-12 _jtfit-st _gg-12px">
		{#if project}
			<h5><strong>Update Project: {project.name}</strong></h5>
		{:else}
			<h5><strong>Create Project</strong></h5>
		{/if}
	</div>

	<hr>

	<form class="_dp-g _gg-16px _w-100pct _mxw-512px" on:submit|preventDefault={save}>
		<div class="moon-field">
			<label for="input-project">ID</label>
			<div class="moon-input">
				<input id="input-project" placeholder="Project ID" bind:value={form.sid} readonly={!!project}>
			</div>
		</div>

		<div class="moon-field">
			<label for="input-name">Name</label>
			<div class="moon-input">
				<input id="input-name" placeholder="Project name" bind:value={form.name} required>
			</div>
		</div>

		<div class="moon-field _mgbt-20px">
			<label for="input-billing_account">Billing Account</label>
			<div class="moon-select">
				<select id="input-billing_account" bind:value={form.billingAccount} required>
					<option value="" selected disabled>Select Billing Account</option>
					{#each billingAccounts as it}
						<option value={it.id}>{it.name} ({it.id})</option>
					{/each}
				</select>
			</div>
		</div>

		<button class="moon-button _mgt-16px _mgr-at" class:-loading={saving}>
			{#if project}
				Update Project
			{:else}
				Create Project
			{/if}
		</button>
	</form>
</div>
