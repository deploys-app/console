<script lang="ts">
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Select from '$lib/components/Select.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import { denyTooltip, getPermissionContext } from '$lib/permission'
	import type { PageData } from './$types'

	const { can } = getPermissionContext()

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const deployment = $derived(data.deployment)
	const routes = $derived(data.routes)
	const domains = $derived(data.domains)
	const error = $derived(data.error)

	type Mode = 'create' | 'edit'

	let formOpen = $state(false)
	let formMode = $state<Mode>('create')
	let saving = $state(false)

	// editing identity — populated when opening in edit mode so we can
	// pass the original (location, domain, path) tuple to the API even if
	// the inputs are read-only.
	let editingDomain = $state('')
	let editingPath = $state('')

	const form = $state({
		domain: '', // base domain (when wildcard, the "*.example.com" parent)
		subdomain: '', // only used when the selected base domain is wildcard
		path: '/',
		auth: 'none' as 'none' | 'basic' | 'forward',
		basicAuth: { user: '', password: '' },
		forwardAuth: { target: '', requestHeaders: '', responseHeaders: '' }
	})

	const selectedDomain = $derived(domains.find((d) => d.domain === form.domain))

	function resetForm () {
		form.domain = ''
		form.subdomain = ''
		form.path = '/'
		form.auth = 'none'
		form.basicAuth = { user: '', password: '' }
		form.forwardAuth = { target: '', requestHeaders: '', responseHeaders: '' }
		editingDomain = ''
		editingPath = ''
	}

	function openCreate () {
		resetForm()
		formMode = 'create'
		formOpen = true
	}

	function openEdit (r: Api.Route) {
		resetForm()
		formMode = 'edit'
		// Wildcard routes serialize as `sub.parent`; the picker can't split this
		// back into base + subdomain without help, so we just lock the field as a
		// flat string in edit mode (identity is read-only anyway).
		form.domain = r.domain
		form.path = r.path
		editingDomain = r.domain
		editingPath = r.path

		const cfg = r.config ?? {}
		if (cfg.basicAuth) {
			form.auth = 'basic'
			form.basicAuth.user = cfg.basicAuth.user
			form.basicAuth.password = cfg.basicAuth.password
		} else if (cfg.forwardAuth) {
			form.auth = 'forward'
			form.forwardAuth.target = cfg.forwardAuth.target
			form.forwardAuth.requestHeaders = (cfg.forwardAuth.authRequestHeaders ?? []).join('\n')
			form.forwardAuth.responseHeaders = (cfg.forwardAuth.authResponseHeaders ?? []).join('\n')
		}

		formOpen = true
	}

	function closeForm () {
		if (saving) return
		formOpen = false
	}

	function onBackdrop (e: MouseEvent) {
		if (e.target === e.currentTarget) closeForm()
	}

	function splitLines (s: string): string[] {
		return s.split('\n').map((x) => x.trim()).filter((x) => x !== '')
	}

	async function save (e: SubmitEvent) {
		e.preventDefault()
		if (saving) return

		let domain = form.domain
		let path = form.path
		if (formMode === 'edit') {
			domain = editingDomain
			path = editingPath
		} else {
			if (!selectedDomain) return
			const sub = form.subdomain.trim()
			if (selectedDomain.wildcard && sub !== '') {
				domain = `${sub}.${domain}`
			}
		}

		const config = {
			basicAuth: form.auth === 'basic'
				? { user: form.basicAuth.user, password: form.basicAuth.password }
				: null,
			forwardAuth: form.auth === 'forward'
				? {
					target: form.forwardAuth.target,
					authRequestHeaders: splitLines(form.forwardAuth.requestHeaders),
					authResponseHeaders: splitLines(form.forwardAuth.responseHeaders)
				}
				: null
		}

		saving = true
		try {
			// route.createV2 upserts on (location, domain, path) — same call serves
			// create and edit.
			const resp = await api.invoke('route.createV2', {
				project,
				location: deployment.location,
				domain,
				path,
				target: `deployment://${deployment.name}`,
				config
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			await api.invalidate('route.list')
			formOpen = false
		} finally {
			saving = false
		}
	}

	function deleteRoute (r: Api.Route) {
		modal.confirm({
			title: `Delete route ${r.domain}${r.path} in ${r.location}?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('route.delete', {
					project,
					location: r.location,
					domain: r.domain,
					path: r.path
				}, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				await api.invalidate('route.list')
			}
		})
	}
</script>

<div class="page-head">
	<div>
		<h4><strong>Routes</strong></h4>
		<p class="page-sub">{routes.length} {routes.length === 1 ? 'route' : 'routes'} pointing to this deployment</p>
	</div>
	<GuardedButton permission="route.create" class="button is-icon-left" onclick={openCreate}>
		<i class="fa-solid fa-plus"></i>
		Create
	</GuardedButton>
</div>

<div class="panel is-level-300">
	<div class="table-container">
		<table class="table is-variant-compact">
			<thead>
				<tr>
					<th>Route</th>
					<th>Auth</th>
					<th class="is-collapse is-align-right"></th>
				</tr>
			</thead>
			<tbody>
				{#each routes as it (`${it.domain}${it.path}-${it.location}`)}
					<tr>
						<td>
							<a class="link cell-name" href={`https://${it.domain}${it.path}`} target="_blank" rel="noreferrer">
								https://{it.domain}{it.path}
							</a>
						</td>
						<td>
							{#if it.config?.basicAuth}
								<span class="auth-chip"><i class="fa-solid fa-lock"></i> Basic</span>
							{:else if it.config?.forwardAuth}
								<span class="auth-chip"><i class="fa-solid fa-shield-halved"></i> Forward</span>
							{:else}
								<span class="cell-muted">Public</span>
							{/if}
						</td>
						<td>
							<div class="flex gap-1 justify-end">
								<a class="icon-button" aria-label="Open route in new tab"
								   href={`https://${it.domain}${it.path}`}
								   target="_blank" rel="noreferrer">
									<i class="fa-solid fa-arrow-up-right-from-square"></i>
								</a>
								<span class="inline-flex" title={can('route.create') ? null : denyTooltip('route.create')}>
									<button class="icon-button" type="button" aria-label="Edit"
										disabled={!can('route.create')}
										onclick={() => openEdit(it)}>
										<i class="fa-solid fa-pencil"></i>
									</button>
								</span>
								<span class="inline-flex" title={can('route.delete') ? null : denyTooltip('route.delete')}>
									<button class="icon-button" type="button" aria-label="Delete"
										disabled={!can('route.delete')}
										onclick={() => deleteRoute(it)}>
										<i class="fa-solid fa-trash-alt"></i>
									</button>
								</span>
							</div>
						</td>
					</tr>
				{/each}
				<NoDataRow span={3} list={routes} message="No routes point to this deployment" {error} />
				<ErrorRow span={3} {error} />
			</tbody>
		</table>
	</div>
</div>

<div class="modal" onclick={onBackdrop} class:is-active={formOpen} aria-hidden={!formOpen}>
	<div class="modal-panel">
		<div class="modal-close" onclick={closeForm} onkeypress={closeForm} tabindex="0" role="button">✕</div>
		<h4><strong>{formMode === 'create' ? 'Create route' : 'Edit route'}</strong></h4>
		<p class="page-sub mt-1">
			{formMode === 'create' ? 'Forward traffic from a domain path to' : 'Update authentication for the route on'}
			<span class="font-mono">{deployment.name}</span>
			in <span class="font-mono">{deployment.location}</span>.
		</p>

		<form class="grid gap-4 mt-5" onsubmit={save}>
			{#if formMode === 'create'}
				<div class="field">
					<label for="rt-domain">Domain</label>
					<Select
						id="rt-domain"
						bind:value={form.domain}
						required
						placeholder={domains.length ? 'Select Domain' : 'No verified domains in this location'}
						disabled={domains.length === 0}
						options={domains.map((it) => ({ value: it.domain, label: (it.wildcard ? '*.' : '') + it.domain }))} />
				</div>

				{#if selectedDomain?.wildcard}
					<div class="field">
						<label for="rt-subdomain">Subdomain</label>
						<div class="input -has-icon-right">
							<input id="rt-subdomain" bind:value={form.subdomain}>
							<input class="icon -is-right px-2 w-auto" value={`.${form.domain}`} size={form.domain.length} readonly disabled>
						</div>
					</div>
				{/if}

				<div class="field">
					<label for="rt-path">Path</label>
					<div class="input">
						<input id="rt-path" bind:value={form.path}>
					</div>
				</div>
			{:else}
				<div class="field">
					<label for="rt-domain-ro">Domain</label>
					<div class="input">
						<input id="rt-domain-ro" class="font-mono" value={editingDomain} readonly>
					</div>
				</div>
				<div class="field">
					<label for="rt-path-ro">Path</label>
					<div class="input">
						<input id="rt-path-ro" class="font-mono" value={editingPath} readonly>
					</div>
				</div>
			{/if}

			<div class="field">
				<label for="rt-auth">Protect with</label>
				<Select
					id="rt-auth"
					bind:value={form.auth}
					placeholder="Select"
					options={[
						{ value: 'none', label: 'None' },
						{ value: 'basic', label: 'Basic Auth' },
						{ value: 'forward', label: 'Forward Auth' }
					]} />
			</div>

			{#if form.auth === 'basic'}
				<div class="field">
					<label for="rt-basic-user">User</label>
					<div class="input">
						<input id="rt-basic-user" bind:value={form.basicAuth.user} required>
					</div>
				</div>
				<div class="field">
					<label for="rt-basic-password">Password</label>
					<div class="input">
						<input id="rt-basic-password" type="password" bind:value={form.basicAuth.password} required>
					</div>
				</div>
			{:else if form.auth === 'forward'}
				<div class="field">
					<label for="rt-fwd-target">Target</label>
					<div class="input">
						<input id="rt-fwd-target" bind:value={form.forwardAuth.target} placeholder="https://auth.example.com/verify" required>
					</div>
				</div>
				<div class="field">
					<label for="rt-fwd-req">Request headers</label>
					<div class="textarea">
						<textarea id="rt-fwd-req" rows="3"
							bind:value={form.forwardAuth.requestHeaders}
							placeholder="One header name per line"></textarea>
					</div>
				</div>
				<div class="field">
					<label for="rt-fwd-res">Response headers</label>
					<div class="textarea">
						<textarea id="rt-fwd-res" rows="3"
							bind:value={form.forwardAuth.responseHeaders}
							placeholder="One header name per line"></textarea>
					</div>
				</div>
			{/if}

			<div class="flex gap-3 mt-2">
				<GuardedButton permission="route.create" type="submit" loading={saving}>Save</GuardedButton>
				<button type="button" class="button is-variant-tertiary" disabled={saving} onclick={closeForm}>Cancel</button>
			</div>
		</form>
	</div>
</div>

<style>
	.modal-panel {
		width: 100%;
		max-width: 36rem;
		max-height: calc(100dvh - 3rem);
		overflow-y: auto;
	}

	.auth-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.1rem 0.5rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 600;
		background: hsl(var(--hsl-warning) / 0.12);
		color: hsl(var(--hsl-warning));
		border: 1px solid hsl(var(--hsl-warning) / 0.3);
	}
</style>
