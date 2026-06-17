<script lang="ts">
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'

	/**
	 * Edit an existing GitHub link in place: change the linked service account,
	 * deploy trigger, and production branch. The repository and installation id
	 * are immutable, so only the mutable fields are editable here. Calls
	 * github.update.
	 */
	interface Props {
		project: string
		/** selectable service accounts in the project */
		serviceAccounts: { sid: string, name: string }[]
		/** called after a successful update so the parent can reload the link list */
		onsaved: () => void
	}

	const { project, serviceAccounts, onsaved }: Props = $props()

	let isActive = $state(false)
	// Identifies the link being edited; repository is display-only.
	let repositoryId = $state(0)
	let repository = $state('')
	let serviceAccount = $state('')
	let productionBranch = $state('')
	let trigger = $state('all')
	// Initial values, to detect whether the workflow file needs recreating.
	let initialBranch = $state('')
	let initialTrigger = $state('all')
	let submitting = $state(false)
	let errorMessage = $state('')
	// After a save that changed the trigger or branch, swap the body for a note
	// nudging the user to recreate deploy.yaml (its on: block tracks both).
	let savedWorkflowChanged = $state(false)

	const triggerOptions = [
		{ value: 'all', label: 'Branch + PR previews' },
		{ value: 'branch', label: 'Branch only (no previews)' },
		{ value: 'pr', label: 'PR previews only (no branch deploys)' }
	]

	const serviceAccountOptions = $derived(
		serviceAccounts.map((sa) => ({ value: sa.sid, label: `${sa.sid} — ${sa.name}` }))
	)

	const workflowHref = $derived(
		`/github/workflow?project=${project}&repo=${encodeURIComponent(repository)}`
	)

	const canSubmit = $derived(serviceAccount !== '' && !submitting)

	export function open (link: Api.GithubLink): void {
		repositoryId = link.repositoryId
		repository = link.repository
		serviceAccount = link.serviceAccount
		productionBranch = link.productionBranch ?? ''
		trigger = link.trigger ?? 'all'
		initialBranch = productionBranch
		initialTrigger = trigger
		submitting = false
		errorMessage = ''
		savedWorkflowChanged = false
		isActive = true
	}

	function close () {
		isActive = false
	}

	function onBackdrop (e: MouseEvent) {
		if (e.target === e.currentTarget) close()
	}

	async function save () {
		if (!canSubmit) return

		submitting = true
		errorMessage = ''
		// pr links never deploy a branch, so the branch is dropped for them.
		const branch = trigger === 'pr' ? '' : productionBranch.trim()

		try {
			const resp = await api.invoke('github.update', {
				project,
				repositoryId,
				serviceAccount,
				productionBranch: branch,
				trigger
			}, fetch)
			if (!resp.ok) {
				errorMessage = resp.error?.message ?? 'Failed to update the link.'
				return
			}

			// Reload the parent's link list so the card reflects the new fields
			// (and the workflow generator picks up the change).
			onsaved()

			const initialEffectiveBranch = initialTrigger === 'pr' ? '' : initialBranch.trim()
			if (trigger !== initialTrigger || branch !== initialEffectiveBranch) {
				// The trigger or branch changed — the committed deploy.yaml's `on:`
				// block is now stale. Keep the modal open with a nudge to recreate
				// it on GitHub rather than closing silently.
				savedWorkflowChanged = true
			} else {
				close()
			}
		} finally {
			submitting = false
		}
	}
</script>

<div class="modal" onclick={onBackdrop} class:is-active={isActive} aria-hidden={!isActive}>
	<div class="modal-panel">
		<div class="modal-close" onclick={close} onkeypress={close} tabindex="0" role="button">✕</div>

		{#if savedWorkflowChanged}
			<h4><strong>Link updated</strong></h4>
			<p class="text-content/50 text-sm mt-1">
				The deploy trigger or production branch changed. The workflow file already
				in <span class="font-mono">{repository}</span> still has the old
				<span class="font-mono">on:</span> block — recreate
				<span class="font-mono">.github/workflows/deploy.yaml</span> and commit it
				so it runs for the right events.
			</p>

			<div class="flex items-center gap-3 mt-6">
				<a class="button is-icon-left" href={workflowHref}>
					<i class="fa-solid fa-diagram-project"></i>
					Recreate workflow
				</a>
				<button class="button is-variant-secondary" onclick={close} type="button">
					Close
				</button>
			</div>
		{:else}
			<h4><strong>Edit link</strong></h4>
			<p class="text-content/50 text-sm mt-1">
				Change the deploy identity, trigger, and production branch for
				<span class="font-mono">{repository}</span>. The repository and installation
				can't be changed — unlink and relink to move to a different repository.
			</p>

			<div class="grid gap-4 mt-4">
				<div class="field">
					<label for="edit-link-service-account">Service account</label>
					<Select
						id="edit-link-service-account"
						bind:value={serviceAccount}
						options={serviceAccountOptions}
						placeholder="Select a service account" />
					<p class="text-content/50 text-sm mt-1">
						Workflows deploy as this identity.
					</p>
				</div>

				<div class="field">
					<label for="edit-link-trigger">Deploy trigger</label>
					<Select
						id="edit-link-trigger"
						bind:value={trigger}
						options={triggerOptions} />
					<p class="text-content/50 text-sm mt-1">
						{#if trigger === 'pr'}
							Only pull requests deploy (each a preview). Pushes to any branch are rejected — no production deploys.
						{:else if trigger === 'branch'}
							Pushes to the production branch deploy; pull requests get no preview.
						{:else}
							Pushes to the production branch deploy, and every pull request gets a preview.
						{/if}
					</p>
				</div>

				<div class="field">
					<label for="edit-link-production-branch">Production branch</label>
					<div class="input">
						<input id="edit-link-production-branch" class="font-mono" bind:value={productionBranch} placeholder="main" disabled={trigger === 'pr'}>
					</div>
					<p class="text-content/50 text-sm mt-1">
						{#if trigger === 'pr'}
							Not used — previews-only links never deploy a branch.
						{:else}
							Deploys are only accepted from this branch. Leave empty to allow any branch.
						{/if}
					</p>
				</div>

				{#if errorMessage}
					<p class="text-negative text-sm">{errorMessage}</p>
				{/if}
			</div>

			<div class="flex items-center gap-3 mt-6">
				<button
					class="button"
					class:is-loading={submitting}
					disabled={!canSubmit}
					onclick={save}
					type="button">
					Save
				</button>
				<button
					class="button is-variant-secondary"
					disabled={submitting}
					onclick={close}
					type="button">
					Cancel
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.modal-panel {
		width: 100%;
		max-width: 32rem;
	}
</style>
