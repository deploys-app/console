<script lang="ts">
	import { goto } from '$app/navigation'
	import type { PageData } from './$types'
	import * as format from '$lib/format'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import DangerZone from '$lib/components/DangerZone.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import { getPermissionContext } from '$lib/permission'
	import { registerPageActions, type PageAction } from '$lib/pageactions/store.svelte'
	import { alertConditionString, alertValueString } from '$lib/alert'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const alert = $derived(data.alert)
	const events = $derived(data.events)

	const { can } = getPermissionContext()
	$effect(() => {
		const actions: PageAction[] = []
		if (can('alert.update')) {
			actions.push({ id: 'alert-detail:edit', label: 'Edit', icon: 'fa-pen', keywords: 'edit modify update alert rule', href: `/alert/create?project=${project}&name=${encodeURIComponent(alert.name)}` })
		}
		if (!actions.length) return
		return registerPageActions(actions)
	})

	function deleteItem () {
		modal.confirm({
			title: `Delete "${alert.name}"?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('alert.delete', { project, name: alert.name }, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await goto(`/alert?project=${project}`)
			}
		})
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/alert?project=${project}`} class="link"><h6>Alerts</h6></a>
	</div>
	<div class="breadcrumb-item min-w-0">
		<h6 class="min-w-0 wrap-anywhere">{alert.name}</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div class="min-w-0">
		<h4 class="min-w-0 wrap-anywhere"><strong>{alert.name}</strong></h4>
		<p class="page-sub">
			{#if alert.disabled}
				<span class="text-content/60"><i class="fa-solid fa-ban"></i> Disabled</span>
			{:else}
				<span class="status-badge" data-status={alert.status}>{alert.status}</span>
			{/if}
		</p>
	</div>
	<div class="flex gap-3 flex-wrap">
		<GuardedButton permission="alert.update" class="button is-variant-secondary is-icon-left"
			href={`/alert/create?project=${project}&name=${encodeURIComponent(alert.name)}`}>
			<i class="fa-solid fa-pen"></i>
			Edit
		</GuardedButton>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	<div class="grid gap-4 w-full">
		<div class="field">
			<span class="label">Target</span>
			<p>
				{#if alert.target.kind === 'custom'}
					<a class="link font-mono text-sm" href={`/metrics-sources/detail?project=${project}&name=${encodeURIComponent(alert.target.source ?? '')}`}>
						{alert.target.source} / {alert.target.series}
					</a>
				{:else}
					<a class="link font-mono text-sm" href={`/deployment/metrics?project=${project}&location=${alert.target.location}&name=${alert.target.deployment}`}>
						{alert.target.location} / {alert.target.deployment}
					</a>
				{/if}
			</p>
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<div class="field">
				<label for="d-condition">Condition</label>
				<div class="input"><input id="d-condition" class="font-mono" value={alertConditionString(alert.condition)} readonly disabled></div>
			</div>
			<div class="field">
				<label for="d-renotify">Re-notify while firing</label>
				<div class="input">
					<input id="d-renotify" value={alert.renotifyMinutes > 0 ? `Every ${alert.renotifyMinutes} minutes` : 'Only on trigger/resolve'} readonly disabled>
				</div>
			</div>
		</div>

		<hr>

		<div>
			<h6><strong>Evaluator state</strong></h6>
			<p class="text-content/50 text-sm mt-1">Set by the alert-tick cron on every evaluation.</p>
		</div>

		<div class="grid gap-4 sm:grid-cols-3">
			<div class="field">
				<label for="d-last-value">Last value</label>
				<div class="input"><input id="d-last-value" class="tabular-nums" value={alertValueString(alert.condition.metric, alert.lastValue)} readonly disabled></div>
			</div>
			<div class="field">
				<label for="d-firing-since">Firing since</label>
				<div class="input">
					<input id="d-firing-since" value={alert.firingSince ? format.datetime(alert.firingSince) : '—'} readonly disabled title={alert.firingSince ? format.fromNow(alert.firingSince) : ''}>
				</div>
			</div>
			<div class="field">
				<label for="d-last-evaluated">Last evaluated</label>
				<div class="input">
					<input id="d-last-evaluated" value={alert.lastEvaluatedAt ? format.fromNow(alert.lastEvaluatedAt) : 'Never'} readonly disabled title={alert.lastEvaluatedAt ? format.datetime(alert.lastEvaluatedAt) : ''}>
				</div>
			</div>
		</div>

		<hr>

		<div>
			<h6><strong>Transition history</strong></h6>
			<p class="text-content/50 text-sm mt-1">The most recent state changes for this rule.</p>
		</div>

		<div class="table-container">
			<table class="table is-variant-compact">
				<thead>
					<tr>
						<th>Time</th>
						<th>Transition</th>
						<th>Value</th>
					</tr>
				</thead>
				<tbody>
					<!-- AlertEvent carries no id (see api/alert.go) and two transitions can
					     legitimately land in the same second, so key by index rather than
					     `at` — the list is always a wholesale reload, never incrementally
					     patched, so index-keying is safe here. -->
					{#each events as ev, i (i)}
						<tr>
							<td><span title={format.datetime(ev.at)}>{format.fromNow(ev.at)}</span></td>
							<td>
								{#if ev.transition === 'trigger'}
									<span class="inline-flex items-center gap-2 text-negative/80"><i class="fa-solid fa-triangle-exclamation"></i> Trigger</span>
								{:else if ev.transition === 'resolve'}
									<span class="inline-flex items-center gap-2 text-positive/80"><i class="fa-solid fa-circle-check"></i> Resolve</span>
								{:else}
									<span class="inline-flex items-center gap-2 text-content/60"><i class="fa-solid fa-rotate"></i> Renotify</span>
								{/if}
							</td>
							<td class="tabular-nums">{alertValueString(alert.condition.metric, ev.value)}</td>
						</tr>
					{:else}
						<tr><td colspan="3" class="text-center text-content/50">No transitions yet.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>

		<DangerZone description="Permanently delete this alert rule.">
			<GuardedButton permission="alert.delete" class="button is-variant-negative" type="button" onclick={deleteItem}>Delete</GuardedButton>
		</DangerZone>
	</div>
</div>

<style>
	.status-badge {
		display: inline-flex;
		padding: 0.0625rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
		color: hsl(var(--hsl-content) / 0.75);
		background-color: hsl(var(--hsl-content) / 0.08);
	}

	.status-badge[data-status='ok'] {
		color: hsl(var(--hsl-positive));
		background-color: hsl(var(--hsl-positive) / 0.12);
	}

	.status-badge[data-status='firing'] {
		color: hsl(var(--hsl-negative));
		background-color: hsl(var(--hsl-negative) / 0.12);
	}

	.status-badge[data-status='nodata'] {
		color: hsl(var(--hsl-content) / 0.55);
		background-color: hsl(var(--hsl-content) / 0.08);
	}
</style>
