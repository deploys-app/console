<script lang="ts">
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import * as format from '$lib/format'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const domains = $derived(data.domains)
	const error = $derived(data.error)
</script>

<div class="page-head">
	<div>
		<h4><strong>Emails</strong></h4>
		<p class="page-sub">{domains.length} {domains.length === 1 ? 'domain' : 'domains'}</p>
	</div>
	<span class="text-content/60 text-sm">Contact us to request access</span>
</div>
<div class="panel is-level-300">
	<div class="table-container">
		<table class="table is-variant-compact">
			<thead>
			<tr>
				<th>Domain</th>
				<th>Quota</th>
				<th>Created at</th>
			</tr>
			</thead>
			<tbody>
				{#each domains as it (it.domain)}
					<tr>
						<td><span class="cell-name">{it.domain}</span></td>
						<td><span class="cell-muted">—</span></td>
						<td>
							<span class="cell-time" title={format.datetime(it.createdAt)}>{format.fromNow(it.createdAt) || '—'}</span>
						</td>
					</tr>
				{/each}
				<NoDataRow span={3} list={domains} />
				<ErrorRow span={3} {error} />
			</tbody>
		</table>
	</div>
</div>
