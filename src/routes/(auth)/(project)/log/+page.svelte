<svelte:head>
	<link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css" rel="stylesheet">
	<link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/line-numbers/prism-line-numbers.min.css" rel="stylesheet">
	<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/line-numbers/prism-line-numbers.min.js"></script>
</svelte:head>

<script>
	import Prism from 'prismjs'
	import 'prismjs/themes/prism.css'
	import 'prismjs/plugins/line-numbers/prism-line-numbers.css'
	import 'prismjs/plugins/line-numbers/prism-line-numbers.js'

	import { onMount } from 'svelte'
	import { slide } from 'svelte/transition'
	import { sineInOut } from 'svelte/easing'
	import { page } from '$app/state'
	import { goto } from '$app/navigation'
	import * as format from '$lib/format'
	import api from '$lib/api/index.js'
	import * as modal from '$lib/modal/index.js'

	import TimeFilter from './_components/TimeFilter.svelte'
	import Fields from './_components/Fields.svelte'
	import Input from './_components/Input.svelte'
	import Pagination from './_components/Pagination.svelte'

	const { data } = $props()
	let endpoint = $state(data.endpoint)
	let indexId = $state(data.indexId)

	let timeFilter = $state(null)
	const show = $state({
		query: true,
		fields: true,
		result: [],
		customFilter: false,
		input: true
	})
	let filter = $state({
		query: '*',
		startDate: '',
		endDate: '',
		duration: '',
		offset: 0,
		perPage: 20
	})
	let perPageValue = $state(20)

	let result = $state({
		list: [],
		total: 0,
		elapsedTime: ''
	})
	let fields = $state([])

	let copyActive = $state(false)
	let initLoading = $state(true)
	let loading = $state(false)

	const currentPage = $derived((filter.offset / filter.perPage) + 1)
	const nextPage = $derived(currentPage * filter.perPage < result.total)

	$effect(() => {
		filter.startDate = data.startDate
		filter.endDate = data.endDate
		filter.duration = data.duration
		filter.query = data.query || '*'
	})

	$effect(() => {
		show.input
		show.result.length
		show.result.length === 0
		result.list
		Prism.highlightAll()
	})

	onMount(async () => {
		if (!indexId || !endpoint) {
			const currentUrl = page.url
			const urlSearchParams = new URLSearchParams(currentUrl.search)

			urlSearchParams.delete('endpoint')
			urlSearchParams.delete('indexId')
			urlSearchParams.delete('duration')
			urlSearchParams.delete('startDate')
			urlSearchParams.delete('endDate')
			const newUrl = `${currentUrl.origin}${currentUrl.pathname}?${urlSearchParams.toString()}`
			await goto(newUrl, { replaceState: true })
			initLoading = false
		} else {
			show.input = false
			await getLog()
			await getIndex()
			Prism.highlightAll()
		}
	})

	async function getIndex () {
		const resp = await api.invokeLog(`${endpoint}/api/v1`, 'indexes', `index_id_patterns=${indexId}`, fetch)
		if (resp.message) {
			modal.error({ error: resp.message })
			loading = false
			return
		}
		fields = [...resp[0].index_config.doc_mapping.field_mappings]
		initLoading = false
	}

	async function getLog () {
		loading = true
		const resp = await api.invokeLog(`${endpoint}/api/v1/${indexId}/`, 'search', createQueryString(), fetch)
		if (resp.message) {
			modal.error({ error: resp.message })
			loading = false
			result = {
				list: [],
				total: 0,
				elapsedTime: '0'
			}
			return
		}
		result = {
			list: resp?.hits || [],
			total: resp?.num_hits || 0,
			elapsedTime: ((resp?.elapsed_time_micros || 0) / 1_000_000).toFixed(2)
		}
		loading = false
	}

	/** @param { number } pageNumber */
	async function gotoPage (pageNumber) {
		filter.offset = (pageNumber - 1) * filter.perPage
		await getLog()
	}

	/**
	 * @param { string } text
	 * */
	function copy (text) {
		navigator.clipboard.writeText(text)
		copyActive = true
		setTimeout(() => {
			copyActive = false
		}, 500)
	}

	function createQueryString () {
		const queryString = {
			query: filter.query,
			max_hits: String(filter.perPage),
			start_timestamp: filter.startDate || '',
			end_timestamp: filter.endDate || '',
			format: 'json',
			sort_by: '+timestamp_nanos',
			start_offset: String(filter.offset)
		}

		return new URLSearchParams(queryString).toString()
	}

	async function runQuery () {
		if (!timeFilter) {
			return
		}
		filter.perPage = perPageValue
		timeFilter?.setFilter(filter.duration)
		filter.offset = 0
	}
