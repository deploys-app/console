<script lang="ts">
	import type { PageData } from './$types'
	import NoDataRow from '$lib/components/NoDataRow.svelte'
	import ErrorRow from '$lib/components/ErrorRow.svelte'
	import GuardedButton from '$lib/components/GuardedButton.svelte'
	import { onMount } from 'svelte'
	import api from '$lib/api'
	import { getPermissionContext } from '$lib/permission'
	import { registerPageActions } from '$lib/pageactions/store.svelte'

	const { data }: { data: PageData } = $props()

	const project = $derived(data.project)
	const zones = $derived(data.zones)
	const error = $derived(data.error)

	const { can } = getPermissionContext()
	$effect(() => {
		if (!can('transform.set')) return
		return registerPageActions([{
			id: 'transform-list:create',
			label: 'Configure transform',
			icon: 'fa-plus',
			keywords: 'create new add configure transform',
			href: `/transform/create?project=${project}`
		}])
	})

	const hasPending = $derived(zones.some((z: Api.TransformZone) => z.status === 'pending'))

	// While any zone is still being applied/removed by the deployer, poll
	// transform.list so the spinner resolves to its settled state on its own
	// (mirrors the cache/WAF index polling pattern).
	onMount(() => api.intervalInvalidate(async () => {
		if (!hasPending) return
		await api.invalidate('transform.list')
	}, 3000))
</script>

<div class="page-head">
	<div>
		<h4><strong>Transform</strong></h4>
		<p class="page-sub">
			{zones.length} {zones.length === 1 ? 'transform zone' : 'transform zones'}
		</p>
	</div>
	<div class="head-actions">
		<GuardedButton permission="transform.set" class="button is-icon-left" href={`/transform/create?project=${project}`}>
			<i class="fa-solid fa-plus"></i>
			Configure transform
		</GuardedButton>
	</div>
</div>

<div class="panel is-level-300">
	<p class="text-content/55 text-sm mb-4">
		Transforms declaratively rewrite requests and responses at the proxy edge —
		set or remove headers, rewrite the path or query, redirect, set a status, or
		apply CORS, each scoped by an optional CEL condition. v1 runs on edge cache
		misses; editing a response transform may need a cache purge to apply to
		already-cached objects.
	</p>
	<div class="table-container">
		<table class="table is-variant-compact">
			<thead>
				<tr>
					<th>Location</th>
					<th>Status</th>
					<th>Description</th>
					<th>Rules</th>
					<th class="is-collapse is-align-right"></th>
				</tr>
			</thead>
			<tbody>
				{#each zones as zone (zone.location)}
					<tr>
						<td>
							<a href={`/transform/manage?project=${project}&location=${encodeURIComponent(zone.location)}`} class="link font-mono">{zone.location}</a>
						</td>
						<td>
							{#if zone.status === 'pending'}
								<span class="inline-flex items-center gap-2 text-content/70">
									<i class="fa-solid fa-spinner-third fa-spin"></i>
									{zone.action === 'delete' ? 'Removing' : 'Deploying'}
								</span>
							{:else if zone.status === 'error'}
								<span class="inline-flex items-center gap-2 text-negative/80">
									<i class="fa-solid fa-times"></i>
									Error
								</span>
							{:else}
								<span class="inline-flex items-center gap-2 text-positive/80">
									<i class="fa-solid fa-check-circle"></i>
									Active
								</span>
							{/if}
						</td>
						<td>
							{#if zone.description}
								{zone.description}
							{:else}
								<span class="text-content/40">—</span>
							{/if}
						</td>
						<td>{zone.transforms?.length ?? 0}</td>
						<td>
							<div class="flex gap-1 justify-end">
								<a class="button is-variant-secondary is-size-small"
									href={`/transform/manage?project=${project}&location=${encodeURIComponent(zone.location)}`}>
									Manage
								</a>
							</div>
						</td>
					</tr>
				{/each}
				<NoDataRow
					span={5}
					list={zones}
					icon="fa-wand-magic-sparkles"
					message="No transform zones yet"
					hint="Configure transform to start rewriting requests and responses in a location."
					ctaLabel="Configure transform"
					ctaHref={`/transform/create?project=${project}`}
					{error} />
				<ErrorRow span={5} {error} />
			</tbody>
		</table>
	</div>
</div>

<style>
	.head-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
</style>
