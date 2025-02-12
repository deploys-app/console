<script>
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import NoDataRow from '$lib/components/NoDataRow.svelte'

	let { data } = $props()
	const {
		roles,
		email,
		selected
	} = data

	let project = $derived(data.project)

	const form = $state({
		email,
		roles: selected
	})

	function addRole (role) {
		if (!role || form.roles.includes(role)) {
			return
		}

		form.roles = [...form.roles, role]
	}

	function removeRole (role) {
		form.roles = form.roles.filter((x) => x !== role)
	}

	function selectRoleChanged (e) {
		addRole(e.target.value)
		e.target.value = ''
	}

	let saving = $state(false)

	/**
	 * @param {Event} e
	 */
	async function save (e) {
		e.preventDefault()

		if (saving) {
			return
		}

		saving = true
		try {
			const resp = await api.invoke('role.bind', {
				project,
				email: form.email,
				roles: form.roles
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			await goto(`/role/users?project=${project}`)
		} finally {
			saving = false
		}
	}
</script>

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href={`/role/users?project=${project}`} class="nm-link"><h6>Users</h6></a>
	</div>
	<div class="nm-breadcrumb-item">
		<h6>Add</h6>
	</div>
</div>

<br>
<div class="nm-panel is-level-300 _dp-g _g-7">
	<div class="lo-12 _g-5">
		<div class="_dp-f _alit-ct">
			<h3 class="_mgr-7 _mgbt-6 _mgbt-0:lg"><strong>Add member to "{project}" project</strong></h3>
		</div>
	</div>

	<hr>

	<form class="_dp-g _g-6 _w-100pct" onsubmit={save}>
		<div class="nm-field">
			<div class="nm-input">
				<input type="email" placeholder="Email" bind:value={form.email} readonly={!!email} required>
			</div>
		</div>
		<div class="nm-field">
			<div class="nm-select">
				<select onchange={selectRoleChanged}>
					<option value="" disabled selected>---Select Role---</option>
					{#each roles as it}
						{#if !form.roles.includes(it.role)}
							<option value={it.role}>{it.name} ({it.role})</option>
						{/if}
					{/each}
				</select>
			</div>
		</div>

		<div class="nm-table-container">
			<table class="nm-table is-variant-compact">
				<thead>
				<tr>
					<th>Role</th>
					<th class="is-collapse is-align-right"></th>
				</tr>
				</thead>
				<tbody>
				{#each form.roles as it}
					<tr>
						<td>{it}</td>
						<td>
							<div class="icon-button" role="button" tabindex="0"
								onclick={() => removeRole(it)} onkeypress={() => removeRole(it)}>
								<i class="fa-solid fa-trash-alt"></i>
							</div>
						</td>
					</tr>
				{:else}
					<NoDataRow span={2} />
				{/each}
				</tbody>
			</table>
		</div>

		<button class="nm-button _mgt-6 _mgr-at" class:is-loading={saving}>
			Save
		</button>
	</form>
</div>