</script>

<div class="_dp-f _fdrt-cl _g-6 _w-100pct">
	<h6>Log</h6>
	{#if initLoading}
		<button class="_mgt-4 nm-button is-variant-ghost is-loading">Button</button>
	{:else}
		<div class="_dp-g container _w-100pct _h-100pct">
			<div class="_pdr-6:sm _bdrw-1:sm _bdcl-base-400">
				<div
					class="_pst-stk:sm _dp-f _fdrt-cl _g-6"
					style="top: 80px; z-index: 1;"
				>
					<Input
						{ getIndex } { runQuery }
						bind:show={ show.input }
						bind:valueIndexId={ indexId }
						bind:valueEndpoint={ endpoint }

					/>
					{#if indexId && endpoint}
						<div class="_dp-f _fdrt-cl _g-6">
							<div class="_dp-f _fdrt-r _alit-bl _g-6">
								<i
									class="fa-solid fa-angle-down _cs-pt _ussl-n transition-3"
									class:_tsf-rt-90={ !show.fields }
									onclick={ () => { show.fields = !show.fields } }
									aria-hidden="true"
								></i>
								<Fields
									bind:show={ show.fields }
									list={ fields }
								/>
							</div>
						</div>
					{/if}
				</div>
			</div>
			<div class="_dp-f _fdrt-cl _g-4 _pst-rlt">
				<div
					class="_dp-f _fdrt-cl _g-4 _pst-stk _bgcl-base-200"
					style="top: 80px; z-index: 1;"
				>
					{#if filter.startDate && indexId && endpoint}
						<div
							transition:slide={{ duration: 200, easing: sineInOut, axis: 'y' }}
							class="_w-100pct _h-16 _pst-f _bt-0 _l-0 _zid-2 _bgcl-tpr _dp-f _jtfct-fe"
						>
							<span class="_pdr-6 _pdl-6 _bgcl-base-200 _tal-r _cl-primary _fs-1 _fs-2:sm"><i class="_mgr-4 fa-solid fa-timer"></i>{ format.datetime(filter.startDate * 1000) } to { format.datetime(filter.endDate * 1000) }</span>
						</div>
					{/if}
					<div class="_dp-f _fdrt-r _jtfct-spbtw _alit-fst _alit-ct:sm">
						<div class="_dp-f _fdrt-cl _fdrt-r:sm _alit-fst _alit-ct:sm _g-4">
							<button
								class="nm-button"
								disabled={ !(indexId && endpoint && filter.perPage) }
								onclick={ runQuery }
								class:is-loading={ loading }
							>
								<i class="_mgr-4 fa-solid fa-play"></i>
								Run
							</button>
							<div class="_dp-f _fdrt-r _alit-ct _g-4">
								<div class="nm-field">
									<div class="nm-input _h-9">
										<input
											placeholder="limit"
											type="number"
											bind:value={ perPageValue }
											class="_w-12"
										/>
									</div>
								</div>
								<span class="_tal-r _cl-content _fs-1 _fs-2:sm">per Page</span>
							</div>
						</div>
						{#if indexId && endpoint }
							<TimeFilter
								{ getLog } { perPageValue }
								bind:this={ timeFilter }
								bind:filter={ filter }
								bind:show={ show.customFilter }
							/>
						{/if}
					</div>
					<div class="nm-field">
						<div class="nm-textarea">
						<textarea
							rows="5"
							bind:value={ filter.query }
							disabled={ !(indexId && endpoint) }
						></textarea>
						</div>
					</div>
				</div>
				{#if indexId && endpoint}
					<div class="_mgt-6 _dp-f _fdrt-cl _g-4">
						<div
							class="_pd-2 _pdr-4 _pdl-4 _ffml-primary _cl-content _fs-2 _dp-f _fdrt-r _alit-bl _w-fct _g-4 _bdrd-3 transition-3"
							class:_bgcl-base-100={ !copyActive }
							class:_bgcl-base-300={ copyActive }
						>
							<span class="_ffml-primary _fw-600">API URL:</span>
							<div style="max-width: 40vw;" class="_wsp-nw _ovf-hd _tovf-els">{ endpoint }/api/v1/{ indexId }/search?{createQueryString()}</div>
							<i
								class="fa-regular fa-copy _cs-pt _opct-75-hover"
								onclick={ () => copy(`${endpoint}/api/v1/${indexId}/search?${createQueryString()}`) }
								aria-hidden="true"
							></i>
						</div>
						<span class="_ffml-primary _cl-content _opct-60 _fs-2">{ result.total.toLocaleString() } hits found in { result.elapsedTime } seconds</span>
					</div>
					{#if loading}
						<button class="_mgt-4 nm-button is-variant-ghost is-loading" aria-label="loading"></button>
					{:else}
						{#if result.list.length}
							<Pagination
								{ currentPage } { nextPage } { gotoPage }
							/>
						{/if}
						<div class="_dp-f _fdrt-cl _g-4">
							{#each result.list as item, idx}
								{@const identity = `${item['logger.name']}-${item.timestamp}`}
								{@const open = show.result.includes(identity)}
								<div
									class="_pdt-4 _dp-f _fdrt-r _alit-bl _g-4 _bdcl-base-400"
									class:_bdtw-1={ idx !== 0 }
								>
									<i
										class="fa-solid fa-angle-down _cs-pt _ussl-n transition-3"
										class:_tsf-rt-90={ !open }
										onclick={ () => { show.result = open ? show.result.filter(r => r !== identity) : [...show.result, identity] } }
										aria-hidden="true"
									></i>
									<div class="_dp-f _fdrt-cl _w-100pct">
										<div class="_dp-f _fdrt-cl _fdrt-r:sm _alit-bl _g-4 _w-100pct">
											<span
												class="_cl-content _cs-pt _ussl-n _wsp-nw _fs-1 _opct-75-hover"
												style="min-width: 132px; max-width: 132px;"
												onclick={ () => { show.result = open ? show.result.filter(r => r !== identity) : [...show.result, identity] } }
												aria-hidden="true"
											>
												<i class="_mgr-2 fa-regular fa-clock"></i>
												{ format.datetime(item.timestamp) }
											</span>
											{#if open}
												<pre
													class="line-numbers _fs-1 _w-100pct"
												><code class="language-js">{ JSON.stringify(item, null, 2) }</code></pre>
											{:else}
												<pre
													class="normal _fs-1 _w-100pct"
												><code class="language-js">{ JSON.stringify(item) }</code></pre>
											{/if}
										</div>
									</div>
								</div>
							{:else}
								<span class="_mgt-6 _mgbt-6px _ffml-primary _cl-content _opct-30 _fs-4 _tal-ct">No Data</span>
							{/each}
						</div>
						{#if result.list.length}
							<Pagination
								{ currentPage } { nextPage } { gotoPage }
							/>
						{/if}
					{/if}
				{/if}
			</div>
		</div>
	{/if}
</div>

<style lang="scss">
	.container {
		grid-template-columns: 1fr;
		gap: 1.5rem;

		@media (min-width: 48rem) {
			grid-template-columns: 2fr 5fr;
			gap: 1rem;
		}
	}
</style>
