<script context="module">
	import api from '$lib/api'

	export async function load ({ stuff, fetch }) {
		const { project } = stuff
		const emails = await api.invoke('email.list', { project }, fetch)
		if (!emails.ok && !emails.error.forbidden) {
			return {
				status: 500,
				error: `emails: ${emails.error.message}`
			}
		}
		return {
			props: {
				permission: {
					emails: !emails.error?.forbidden
				},
				emails: emails.result?.items || []
			}
		}
	}
</script>

<script>
	import LoadingRow from '$lib/components/LoadingRow.svelte'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import { page } from '$app/stores'
	import { loading } from '$lib/stores'
	import format from '$lib/format'

	export let permission
	export let emails

	$: project = $page.stuff.project
</script>

<h6>Emails</h6>
<br>
<div class="panel">
	<div class="_dp-f _jtfct-spbtw _alit-ct">
		<div class="lo-grid-span-horizontal _gg-8px _mgl-at">
			Contact us to request access
		</div>
	</div>

	<div class="table-container">
		<table class="table -ruled">
			<thead>
			<tr>
				<th>Domain</th>
				<th>Quota</th>
				<th>Created at</th>
			</tr>
			</thead>
			<tbody>
			{#if $loading}
				<LoadingRow span="3" />
			{:else}
				{#each emails as it}
					<tr>
						<td>{it.domain}</td>
						<td>-</td>
						<td>{format.datetime(it.createdAt)}</td>
					</tr>
				{:else}
					<NoDataRow span="3" forbidden={!permission.emails} />
				{/each}
			{/if}
			</tbody>
		</table>
	</div>
</div>
