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
		{ value: 'discord', label: 'Discord' }
	]

	const form = $state(untrack(() => ({
		name: channel?.name ?? '',
		type: (channel?.config?.type ?? 'webhook') as string,
		url: channel?.config?.url ?? '',
		// Secret is write-only: never prefilled. On edit, leaving it blank keeps the
		// stored one.
		secret: '',
		insecureSkipVerify: channel?.config?.insecureSkipVerify ?? false,
		resourceTypes: channel?.subscription?.resourceTypes ?? [],
		actions: channel?.subscription?.actions ?? [],
		outcomes: channel?.subscription?.outcomes ?? [],
		disabled: channel?.disabled ?? false
	})))

	// A webhook needs a signing secret. It is required when creating, or when an
	// edit switches a non-webhook channel to webhook — the stored secret (if any)
	// belonged to the old type, so a fresh one is needed.
	const originalType = $derived(channel?.config?.type ?? 'webhook')
	const secretRequired = $derived(form.type === 'webhook' && (!isEdit || originalType !== 'webhook'))

	let saving = $state(false)

	async function save (e: SubmitEvent) {
		e.preventDefault()
		if (saving) return

		const config: Api.NotificationConfig = {
			type: form.type as Api.NotificationConfig['type'],
			url: form.url,
			insecureSkipVerify: form.insecureSkipVerify
		}
		// Webhook signing secret is write-only — send only when entered (on edit an
		// empty value keeps the stored one). Discord carries no secret.
		if (form.type === 'webhook' && form.secret) config.secret = form.secret

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
			<div class="field">
				<label for="input-url">URL</label>
				<div class="input">
					<input id="input-url" type="url" placeholder="https://example.com/webhook" bind:value={form.url} required>
				</div>
				{#if form.type === 'discord'}
					<p class="text-content/50 text-sm mt-1">The Discord channel's incoming webhook URL.</p>
				{/if}
			</div>
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
			<p class="text-content/50 text-sm mt-1">Which changes this channel receives. Leave an axis empty to match all.</p>
		</div>

		<div class="field">
			<label for="input-resourceTypes">Resource types</label>
			<TagInput id="input-resourceTypes" bind:tags={form.resourceTypes} placeholder="deployment, route, domain …" />
		</div>
		<div class="field">
			<label for="input-actions">Actions</label>
			<TagInput id="input-actions" bind:tags={form.actions} placeholder="create, update, delete, deploy …" />
		</div>
		<div class="field">
			<label for="input-outcomes">Outcomes</label>
			<TagInput id="input-outcomes" bind:tags={form.outcomes} placeholder="success, failure" />
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
