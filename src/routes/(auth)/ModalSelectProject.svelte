<script>
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'

	/**
	 * @typedef {Object} Props
	 * @property {Api.Project[]} projects
	 */

	/** @type {Props} */
	const { projects } = $props()

	const project = $derived($page.url.searchParams.get('project'))
	let isActive = $state(false)

	/**
	 * @param {string} sid
	 */
	function setProject (sid) {
		close()

		const q = new URLSearchParams($page.url.search)
		q.set('project', sid)

		if (project) {
			goto(`${$page.data.overrideRedirect || ''}?${q.toString()}`)
			return
		}

		goto(`/?${q.toString()}`)
	}

	export function open () {
		isActive = true
	}

	function close () {
		isActive = false
	}
</script>

<div class="nm-modal" onclick={close} class:is-active={isActive} aria-hidden="true">
	<div class="nm-modal-panel">
		<div class="nm-modal-close" onclick={close} onkeypress={close} tabindex="0" role="button">✕</div>
		<h4>Projects</h4>

		<div class="nm-table-container _mgt-6">
			<table class="nm-table is-variant-compact" style="--table-data-font-size: var(--fs-2)">
				<thead>
					<tr>
						<th class="is-collapse"></th>
						<th>Name</th>
						<th>ID</th>
					</tr>
				</thead>
				<tbody>
					{#each projects as it}
					<tr>
						<td>
							{#if project === it.project}
								<i class="fas fa-check _cl-primary _fs-6"></i>
							{/if}
						</td>
						<td>
							<div onclick={() => setProject(it.project)} onkeypress={() => setProject(it.project)}
								tabindex="0" role="link"
								class="_tdcrt-udl _cs-pt _cl-primary:hover"
								style="font-weight: 500">
								{it.name}
							</div>
						</td>
						<td>{it.project}</td>
					</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

<style lang="scss">
	.nm-table-container {
		max-height: 405px;
		overflow: auto;
	}

	.nm-table td {
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
	}

	.nm-modal-panel {
		box-shadow: 0 15px 15px 0 rgba(43, 43, 43, 0.1);
		width: 100%;
		max-width: 48rem;
	}
</style>
