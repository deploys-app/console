<script lang="ts">
	import type { PageData } from './$types'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import * as modal from '$lib/modal'
	import * as format from '$lib/format'
	import api from '$lib/api'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const tokens = $derived(data.tokens)
	const error = $derived(data.error)

	function revoke (id: string, label: string) {
		modal.confirm({
			title: `Revoke scoped token ${label || id}? Requests using it will be rejected immediately.`,
			yes: 'Revoke',
			callback: async () => {
				const resp = await api.invoke('me.revokeToken', { project, id }, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				api.invalidate('me.listTokens')
			}
		})
	}
</script>

<style>
	.perm-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.perm-chip {
		display: inline-flex;
		align-items: center;
		padding: 0.1rem 0.5rem;
		border-radius: 5px;
		font-size: 0.75rem;
		font-weight: 600;
		font-family: var(--ffml-mono);
		background: hsl(var(--hsl-content) / 0.06);
		color: hsl(var(--hsl-content) / 0.8);
	}
	.no-perms {
		font-size: 0.8125rem;
		color: hsl(var(--hsl-content) / 0.45);
		font-style: italic;
	}
	.token-id {
		font-family: var(--ffml-mono);
		font-size: 0.8125rem;
	}
	.no-label {
		color: hsl(var(--hsl-content) / 0.45);
	}
</style>

<div class="page-head">
	<div>
		<h4><strong>Scoped Tokens</strong></h4>
		<p class="page-sub">
			{tokens.length} {tokens.length === 1 ? 'token' : 'tokens'} — your own short-lived, scope-limited agent credentials. Mint with <code>deploys me generate-token</code> or the MCP <code>me.generateToken</code>; revoke any here.
		</p>
	</div>
</div>
<div class="panel is-level-300">
	<div class="table-container">
		<table class="table is-variant-compact">
			<thead>
				<tr>
					<th>ID</th>
					<th>Label</th>
					<th>Permissions</th>
					<th>Expires</th>
					<th>Created</th>
					<th class="is-collapse is-align-right"></th>
				</tr>
			</thead>
			<tbody>
				{#each tokens as it (it.id)}
					<tr>
						<td><span class="token-id">{it.id}</span></td>
						<td>
							{#if it.label}
								{it.label}
							{:else}
								<span class="no-label">—</span>
							{/if}
						</td>
						<td>
							{#if it.permissions.length > 0}
								<div class="perm-chips">
									{#each it.permissions as p (p)}
										<span class="perm-chip">{p}</span>
									{/each}
								</div>
							{:else}
								<span class="no-perms">none</span>
							{/if}
						</td>
						<td>
							<span class="cell-time" title={format.datetime(it.expiresAt)}>{format.fromNow(it.expiresAt) || '—'}</span>
						</td>
						<td>
							<span class="cell-time" title={format.datetime(it.createdAt)}>{format.fromNow(it.createdAt) || '—'}</span>
						</td>
						<td>
							<button class="icon-button" type="button" aria-label="Revoke" onclick={() => revoke(it.id, it.label)}>
								<i class="fa-solid fa-trash-alt"></i>
							</button>
						</td>
					</tr>
				{/each}
				<NoDataRow span={6} list={tokens} {error} icon="fa-user-clock" message="No active scoped tokens" hint="Scoped tokens are minted programmatically for agents and automation." />
				<ErrorRow span={6} {error} />
			</tbody>
		</table>
	</div>
</div>
