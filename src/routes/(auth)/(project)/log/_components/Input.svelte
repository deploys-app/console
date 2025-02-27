<script>
	import { page } from '$app/state'
	import { goto } from '$app/navigation'

	let { valueIndexId = $bindable(), valueEndpoint = $bindable(), show = $bindable(), getIndex, runQuery } = $props()

	const form = $state({
		endpoint: valueEndpoint,
		indexId: valueIndexId
	})

	async function submit () {
		valueEndpoint = form.endpoint
		valueIndexId = form.indexId
		const currentUrl = page.url
		const urlSearchParams = new URLSearchParams(currentUrl.search)

		urlSearchParams.set('endpoint', valueEndpoint)
		urlSearchParams.set('indexId', valueIndexId)
		const newUrl = `${currentUrl.origin}${currentUrl.pathname}?${urlSearchParams.toString()}`
		await goto(newUrl, { replaceState: true })
		show = false
		getIndex()
		runQuery()
	}
</script>

<div class="_dp-f _fdrt-cl _g-4">
	<div class="_pd-6 nm-panel is-level-300 _dp-f _jtfct-spbtw _alit-fst _w-100pct _g-6">
		{#if !show}
			<div class="_dp-f _fdrt-cl">
				<span class="_fw-600 _wb-ba _fs-2 _cl-primary">Endpoint URL:</span>
				<span class="_wb-ba _fs-2">{ valueEndpoint }</span>
				<span class="_mgt-4 _fw-600 _wb-ba _fs-2 _cl-primary">Index ID:</span>
				<span class="_wb-ba _fs-2">{ valueIndexId }</span>
			</div>
			<button
				class="nm-button is-icon-button is-size-small is-variant-tertiary _ovf-hd _mnw-9 _mxw-9"
				onclick={ () => { show = true } }
				aria-label="clear"
			>
				<i class="fa-solid fa-xmark _fs-3"></i>
			</button>
		{:else}
			<div class="nm-field _w-100pct">
				<div class="nm-input _h-40">
					<input
						id="input-url"
						type="text"
						bind:value={ form.endpoint }
						required
						class="_bgcl-white"
						placeholder="Endpoint URL"
					/>
				</div>
				<div class="nm-input _h-40">
					<input
						id="input-url"
						type="text"
						bind:value={ form.indexId }
						required
						class="_bgcl-white"
						placeholder="Index ID"
					/>
				</div>
				<button
					disabled={ !form.indexId || !form.endpoint }
					type="button"
					class="nm-button is-size-small _mgl-at"
					class:is-loading={ false }
					onclick={ submit }
					aria-hidden="true"
				>
					Submit
				</button>
			</div>
		{/if}
	</div>
</div>
