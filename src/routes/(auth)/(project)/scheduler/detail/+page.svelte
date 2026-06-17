<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation'
	import type { PageData } from './$types'
	import * as format from '$lib/format'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import DangerZone from '$lib/components/DangerZone.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import StatusIcon from '$lib/components/StatusIcon.svelte'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const job = $derived(data.job)
	const invocations = $derived(data.invocations)
	const headerEntries = $derived(Object.entries(job.headers ?? {}))

	let busy = $state(false)

	async function setPaused (paused: boolean) {
		if (busy) return
		busy = true
		try {
			const fn = paused ? 'scheduler.pause' : 'scheduler.resume'
			const resp = await api.invoke(fn, { project, name: job.name }, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			await invalidateAll()
		} finally {
			busy = false
		}
	}

	async function trigger () {
		if (busy) return
		busy = true
		try {
			const resp = await api.invoke<Api.SchedulerInvocation>('scheduler.trigger', { project, name: job.name }, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			const inv = resp.result
			if (inv?.result === 'success') {
				modal.success({ content: `Ran "${job.name}" — HTTP ${inv.httpStatus} in ${inv.latencyMs} ms` })
			} else {
				modal.error({ error: `Run failed: ${inv?.error || `HTTP ${inv?.httpStatus ?? ''}`}` })
			}
			await invalidateAll()
		} finally {
			busy = false
		}
	}

	function deleteItem () {
		modal.confirm({
			title: `Delete "${job.name}"?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('scheduler.delete', { project, name: job.name }, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await goto(`/scheduler?project=${project}`)
			}
		})
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/scheduler?project=${project}`} class="link"><h6>Scheduler</h6></a>
	</div>
	<div class="breadcrumb-item min-w-0">
		<h6 class="min-w-0 wrap-anywhere">{job.name}</h6>
	</div>
</div>

<br>

<div class="page-head">
	<div class="min-w-0">
		<h4 class="min-w-0 wrap-anywhere"><strong>{job.name}</strong></h4>
		<p class="page-sub">
			{#if job.paused}
				<span class="text-content/60"><i class="fa-solid fa-pause"></i> Paused</span>
			{:else}
				<span class="font-mono">{job.schedule}</span>
				{#if job.nextRunAt}· next run {format.fromNow(job.nextRunAt)}{/if}
			{/if}
		</p>
	</div>
	<div class="flex gap-3 flex-wrap">
		<GuardedButton permission="scheduler.run" class="button is-variant-secondary is-icon-left" type="button"
			loading={busy} onclick={trigger}>
			<i class="fa-solid fa-play"></i>
			Run now
		</GuardedButton>
		{#if job.paused}
			<GuardedButton permission="scheduler.update" class="button is-variant-secondary is-icon-left" type="button"
				loading={busy} onclick={() => setPaused(false)}>
				<i class="fa-solid fa-play"></i>
				Resume
			</GuardedButton>
		{:else}
			<GuardedButton permission="scheduler.update" class="button is-variant-secondary is-icon-left" type="button"
				loading={busy} onclick={() => setPaused(true)}>
				<i class="fa-solid fa-pause"></i>
				Pause
			</GuardedButton>
		{/if}
		<GuardedButton permission="scheduler.update" class="button is-variant-secondary is-icon-left"
			href={`/scheduler/create?project=${project}&name=${encodeURIComponent(job.name)}`}>
			<i class="fa-solid fa-pen"></i>
			Edit
		</GuardedButton>
	</div>
</div>

<div class="panel is-level-300 grid gap-6">
	<div class="grid gap-4 w-full">
		<div class="grid gap-4 sm:grid-cols-2">
			<div class="field">
				<label for="d-schedule">Schedule</label>
				<div class="input"><input id="d-schedule" value={job.schedule} readonly disabled></div>
			</div>
			<div class="field">
				<label for="d-timezone">Timezone</label>
				<div class="input"><input id="d-timezone" value={job.timezone} readonly disabled></div>
			</div>
		</div>

		<div class="field">
			<label for="d-url">Request</label>
			<div class="input"><input id="d-url" value={`${job.method} ${job.url}`} readonly disabled></div>
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<div class="field">
				<label for="d-auth">Authentication</label>
				<div class="input">
					<input id="d-auth" value={!job.auth || job.auth.type === '' || job.auth.type === 'none' ? 'None' : (job.auth.type === 'basic' ? `Basic (${job.auth.username})` : 'Bearer token')} readonly disabled>
				</div>
			</div>
			<div class="field">
				<label for="d-tls">TLS verification</label>
				<div class="input"><input id="d-tls" value={job.insecureSkipVerify ? 'Disabled (insecure)' : 'Enabled'} readonly disabled></div>
			</div>
		</div>

		{#if headerEntries.length}
			<div class="field">
				<span class="label">Headers</span>
				<div class="table-container">
					<table class="table is-variant-compact">
						<thead><tr><th class="is-collapse" style="min-width: 256px">Key</th><th>Value</th></tr></thead>
						<tbody>
							{#each headerEntries as [k, v] (k)}
								<tr><td class="font-mono">{k}</td><td class="font-mono wrap-anywhere">{v}</td></tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		<hr>

		<div>
			<h6><strong>Invocation log</strong></h6>
			<p class="text-content/50 text-sm mt-1">The most recent runs of this job.</p>
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
					{#each invocations as inv (inv.id)}
						<tr>
							<td><span title={format.datetime(inv.startedAt)}>{format.fromNow(inv.startedAt)}</span></td>
							<td>
								{#if inv.result === 'success'}
									<span class="inline-flex items-center text-positive/80"><StatusIcon status="success" />Success</span>
								{:else}
									<span class="inline-flex items-center text-negative/80"><StatusIcon status="error" />Failed</span>
								{/if}
							</td>
							<td>{inv.httpStatus > 0 ? inv.httpStatus : '—'}</td>
							<td class="tabular-nums">{inv.latencyMs} ms</td>
							<td class="wrap-anywhere text-content/70">{inv.error || ''}</td>
						</tr>
					{:else}
						<tr><td colspan="5" class="text-center text-content/50">No runs yet. Use “Run now” to trigger one.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>

		<DangerZone description="Permanently delete this scheduled job and its invocation history.">
			<GuardedButton permission="scheduler.delete" class="button is-variant-negative" type="button" onclick={deleteItem}>Delete</GuardedButton>
		</DangerZone>
	</div>
</div>
