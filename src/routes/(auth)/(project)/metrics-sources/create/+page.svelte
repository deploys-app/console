<script lang="ts">
	import { onMount, untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import type { PageData } from './$types'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const locations = $derived(data.locations)
	const source = $derived(data.source)
	const isEdit = $derived(!!data.source)

	const form = $state(untrack(() => ({
		name: source?.name ?? '',
		location: source?.location ?? '',
		deployment: source?.deployment ?? '',
		port: source?.port ?? 9090,
		path: source?.path ?? '/metrics',
		disabled: source?.disabled ?? false
	})))

	let deployments = $state<{ name: string, paused: boolean }[]>([])
	let deploymentsLoaded = $state(false)

	const deploymentOptions = $derived([
		...(form.deployment && deploymentsLoaded && !deployments.some((d) => d.name === form.deployment)
			? [{ value: form.deployment, label: form.deployment, dot: 'negative' as const, badge: 'Not found', badgeTone: 'negative' as const }]
			: []),
		...deployments.map((d) => ({
			value: d.name,
			label: d.name,
			dot: (d.paused ? 'warning' : 'positive') as 'warning' | 'positive',
			badge: d.paused ? 'Paused' : undefined,
			badgeTone: 'warning' as const
		}))
	])

	async function fetchDeployments () {
		deployments = []
		deploymentsLoaded = false

		const resp = await api.invoke<Api.List<Api.DeploymentListItem>>('deployment.list', { project }, fetch)
		if (!resp.ok) {
			modal.error({ error: resp.error })
			deploymentsLoaded = true
			return
		}
		const list = resp.result?.items ?? []
		deployments = list
			.filter((x) => x.location === form.location)
			.filter((x) => x.ttl === 0)
			.map((x) => ({ name: x.name, paused: x.action === 'pause' }))
		deploymentsLoaded = true
	}

	function onLocationChange () {
		form.deployment = ''
		fetchDeployments()
	}

	onMount(() => {
		if (form.location) fetchDeployments()
	})

	let saving = $state(false)

	async function save (e: SubmitEvent) {
		e.preventDefault()
		if (saving) return

		saving = true
		try {
			const resp = await api.invoke('metricSource.set', {
				project,
				name: form.name,
				location: form.location,
				deployment: form.deployment,
				port: Number(form.port),
				path: form.path.trim() || '/metrics',
				disabled: form.disabled
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			await goto(`/metrics-sources/detail?project=${project}&name=${encodeURIComponent(form.name)}`)
		} finally {
			saving = false
		}
	}

	function cancel () {
		goto(`/metrics-sources?project=${project}`)
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/metrics-sources?project=${project}`} class="link"><h6>Metric sources</h6></a>
	</div>
	{#if isEdit && source}
		<div class="breadcrumb-item">
			<a href={`/metrics-sources/detail?project=${project}&name=${encodeURIComponent(source.name)}`} class="link"><h6>{source.name}</h6></a>
		</div>
		<div class="breadcrumb-item"><h6>Edit</h6></div>
	{:else}
		<div class="breadcrumb-item"><h6>Create</h6></div>
	{/if}
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>{isEdit ? 'Edit metric source' : 'Create metric source'}</strong></h4>
		<p class="page-sub">Scrape a path on one of your deployments once a minute. The platform reaches the pod in-cluster — there is no URL to set.</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-4">
	<form class="grid gap-4 w-full" onsubmit={save}>
		<div class="field">
			<label for="input-name">Name</label>
			<div class="input">
				<input id="input-name" placeholder="web" bind:value={form.name} required readonly={isEdit}>
			</div>
		</div>

		<br>
		<hr>
		<br>

		<h6><strong>Scrape target</strong></h6>

		<div class="grid gap-4 sm:grid-cols-2">
			<div class="field">
				<label for="input-location">Location</label>
				<Select
					id="input-location"
					bind:value={form.location}
					onchange={onLocationChange}
					required
					placeholder="Select Location"
					options={locations.map((it) => ({ value: it.id, label: it.id }))} />
			</div>
			{#if form.location}
				<div class="field">
					<label for="input-deployment">Deployment</label>
					<Select
						id="input-deployment"
						bind:value={form.deployment}
						required
						placeholder="Select Deployment"
						options={deploymentOptions} />
				</div>
			{/if}
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<div class="field">
				<label for="input-port">Port</label>
				<div class="input">
					<input id="input-port" type="number" min="1" max="65535" bind:value={form.port} required>
				</div>
			</div>
			<div class="field">
				<label for="input-path">Path</label>
				<div class="input">
					<input id="input-path" placeholder="/metrics" bind:value={form.path} required>
				</div>
			</div>
		</div>

		<br>
		<hr>
		<br>

		<label class="checkbox">
			<input type="checkbox" bind:checked={form.disabled}>
			Disabled (do not scrape until re-enabled)
		</label>

		<hr>

		<div class="flex gap-3">
			<GuardedButton permission="metricSource.set" type="submit" loading={saving}>
				{isEdit ? 'Save' : 'Create'}
			</GuardedButton>
			<button type="button" class="button is-variant-secondary" onclick={cancel}>Cancel</button>
		</div>
	</form>
</div>
