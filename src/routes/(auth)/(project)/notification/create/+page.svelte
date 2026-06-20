<script lang="ts">
	import { untrack } from 'svelte'
	import { goto } from '$app/navigation'
	import type { PageData } from './$types'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'
	import TagInput from '$lib/components/TagInput.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const channel = $derived(data.channel)
	const isEdit = $derived(!!data.channel)

	const typeOptions = [
		{ value: 'webhook', label: 'Webhook' },
		{ value: 'discord', label: 'Discord' },
		{ value: 'pull', label: 'Pull (agent)' }
	]

	// Known values for the subscription axes, surfaced as click-to-add suggestions
	// so the user isn't typing blind. The axes still accept any string (forward-
	// compatible with new resource types / actions), so these are hints, not a
	// closed set.
	const RESOURCE_TYPE_SUGGESTIONS = [
		'deployment', 'route', 'domain', 'disk', 'database', 'pull-secret',
		'registry', 'role', 'service-account', 'workload-identity', 'env-group',
		'scheduler', 'notification'
	]
	const ACTION_SUGGESTIONS = [
		'create', 'update', 'delete', 'deploy', 'rollback', 'restart',
		'pause', 'resume', 'grant', 'revoke'
	]
	const OUTCOME_SUGGESTIONS = ['success', 'failure']

	const form = $state(untrack(() => ({
		name: channel?.name ?? '',
		type: (channel?.config?.type ?? 'webhook') as string,
		url: channel?.config?.url ?? '',
		// Secret is write-only: never prefilled. On edit, leaving it blank keeps the
		// stored one.
		secret: '',
		insecureSkipVerify: channel?.config?.insecureSkipVerify ?? false,
		pullTtlSeconds: (channel?.config?.pullTtlSeconds ?? null) as number | null,
		resourceTypes: channel?.subscription?.resourceTypes ?? [],
		actions: channel?.subscription?.actions ?? [],
		outcomes: channel?.subscription?.outcomes ?? [],
		disabled: channel?.disabled ?? false
	})))

	type AxisKey = 'resourceTypes' | 'actions' | 'outcomes'
	function addAxisValue (key: AxisKey, value: string) {
		if (!form[key].includes(value)) form[key] = [...form[key], value]
	}

	// A webhook needs a signing secret. It is required when creating, or when an
	// edit switches a non-webhook channel to webhook — the stored secret (if any)
	// belonged to the old type, so a fresh one is needed.
	const originalType = $derived(channel?.config?.type ?? 'webhook')
	const secretRequired = $derived(form.type === 'webhook' && (!isEdit || originalType !== 'webhook'))

	let saving = $state(false)

	async function save (e: SubmitEvent) {
		e.preventDefault()
		if (saving) return

		let config: Api.NotificationConfig
		if (form.type === 'pull') {
			// A pull channel has no delivery target or secret; the only knob is the
			// optional inactivity TTL.
			config = { type: 'pull', url: '', insecureSkipVerify: false }
			if (form.pullTtlSeconds) config.pullTtlSeconds = Number(form.pullTtlSeconds)
		} else {
			config = {
				type: form.type as Api.NotificationConfig['type'],
				url: form.url,
				insecureSkipVerify: form.insecureSkipVerify
			}
			// Webhook signing secret is write-only — send only when entered (on edit an
			// empty value keeps the stored one). Discord carries no secret.
			if (form.type === 'webhook' && form.secret) config.secret = form.secret
		}

		saving = true
		try {
			const fn = isEdit ? 'notification.update' : 'notification.create'
			const args: Record<string, unknown> = {
				project,
				name: form.name,
				config,
				subscription: {
					resourceTypes: form.resourceTypes,
					actions: form.actions,
					outcomes: form.outcomes
				},
				disabled: form.disabled
			}

			const resp = await api.invoke(fn, args, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			await goto(`/notification/detail?project=${project}&name=${encodeURIComponent(form.name)}`)
		} finally {
			saving = false
		}
	}

	function cancel () {
		goto(`/notification?project=${project}`)
	}
</script>

<div class="breadcrumb">
	<div class="breadcrumb-item">
		<a href={`/notification?project=${project}`} class="link"><h6>Notifications</h6></a>
	</div>
	{#if isEdit && channel}
		<div class="breadcrumb-item">
			<a href={`/notification/detail?project=${project}&name=${encodeURIComponent(channel.name)}`} class="link"><h6>{channel.name}</h6></a>
		</div>
		<div class="breadcrumb-item"><h6>Edit</h6></div>
	{:else}
		<div class="breadcrumb-item"><h6>Create</h6></div>
	{/if}
</div>

<br>

<div class="page-head">
	<div>
		<h4><strong>{isEdit ? 'Edit notification channel' : 'Create notification channel'}</strong></h4>
		<p class="page-sub">Deliver a notification whenever a matching change happens in this project.</p>
	</div>
</div>

<div class="panel is-level-300 grid gap-4">
	<form class="grid gap-4 w-full" onsubmit={save}>
		<div class="field">
			<label for="input-name">Name</label>
			<div class="input">
				<input id="input-name" placeholder="ops-webhook" bind:value={form.name} required readonly={isEdit}>
			</div>
		</div>

		<br>
		<hr>
		<br>

		<h6><strong>Channel</strong></h6>

		<div class="grid gap-4 sm:grid-cols-[10rem_1fr]">
			<div class="field">
				<label for="input-type">Type</label>
				<Select id="input-type" bind:value={form.type} options={typeOptions} />
			</div>
			{#if form.type === 'pull'}
				<div class="field">
					<label for="input-pull-ttl">Auto-delete when idle (seconds)</label>
					<div class="input">
						<input id="input-pull-ttl" type="number" min="60" max="86400" placeholder="900 (default 15 min)"
							bind:value={form.pullTtlSeconds}>
					</div>
					<p class="text-content/50 text-sm mt-1">
						A pull channel has no URL — an agent reads events on its own schedule via the API or CLI
						(<code>deploys notification pull</code>). It auto-deletes after this idle window. Blank = server default (15&nbsp;min); range 60–86400&nbsp;s.
					</p>
				</div>
			{:else}
				<div class="field">
					<label for="input-url">URL</label>
					<div class="input">
						<input id="input-url" type="url" placeholder="https://example.com/webhook" bind:value={form.url} required>
					</div>
					{#if form.type === 'discord'}
						<p class="text-content/50 text-sm mt-1">The Discord channel's incoming webhook URL.</p>
					{/if}
				</div>
			{/if}
		</div>

		{#if form.type === 'webhook'}
			<div class="field">
				<label for="input-secret">Signing secret</label>
				<div class="input">
					<input id="input-secret" type="password" bind:value={form.secret}
						placeholder={isEdit && !secretRequired ? 'Unchanged' : ''} autocomplete="off" required={secretRequired}>
				</div>
				<p class="text-content/50 text-sm mt-1">
					Deliveries are signed <code>X-Deploys-Signature: sha256=&lt;hmac&gt;</code> with this secret so your endpoint can verify them.
				</p>
			</div>
		{/if}

		<br>
		<hr>
		<br>

		<div>
			<h6><strong>Subscription</strong></h6>
			<p class="text-content/50 text-sm mt-1">
				Pick the changes this channel receives. A change is delivered only when it matches on
				<em>every</em> axis you set; <strong>leave an axis empty to match all of it</strong>. An empty
				subscription receives every change.
			</p>
		</div>

		<div class="field">
			<label for="input-resourceTypes">Resource types</label>
			<TagInput id="input-resourceTypes" bind:tags={form.resourceTypes} placeholder="Click a suggestion below, or type a resource type…" />
			<div class="suggestions">
				{#each RESOURCE_TYPE_SUGGESTIONS.filter((s) => !form.resourceTypes.includes(s)) as s (s)}
					<button type="button" class="suggestion" onclick={() => addAxisValue('resourceTypes', s)}>
						<i class="fa-solid fa-plus"></i> {s}
					</button>
				{/each}
			</div>
			<p class="text-content/50 text-sm mt-1">The kind of resource that changed — e.g. a <code>deployment</code> deploy, a <code>domain</code> edit, a <code>role</code> grant.</p>
		</div>
		<div class="field">
			<label for="input-actions">Actions</label>
			<TagInput id="input-actions" bind:tags={form.actions} placeholder="Click a suggestion below, or type an action…" />
			<div class="suggestions">
				{#each ACTION_SUGGESTIONS.filter((s) => !form.actions.includes(s)) as s (s)}
					<button type="button" class="suggestion" onclick={() => addAxisValue('actions', s)}>
						<i class="fa-solid fa-plus"></i> {s}
					</button>
				{/each}
			</div>
			<p class="text-content/50 text-sm mt-1">What happened to it — most resources use <code>create</code>/<code>update</code>/<code>delete</code>; deployments also use <code>deploy</code>, roles use <code>grant</code>/<code>revoke</code>.</p>
		</div>
		<div class="field">
			<label for="input-outcomes">Outcomes</label>
			<div class="suggestions">
				{#each OUTCOME_SUGGESTIONS as s (s)}
					<button type="button" class="suggestion" class:is-selected={form.outcomes.includes(s)}
						onclick={() => form.outcomes.includes(s)
							? form.outcomes = form.outcomes.filter((o) => o !== s)
							: addAxisValue('outcomes', s)}>
						{#if form.outcomes.includes(s)}<i class="fa-solid fa-check"></i>{/if} {s}
					</button>
				{/each}
			</div>
			<p class="text-content/50 text-sm mt-1">Whether the change succeeded or failed. Pick neither to receive both; <code>failure</code> only is handy for an alerting channel.</p>
		</div>

		<br>
		<hr>
		<br>

		{#if form.type === 'webhook'}
			<label class="checkbox">
				<input type="checkbox" bind:checked={form.insecureSkipVerify}>
				Skip TLS verification for HTTPS targets (self-signed certificates)
			</label>
		{/if}

		<label class="checkbox">
			<input type="checkbox" bind:checked={form.disabled}>
			Disabled (do not deliver until re-enabled)
		</label>

		<hr>

		<div class="flex gap-3">
			<GuardedButton permission={isEdit ? 'notification.update' : 'notification.create'} type="submit" loading={saving}>
				{isEdit ? 'Save' : 'Create'}
			</GuardedButton>
			<button type="button" class="button is-variant-secondary" onclick={cancel}>Cancel</button>
		</div>
	</form>
</div>

<style>
	.suggestions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-top: 0.5rem;
	}

	.suggestion {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.1875rem 0.5rem;
		border-radius: 9999px;
		border: 1px solid hsl(var(--hsl-line));
		background-color: transparent;
		color: hsl(var(--hsl-content) / 0.7);
		font-size: 0.75rem;
		line-height: 1;
		cursor: pointer;
		transition: background-color 0.12s, border-color 0.12s, color 0.12s;
	}

	.suggestion:hover {
		border-color: hsl(var(--hsl-primary) / 0.5);
		color: hsl(var(--hsl-primary));
		background-color: hsl(var(--hsl-primary) / 0.08);
	}

	.suggestion :global(i) {
		font-size: 0.625rem;
	}

	.suggestion.is-selected {
		border-color: hsl(var(--hsl-primary) / 0.6);
		background-color: hsl(var(--hsl-primary) / 0.12);
		color: hsl(var(--hsl-primary));
		font-weight: 600;
	}
</style>
