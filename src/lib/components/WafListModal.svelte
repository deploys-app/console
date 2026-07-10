<script lang="ts">
	import api from '$lib/api'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import {
		WAF_LIST_MAX_ENTRIES,
		WAF_LIST_NAME_MAX,
		WAF_LIST_NAME_MIN,
		parseIPListEntries,
		validListName
	} from '$lib/waf/lists'

	interface Props {
		project: string
		/** called after a successful wafList.set so the page can reload its data */
		onsaved: () => void
	}

	const { project, onsaved }: Props = $props()

	let isActive = $state(false)
	// Editing keeps the name immutable — the name is the reference key every
	// ipInList macro points at; renaming is delete + recreate by design.
	let editing = $state(false)
	let name = $state('')
	let description = $state('')
	let entriesText = $state('')
	let saving = $state(false)
	let errorMessage = $state('')

	const entriesPlaceholder = 'One IP or CIDR per line, e.g.\n203.0.113.0/24\n198.51.100.7\n2001:db8::/48'

	const parsed = $derived(parseIPListEntries(entriesText))
	const nameOk = $derived(validListName(name.trim()))
	const canSave = $derived((editing || nameOk) && parsed.errors.length === 0 && !saving)

	// Keep the error list scannable — the textarea can hold hundreds of lines.
	const shownErrors = $derived(parsed.errors.slice(0, 5))
	const moreErrors = $derived(parsed.errors.length - shownErrors.length)

	export function open (list?: Api.WafListItem): void {
		editing = !!list
		name = list?.name ?? ''
		description = list?.description ?? ''
		entriesText = (list?.entries ?? []).join('\n')
		saving = false
		errorMessage = ''
		isActive = true
	}

	function close () {
		isActive = false
	}

	function onBackdrop (e: MouseEvent) {
		if (e.target === e.currentTarget) close()
	}

	async function save (e: Event) {
		e.preventDefault()
		if (!canSave) return

		saving = true
		errorMessage = ''
		try {
			const resp = await api.invoke('wafList.set', {
				project,
				name: name.trim(),
				description,
				type: 'ip',
				entries: parsed.entries
			}, fetch)
			if (!resp.ok) {
				// Surface the server's message verbatim (e.g. an expanded-size cap
				// naming the zone/rule the update would overflow).
				errorMessage = (resp.error?.validate ?? [resp.error?.message ?? 'Failed to save the list.']).join('\n')
				return
			}
			close()
			onsaved()
		} finally {
			saving = false
		}
	}
</script>

<div class="modal" onclick={onBackdrop} class:is-active={isActive} aria-hidden={!isActive}>
	<div class="modal-panel">
		<div class="modal-close" onclick={close} onkeypress={close} tabindex="0" role="button">✕</div>
		<h4><strong>{editing ? 'Edit IP list' : 'New IP list'}</strong></h4>
		<p class="text-content/50 text-sm mt-1">
			A named set of IPs/CIDRs, referenced from rule conditions and rate-limit
			filters as <code class="font-mono">ipInList(request.remote_ip, "{name.trim() || 'name'}")</code>.
			Editing re-applies every firewall that references it.
		</p>

		<form class="grid gap-4 mt-4" onsubmit={save}>
			<div class="field">
				<label for="waf-list-modal-name">Name</label>
				<div class="input">
					<input id="waf-list-modal-name" class="font-mono" bind:value={name}
						readonly={editing} placeholder="office-ips">
				</div>
				{#if editing}
					<p class="text-content/50 text-sm mt-1">
						The name is what rules reference — it can't change. Create a new
						list to rename.
					</p>
				{:else}
					<p class="{name.trim() !== '' && !nameOk ? 'text-negative' : 'text-content/50'} text-sm mt-1">
						{WAF_LIST_NAME_MIN}–{WAF_LIST_NAME_MAX} characters; lowercase
						letters, numbers, and hyphens, starting with a letter and ending
						with a letter or number.
					</p>
				{/if}
			</div>

			<div class="field">
				<label for="waf-list-modal-description">Description</label>
				<div class="input">
					<input id="waf-list-modal-description" bind:value={description} placeholder="Optional description">
				</div>
			</div>

			<div class="field">
				<label for="waf-list-modal-entries">Entries</label>
				<div class="textarea">
					<textarea id="waf-list-modal-entries" class="font-mono" rows="8" bind:value={entriesText}
						placeholder={entriesPlaceholder}></textarea>
				</div>
				<p class="text-content/50 text-sm mt-1">
					{parsed.entries.length} {parsed.entries.length === 1 ? 'entry' : 'entries'}
					(max {WAF_LIST_MAX_ENTRIES}). An empty list never matches.
				</p>
				{#if shownErrors.length}
					<ul class="text-negative text-sm mt-1 grid gap-0.5">
						{#each shownErrors as err (err)}
							<li>{err}</li>
						{/each}
						{#if moreErrors > 0}
							<li class="text-content/50">…and {moreErrors} more.</li>
						{/if}
					</ul>
				{/if}
			</div>

			{#if errorMessage}
				<p class="text-negative text-sm whitespace-pre-line">{errorMessage}</p>
			{/if}

			<div class="flex items-center gap-3 mt-2">
				<GuardedButton permission="wafList.set" type="submit" loading={saving} disabled={!canSave}
					title={canSave ? undefined : 'Enter a valid name and fix the entry errors first'}>
					Save
				</GuardedButton>
				<button type="button" class="button is-variant-secondary" disabled={saving} onclick={close}>
					Cancel
				</button>
			</div>
		</form>
	</div>
</div>

<style>
	.modal-panel {
		width: 100%;
		max-width: 36rem;
	}
</style>
