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

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const channel = $derived(data.channel)
	const deliveries = $derived(data.deliveries)

	const sub = $derived(channel.subscription)
	const noFilter = $derived(!sub.events.length && !sub.outcomes.length)

	let busy = $state(false)
	let testResult = $state<Api.NotificationDelivery | null>(null)

	const { can } = getPermissionContext()
	$effect(() => {
		const actions: PageAction[] = []
		if (channel.config.type !== 'pull' && can('notification.test')) {
			actions.push({ id: 'notification-detail:test', label: 'Send test', icon: 'fa-paper-plane', keywords: 'send test notification ping', run: sendTest })
		}
		if (can('notification.update')) {
			actions.push({ id: 'notification-detail:edit', label: 'Edit', icon: 'fa-pen', keywords: 'edit modify update notification channel', href: `/notification/create?project=${project}&name=${encodeURIComponent(channel.name)}` })
		}
		if (!actions.length) return
		return registerPageActions(actions)
	})

	async function sendTest () {
		if (busy) return
		busy = true
		testResult = null
		try {
			const resp = await api.invoke<Api.NotificationDelivery>('notification.test', { project, name: channel.name }, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			testResult = resp.result ?? null
		} finally {
			busy = false
		}
	}

	function deleteItem () {
		modal.confirm({
			title: `Delete "${channel.name}"?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('notification.delete', { project, name: channel.name }, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await goto(`/notification?project=${project}`)
			}
		})
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/notification?project=${project}`} class="link"><h6>Notifications</h6></a>
	</div>
	<div class="breadcrumb-item min-w-0">
		<h6 class="min-w-0 wrap-anywhere">{channel.name}</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div class="min-w-0">
		<h4 class="min-w-0 wrap-anywhere"><strong>{channel.name}</strong></h4>
		<p class="page-sub">
			<span class="type-badge" data-type={channel.config.type}>{channel.config.type}</span>
			{#if channel.disabled}
				<span class="text-content/60 ml-2"><i class="fa-solid fa-ban"></i> Disabled</span>
			{:else}
				<span class="text-positive/80 ml-2"><i class="fa-solid fa-circle text-[0.5rem]"></i> Enabled</span>
			{/if}
		</p>
	</div>
	<div class="flex gap-3 flex-wrap">
		{#if channel.config.type !== 'pull'}
			<GuardedButton permission="notification.test" class="button is-variant-secondary is-icon-left" type="button"
				loading={busy} onclick={sendTest}>
				<i class="fa-solid fa-paper-plane"></i>
				Send test
			</GuardedButton>
		{/if}
		<GuardedButton permission="notification.update" class="button is-variant-secondary is-icon-left"
			href={`/notification/create?project=${project}&name=${encodeURIComponent(channel.name)}`}>
			<i class="fa-solid fa-pen"></i>
			Edit
		</GuardedButton>
	</div>
</div>

{#if testResult}
	<div class="test-result" class:is-ok={testResult.result === 'success'} class:is-fail={testResult.result !== 'success'}>
		{#if testResult.result === 'success'}
			<i class="fa-solid fa-circle-check"></i>
			<span>Test delivered — HTTP {testResult.httpStatus}, {testResult.latencyMs} ms.</span>
		{:else}
			<i class="fa-solid fa-circle-xmark"></i>
			<span>Test failed{testResult.httpStatus > 0 ? ` — HTTP ${testResult.httpStatus}` : ''}{testResult.error ? `: ${testResult.error}` : ''}.</span>
		{/if}
	</div>
{/if}

<div class="panel is-level-300 grid gap-6">
	<div class="grid gap-4 w-full">
		<div class="grid gap-4 sm:grid-cols-[10rem_1fr]">
			<div class="field">
				<label for="d-type">Type</label>
				<div class="input"><input id="d-type" value={channel.config.type} readonly disabled></div>
			</div>
			{#if channel.config.type === 'pull'}
				<div class="field">
					<label for="d-ttl">Auto-delete when idle</label>
					<div class="input"><input id="d-ttl" value={channel.config.pullTtlSeconds ? `${channel.config.pullTtlSeconds} seconds` : 'Server default (15 min)'} readonly disabled></div>
				</div>
			{:else}
				<div class="field">
					<label for="d-url">URL</label>
					<div class="input"><input id="d-url" value={channel.config.url} readonly disabled></div>
				</div>
			{/if}
		</div>

		{#if channel.config.type === 'pull'}
			<p class="text-content/60 text-sm">
				<i class="fa-solid fa-circle-info"></i>
				This channel has no delivery endpoint — an agent reads its events on its own schedule via the API or CLI
				(<code>deploys notification pull --project {project} --name {channel.name}</code>). It auto-deletes after the idle window above.
			</p>
		{/if}

		{#if channel.config.type === 'webhook'}
			<div class="field">
				<label for="d-tls">TLS verification</label>
				<div class="input"><input id="d-tls" value={channel.config.insecureSkipVerify ? 'Disabled (insecure)' : 'Enabled'} readonly disabled></div>
			</div>
		{/if}

		<div class="field">
			<span class="label">Subscription</span>
			{#if noFilter}
				<p class="text-content/70">All changes (no filter).</p>
			{:else}
				<div class="grid gap-2">
					<div class="sub-row"><span class="sub-key">Events</span><span class="sub-val">{sub.events.length ? sub.events.join(', ') : 'Any'}</span></div>
					<div class="sub-row"><span class="sub-key">Outcomes</span><span class="sub-val">{sub.outcomes.length ? sub.outcomes.join(', ') : 'Any'}</span></div>
				</div>
			{/if}
		</div>

		{#if channel.config.type !== 'pull'}
		<hr>

		<div>
			<h6><strong>Delivery log</strong></h6>
			<p class="text-content/50 text-sm mt-1">The most recent change deliveries for this project.</p>
		</div>

		<div class="table-container">
			<table class="table is-variant-compact">
				<thead>
					<tr>
						<th>Time</th>
						<th>Result</th>
						<th>Status</th>
						<th>Latency</th>
						<th>Error</th>
					</tr>
				</thead>
				<tbody>
					{#each deliveries as d (d.id)}
						<tr>
							<td><span title={format.datetime(d.startedAt)}>{format.fromNow(d.startedAt)}</span></td>
							<td>
								{#if d.result === 'success'}
									<span class="inline-flex items-center gap-2 text-positive/80"><i class="fa-solid fa-circle-check"></i> Success</span>
								{:else if d.result === 'retry'}
									<span class="inline-flex items-center gap-2 text-warning/80"><i class="fa-solid fa-rotate"></i> Retry</span>
								{:else if d.result === 'pending'}
									<span class="inline-flex items-center gap-2 text-content/60"><i class="fa-solid fa-clock"></i> Pending</span>
								{:else}
									<span class="inline-flex items-center gap-2 text-negative/80"><i class="fa-solid fa-circle-xmark"></i> Failed</span>
								{/if}
							</td>
							<td>{d.httpStatus > 0 ? d.httpStatus : '—'}</td>
							<td class="tabular-nums">{d.result === 'pending' ? '—' : `${d.latencyMs} ms`}</td>
							<td class="wrap-anywhere text-content/70">{d.error || ''}</td>
						</tr>
					{:else}
						<tr><td colspan="5" class="text-center text-content/50">No deliveries yet.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
		{/if}

		<DangerZone description="Permanently delete this notification channel.">
			<GuardedButton permission="notification.delete" class="button is-variant-negative" type="button" onclick={deleteItem}>Delete</GuardedButton>
		</DangerZone>
	</div>
</div>

<style>
	.type-badge {
		display: inline-flex;
		padding: 0.0625rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.75);
		background-color: hsl(var(--hsl-content) / 0.08);
	}

	.type-badge[data-type='webhook'] {
		color: hsl(var(--hsl-primary));
		background-color: hsl(var(--hsl-primary) / 0.12);
	}

	.type-badge[data-type='discord'] {
		color: hsl(var(--hsl-accent, var(--hsl-primary)));
		background-color: hsl(var(--hsl-accent, var(--hsl-primary)) / 0.12);
	}

	.type-badge[data-type='pull'] {
		color: hsl(var(--hsl-positive));
		background-color: hsl(var(--hsl-positive) / 0.12);
	}

	.test-result {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		margin: 1rem 0;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.875rem;
	}

	.test-result.is-ok {
		color: hsl(var(--hsl-positive));
		background-color: hsl(var(--hsl-positive) / 0.1);
	}

	.test-result.is-fail {
		color: hsl(var(--hsl-negative));
		background-color: hsl(var(--hsl-negative) / 0.1);
	}

	.sub-row {
		display: grid;
		grid-template-columns: 9rem 1fr;
		gap: 0.5rem;
		align-items: baseline;
	}

	.sub-key {
		color: hsl(var(--hsl-content) / 0.6);
		font-size: 0.8125rem;
	}

	.sub-val {
		font-family: var(--ffml-mono, monospace);
		font-size: 0.8125rem;
		word-break: break-word;
	}
</style>
