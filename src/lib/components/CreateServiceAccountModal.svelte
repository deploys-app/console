<script>
	import api from '$lib/api'

	/**
	 * @typedef {Object} Props
	 * @property {string} project
	 * @property {boolean} [canGrantRole] Whether the current user may grant the deploy role (needs role.bind, plus role.create when the github-deploy role doesn't exist). Defaults to true for safety.
	 * @property {(sa: { sid: string, name: string, email: string }) => void} oncreated
	 */

	/** @type {Props} */
	const { project, canGrantRole = true, oncreated } = $props()

	let isActive = $state(false)
	let sid = $state('github-deploy')
	let name = $state('GitHub Deploy')
	// Reconciled with canGrantRole in open(); the modal is never shown before
	// open() runs, so the initial value here is never user-visible.
	let grantRole = $state(true)
	let submitting = $state(false)
	/** @type {string} */
	let errorMessage = $state('')

	const canSubmit = $derived(sid.trim() !== '' && name.trim() !== '' && !submitting)

	export function open () {
		sid = 'github-deploy'
		name = 'GitHub Deploy'
		// Default the checkbox on, but keep it off when the user can't grant roles.
		grantRole = canGrantRole
		submitting = false
		errorMessage = ''
		isActive = true
	}

	function close () {
		isActive = false
	}

	/** @param {MouseEvent} e */
	function onBackdrop (e) {
		if (e.target === e.currentTarget) close()
	}

	const DEPLOY_PERMISSIONS = ['deployment.deploy', 'deployment.get', 'deployment.delete', 'registry.push']

	async function create () {
		if (!canSubmit) return

		submitting = true
		errorMessage = ''

		const cleanSid = sid.trim()
		const cleanName = name.trim()
		// Never touch the role.get/role.create/role.bind path without permission.
		const doGrantRole = grantRole && canGrantRole

		try {
			const createResp = await api.invoke('serviceAccount.create', { project, sid: cleanSid, name: cleanName }, fetch)
			if (!createResp.ok) {
				errorMessage = createResp.error?.message ?? 'Failed to create service account.'
				return
			}

			if (doGrantRole) {
				// Ensure the github-deploy role exists with the deploy permissions.
				const roleResp = await api.invoke('role.get', { project, role: 'github-deploy' }, fetch)
				if (!roleResp.ok && roleResp.error?.notFound) {
					const roleCreateResp = await api.invoke('role.create', {
						project,
						role: 'github-deploy',
						name: 'GitHub Deploy',
						permissions: DEPLOY_PERMISSIONS
					}, fetch)
					// Tolerate an "already exists"-style race from another tab.
					if (!roleCreateResp.ok && !/already exist/i.test(roleCreateResp.error?.message ?? '')) {
						errorMessage = roleCreateResp.error?.message ?? 'Failed to create the github-deploy role.'
						return
					}
				}
			}

			// Re-fetch to resolve the real service account email.
			let email = `${cleanSid}@${project}.serviceaccount.deploys.app`
			const listResp = await api.invoke('serviceAccount.list', { project }, fetch)
			if (listResp.ok) {
				const found = (listResp.result?.items ?? []).find((s) => s.sid === cleanSid)
				if (found?.email) email = found.email
			}

			if (doGrantRole) {
				const bindResp = await api.invoke('role.bind', { project, email, roles: ['github-deploy'] }, fetch)
				if (!bindResp.ok) {
					// The SA exists, so still select it — but warn that permissions weren't granted.
					oncreated({ sid: cleanSid, name: cleanName, email })
					errorMessage = `Service account created, but granting the deploy role failed: ${bindResp.error?.message ?? 'unknown error'}. Bind a role manually before linking.`
					return
				}
			}

			oncreated({ sid: cleanSid, name: cleanName, email })
			close()
		} finally {
			submitting = false
		}
	}
</script>

<div class="modal" onclick={onBackdrop} class:is-active={isActive} aria-hidden={!isActive}>
	<div class="modal-panel">
		<div class="modal-close" onclick={close} onkeypress={close} tabindex="0" role="button">✕</div>
		<h4><strong>Create service account</strong></h4>
		<p class="text-content/50 text-sm mt-1">
			A deploy identity for GitHub Actions. We grant it the deploy permissions automatically.
		</p>

		<div class="grid gap-4 mt-4">
			<div class="field">
				<label for="create-sa-sid">ID</label>
				<div class="input">
					<input id="create-sa-sid" class="font-mono" bind:value={sid} placeholder="github-deploy">
				</div>
				<p class="text-content/50 text-sm mt-1">Lowercase letters, numbers, hyphens.</p>
			</div>

			<div class="field">
				<label for="create-sa-name">Name</label>
				<div class="input">
					<input id="create-sa-name" bind:value={name} placeholder="GitHub Deploy">
				</div>
			</div>

			<div class="field">
				<div class="checkbox">
					<input id="create-sa-grant" type="checkbox" bind:checked={grantRole} disabled={!canGrantRole}>
					<label for="create-sa-grant">Grant deploy role — deployment.deploy, deployment.get, deployment.delete, registry.push</label>
				</div>
				{#if !canGrantRole}
					<p class="text-warning text-sm mt-1">
						You don't have permission to grant roles in this project (needs role.bind).
						The service account will be created without deploy permissions — ask a project
						owner to grant it the deploy role before linking.
					</p>
				{/if}
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
				onclick={create}
				type="button">
				Create &amp; select
			</button>
			<button
				class="button is-variant-secondary"
				disabled={submitting}
				onclick={close}
				type="button">
				Cancel
			</button>
		</div>
	</div>
</div>

<style>
	.modal-panel {
		width: 100%;
		max-width: 32rem;
	}
</style>
