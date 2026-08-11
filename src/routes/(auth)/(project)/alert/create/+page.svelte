<script lang="ts">
	import { onMount, untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import type { PageData } from './$types'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import { ALERT_METRICS, ALERT_OPS, alertMetricLabel } from '$lib/alert'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const locations = $derived(data.locations)
	const alert = $derived(data.alert)
	const isEdit = $derived(!!data.alert)
	const hasChannels = $derived(data.hasChannels)

	const metricOptions = ALERT_METRICS.map((m) => ({ value: m.value, label: m.label }))
	const opOptions = ALERT_OPS

	const form = $state(untrack(() => ({
		name: alert?.name ?? '',
		location: alert?.target.location ?? '',
		deployment: alert?.target.deployment ?? '',
		metric: alert?.condition.metric ?? 'cpu',
		op: alert?.condition.op ?? '>=',
		threshold: alert?.condition.threshold ?? 90,
		forMinutes: alert?.condition.forMinutes ?? 10,
		renotify: (alert?.renotifyMinutes ?? 0) > 0,
		renotifyMinutes: alert?.renotifyMinutes && alert.renotifyMinutes > 0 ? alert.renotifyMinutes : 60,
		disabled: alert?.disabled ?? false
	})))

	const metricUnit = $derived(
		form.metric === 'cpu' || form.metric === 'memory'
			? '%'
			: form.metric === 'egress' ? 'bytes/min' : 'req/min'
	)

	let deployments = $state<{ name: string, paused: boolean }[]>([])

	// The paired deployment picker: location narrows the deployment list, mirroring
	// the route create form. Paused deployments stay selectable (a rule can be
	// wired up ahead of a resume) but are flagged.
	//
	// On edit, the configured deployment may no longer exist (deleted/renamed) —
	// keep it selectable and flagged rather than silently clearing the field, so
	// saving the form without touching this field doesn't accidentally repoint the
	// rule. Matches the "nodata" story in the SPEC: a missing target is a valid
	// (if unhealthy) state, not an error.
	const deploymentOptions = $derived([
		...(form.deployment && !deployments.some((d) => d.name === form.deployment)
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

		const resp = await api.invoke<Api.List<Api.DeploymentListItem>>('deployment.list', { project }, fetch)
		if (!resp.ok) {
			modal.error({ error: resp.error })
			return
		}
		const list = resp.result?.items ?? []
		deployments = list
			.filter((x) => x.location === form.location)
			.filter((x) => x.ttl === 0)
			.map((x) => ({ name: x.name, paused: x.action === 'pause' }))
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
			const fn = isEdit ? 'alert.update' : 'alert.create'
			const args = {
				project,
				name: form.name,
				target: {
					location: form.location,
					deployment: form.deployment
				},
				condition: {
					metric: form.metric,
					op: form.op,
					threshold: Number(form.threshold),
					forMinutes: Number(form.forMinutes)
				},
				renotifyMinutes: form.renotify ? Number(form.renotifyMinutes) : 0,
				disabled: form.disabled
			}

			const resp = await api.invoke(fn, args, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			await goto(`/alert/detail?project=${project}&name=${encodeURIComponent(form.name)}`)
		} finally {
			saving = false
		}
	}

	function cancel () {
		goto(`/alert?project=${project}`)
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/alert?project=${project}`} class="link"><h6>Alerts</h6></a>
	</div>
	{#if isEdit && alert}
		<div class="breadcrumb-item">
			<a href={`/alert/detail?project=${project}&name=${encodeURIComponent(alert.name)}`} class="link"><h6>{alert.name}</h6></a>
		</div>
		<div class="breadcrumb-item"><h6>Edit</h6></div>
	{:else}
		<div class="breadcrumb-item"><h6>Create</h6></div>
	{/if}
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>{isEdit ? 'Edit alert rule' : 'Create alert rule'}</strong></h4>
		<p class="page-sub">Notify when a deployment metric crosses a threshold for a sustained period.</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-4">
	<form class="grid gap-4 w-full" onsubmit={save}>
		<div class="field">
			<label for="input-name">Name</label>
			<div class="input">
				<input id="input-name" placeholder="web-cpu-high" bind:value={form.name} required readonly={isEdit}>
			</div>
		</div>

		<br>
		<hr>
		<br>

		<h6><strong>Target</strong></h6>

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

		<br>
		<hr>
		<br>

		<h6><strong>Condition</strong></h6>

		<div class="field">
			<label for="input-metric">Metric</label>
			<Select id="input-metric" bind:value={form.metric} options={metricOptions} />
		</div>

		<div class="grid gap-4 sm:grid-cols-3">
			<div class="field">
				<label for="input-op">Comparison</label>
				<Select id="input-op" bind:value={form.op} options={opOptions} />
			</div>
			<div class="field">
				<label for="input-threshold">Threshold ({metricUnit})</label>
				<div class="input">
					<input id="input-threshold" type="number" min="0" step="any" bind:value={form.threshold} required>
				</div>
			</div>
			<div class="field">
				<label for="input-for-minutes">For (minutes)</label>
				<div class="input">
					<input id="input-for-minutes" type="number" min="1" max="60" bind:value={form.forMinutes} required>
				</div>
			</div>
		</div>
		<p class="text-content/50 text-sm">
			Fires when <strong>{alertMetricLabel(form.metric)}</strong> stays {form.op} the threshold for the full window — a single missed minute of data doesn't reset the clock.
		</p>

		<br>
		<hr>
		<br>

		<h6><strong>Notification</strong></h6>

		<label class="checkbox">
			<input type="checkbox" bind:checked={form.renotify}>
			Notify again while still firing
		</label>

		{#if form.renotify}
			<div class="field sm:w-64">
				<label for="input-renotify-minutes">Every (minutes)</label>
				<div class="input">
					<input id="input-renotify-minutes" type="number" min="10" max="1440" bind:value={form.renotifyMinutes} required>
				</div>
			</div>
		{/if}

		<p class="text-content/60 text-sm">
			<i class="fa-solid fa-circle-info"></i>
			Delivery uses your project's <a class="link" href={`/notification?project=${project}`}>notification channels</a>.
			{#if !hasChannels}
				<br>
				<span class="text-warning">
					<i class="fa-solid fa-triangle-exclamation"></i>
					No notification channels exist yet — this rule will evaluate but reach nobody until you add one.
				</span>
			{/if}
		</p>

		<br>
		<hr>
		<br>

		<label class="checkbox">
			<input type="checkbox" bind:checked={form.disabled}>
			Disabled (do not evaluate until re-enabled)
		</label>

		<hr>

		<div class="flex gap-3">
			<GuardedButton permission={isEdit ? 'alert.update' : 'alert.create'} type="submit" loading={saving}>
				{isEdit ? 'Save' : 'Create'}
			</GuardedButton>
			<button type="button" class="button is-variant-secondary" onclick={cancel}>Cancel</button>
		</div>
	</form>
</div>
