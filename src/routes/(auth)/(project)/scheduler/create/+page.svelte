<script lang="ts">
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import type { PageData } from './$types'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import EnvVarEditor from '$lib/components/EnvVarEditor.svelte'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const job = $derived(data.job)
	const isEdit = $derived(!!data.job)

	const methodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
		.map((m) => ({ value: m, label: m }))

	const authTypeOptions = [
		{ value: 'none', label: 'None' },
		{ value: 'basic', label: 'Basic auth' },
		{ value: 'bearer', label: 'Bearer token' }
	]

	// IANA timezones for the searchable Timezone dropdown. Intl.supportedValuesOf
	// is the canonical list (Node 18+ / modern browsers); UTC is pinned first and
	// the editable Select still accepts any typed value (the server validates).
	const timezoneOptions = (() => {
		let zones: string[]
		try {
			zones = Intl.supportedValuesOf('timeZone')
		} catch {
			zones = []
		}
		return ['UTC', ...zones.filter((z) => z !== 'UTC')].map((z) => ({ value: z, label: z }))
	})()

	const form = $state(untrack(() => ({
		name: job?.name ?? '',
		schedule: job?.schedule ?? '',
		timezone: job?.timezone ?? '',
		method: job?.method ?? 'GET',
		url: job?.url ?? '',
		headers: Object.entries(job?.headers ?? {}).map(([k, v]) => ({ k, v })),
		body: job?.body ?? '',
		authType: job?.auth?.type === 'basic' || job?.auth?.type === 'bearer' ? job.auth.type : 'none',
		authUsername: job?.auth?.username ?? '',
		// Secret is write-only: never prefilled. On edit, leaving it blank keeps
		// the stored one.
		authSecret: '',
		insecureSkipVerify: job?.insecureSkipVerify ?? false,
		paused: job?.paused ?? false
	})))

	// The stored auth type (basic/bearer carry a write-only secret). A secret is
	// required when creating, or when editing changes the auth type — switching
	// type needs a fresh secret since the stored one belonged to the old type.
	const originalAuthType = $derived(
		job?.auth?.type === 'basic' || job?.auth?.type === 'bearer' ? job.auth.type : 'none'
	)
	const secretRequired = $derived(
		(form.authType === 'basic' || form.authType === 'bearer') &&
		(!isEdit || form.authType !== originalAuthType)
	)

	let saving = $state(false)

	async function save (e: SubmitEvent) {
		e.preventDefault()
		if (saving) return

		const headers = form.headers.reduce<Record<string, string>>((p, x) => {
			if (x.k) p[x.k] = x.v
			return p
		}, {})

		const auth: Api.SchedulerAuth = { type: form.authType as Api.SchedulerAuth['type'] }
		if (form.authType === 'basic') auth.username = form.authUsername
		if ((form.authType === 'basic' || form.authType === 'bearer') && form.authSecret) {
			auth.secret = form.authSecret
		}

		saving = true
		try {
			const fn = isEdit ? 'scheduler.update' : 'scheduler.create'
			const args: Record<string, unknown> = {
				project,
				name: form.name,
				schedule: form.schedule,
				timezone: form.timezone,
				method: form.method,
				url: form.url,
				headers,
				body: form.body,
				auth,
				insecureSkipVerify: form.insecureSkipVerify
			}
			if (!isEdit) args.paused = form.paused

			const resp = await api.invoke(fn, args, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			await goto(`/scheduler/detail?project=${project}&name=${encodeURIComponent(form.name)}`)
		} finally {
			saving = false
		}
	}

	function cancel () {
		goto(`/scheduler?project=${project}`)
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/scheduler?project=${project}`} class="link"><h6>Scheduler</h6></a>
	</div>
	{#if isEdit && job}
		<div class="breadcrumb-item">
			<a href={`/scheduler/detail?project=${project}&name=${encodeURIComponent(job.name)}`} class="link"><h6>{job.name}</h6></a>
		</div>
		<div class="breadcrumb-item"><h6>Edit</h6></div>
	{:else}
		<div class="breadcrumb-item"><h6>Create</h6></div>
	{/if}
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>{isEdit ? 'Edit scheduled job' : 'Create scheduled job'}</strong></h4>
		<p class="page-sub">Call an HTTP endpoint on a cron schedule.</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-4">
	<form class="grid gap-4 w-full" onsubmit={save}>
		<div class="field">
			<label for="input-name">Name</label>
			<div class="input">
				<input id="input-name" placeholder="daily-health-check" bind:value={form.name} required readonly={isEdit}>
			</div>
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<div class="field">
				<label for="input-schedule">Schedule</label>
				<div class="input">
					<input id="input-schedule" class="font-mono" placeholder="*/5 * * * *" bind:value={form.schedule} required>
				</div>
				<p class="text-content/50 text-sm mt-1">5-field cron, or a macro like <code>@hourly</code> / <code>@every 30m</code>.</p>
			</div>
			<div class="field">
				<label for="input-timezone">Timezone</label>
				<Select id="input-timezone" editable bind:value={form.timezone} placeholder="UTC" options={timezoneOptions} />
				<p class="text-content/50 text-sm mt-1">IANA name (e.g. <code>Asia/Bangkok</code>). Type to search; defaults to UTC.</p>
			</div>
		</div>

		<br>
		<hr>
		<br>

		<h6><strong>Request</strong></h6>

		<div class="grid gap-4 sm:grid-cols-[10rem_1fr]">
			<div class="field">
				<label for="input-method">Method</label>
				<Select id="input-method" bind:value={form.method} options={methodOptions} />
			</div>
			<div class="field">
				<label for="input-url">URL</label>
				<div class="input">
					<input id="input-url" type="url" placeholder="https://example.com/webhook" bind:value={form.url} required>
				</div>
			</div>
		</div>

		<div class="field">
			<span class="label">Headers</span>
			<EnvVarEditor bind:entries={form.headers} />
			<p class="text-content/50 text-sm mt-1">
				A default <code>User-Agent: deploys-scheduler/1.0</code> is sent unless you set your own here.
			</p>
		</div>

		<div class="field">
			<label for="input-body">Body</label>
			<div class="textarea">
				<textarea id="input-body" class="font-mono" rows="4" placeholder={'{"key": "value"}'} bind:value={form.body}></textarea>
			</div>
		</div>

		<br>
		<hr>
		<br>

		<h6><strong>Authentication</strong></h6>

		<div class="field">
			<label for="input-auth-type">Type</label>
			<Select id="input-auth-type" bind:value={form.authType} options={authTypeOptions} />
		</div>

		{#if form.authType === 'basic'}
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="field">
					<label for="input-auth-user">Username</label>
					<div class="input">
						<input id="input-auth-user" bind:value={form.authUsername} autocomplete="off" required>
					</div>
				</div>
				<div class="field">
					<label for="input-auth-secret">Password</label>
					<div class="input">
						<input id="input-auth-secret" type="password" bind:value={form.authSecret}
							placeholder={isEdit && !secretRequired ? 'Unchanged' : ''} autocomplete="off" required={secretRequired}>
					</div>
				</div>
			</div>
		{:else if form.authType === 'bearer'}
			<div class="field">
				<label for="input-auth-secret">Token</label>
				<div class="input">
					<input id="input-auth-secret" type="password" bind:value={form.authSecret}
						placeholder={isEdit && !secretRequired ? 'Unchanged' : ''} autocomplete="off" required={secretRequired}>
				</div>
			</div>
		{/if}

		<br>
		<hr>
		<br>

		<label class="checkbox">
			<input type="checkbox" bind:checked={form.insecureSkipVerify}>
			Skip TLS verification for HTTPS targets (self-signed certificates)
		</label>

		{#if !isEdit}
			<label class="checkbox">
				<input type="checkbox" bind:checked={form.paused}>
				Create paused (do not run until resumed)
			</label>
		{/if}

		<hr>

		<div class="flex gap-3">
			<GuardedButton permission={isEdit ? 'scheduler.update' : 'scheduler.create'} type="submit" loading={saving}>
				{isEdit ? 'Save' : 'Create'}
			</GuardedButton>
			<button type="button" class="button is-variant-secondary" onclick={cancel}>Cancel</button>
		</div>
	</form>
</div>
