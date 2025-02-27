<script>
	import { page } from '$app/state'
	import dayjs from 'dayjs'
	import * as format from '$lib/format'
	import clickAway from '$lib/use-action/clickAway'
	import { goto } from '$app/navigation'

	let { filter = $bindable(), show = $bindable(), perPageValue, getLog } = $props()
	let showCustom = $state(false)
	const form = $state({
		startDate: null,
		endDate: null
	})
	const durationList = {
		PT15MIN: {
			number: 15,
			type: 'minute',
			label: 'Last 15 min'
		},
		PT30MIN: {
			number: 30,
			type: 'minute',
			label: 'Last 30 min'
		},
		PT1D: {
			number: 1,
			type: 'day',
			label: 'Last 1 days'
		},
		PT7D: {
			number: 7,
			type: 'day',
			label: 'Last 7 days'
		},
		PT30D: {
			number: 30,
			type: 'day',
			label: 'Last 30 days'
		},
		PT3MO: {
			number: 3,
			type: 'month',
			label: 'Last 3 months'
		},
		PT1Y: {
			number: 1,
			type: 'year',
			label: 'Last year'
		}
	}

	/**
	 * @param { string } d
	 * */
	export function setFilter (d) {
		filter.duration = d
		filter.offset = 0
		filter.perPage = perPageValue

		if (filter.duration) {
			filter.startDate = format.unixDatetime(
				dayjs().subtract(durationList[filter.duration].number, durationList[filter.duration].type).format('YYYY-MM-DD HH:mm:ss')
			)
			filter.endDate = format.unixDatetime(
				dayjs().format('YYYY-MM-DD HH:mm:ss')
			)
			form.startDate = dayjs().subtract(durationList[filter.duration].number, durationList[filter.duration].type).format('YYYY-MM-DDTHH:mm:ss')
			form.endDate = dayjs().format('YYYY-MM-DD HH:mm:ss')
		}

		updateTimeFilterParam()
		getLog()
		show = false
		showCustom = false
	}

	function customFilter () {
		if (!(form.startDate && form.endDate)) {
			return
		}

		filter.perPage = perPageValue
		filter.offset = 0
		filter.startDate = format.unixDatetime(
			dayjs(form.startDate).format('YYYY-MM-DD HH:mm:ss')
		)
		filter.endDate = format.unixDatetime(
			dayjs(form.endDate).format('YYYY-MM-DD HH:mm:ss')
		)
		filter.duration = ''
		updateTimeFilterParam()
		getLog()
	}

	async function reset () {
		filter.duration = ''
		filter.startDate = null
		filter.endDate = null
		filter.offset = 0
		filter.perPage = perPageValue
		show = false

		const currentUrl = page.url
		const urlSearchParams = new URLSearchParams(currentUrl.search)
		urlSearchParams.delete('duration')
		urlSearchParams.delete('startDate')
		urlSearchParams.delete('endDate')
		urlSearchParams.set('query', filter.query)
		const newUrl = `${currentUrl.origin}${currentUrl.pathname}?${urlSearchParams.toString()}`
		await goto(newUrl, { replaceState: true })
		getLog()
	}

	async function updateTimeFilterParam () {
		const currentUrl = page.url
		const urlSearchParams = new URLSearchParams(currentUrl.search)

		urlSearchParams.set('duration', filter.duration)
		urlSearchParams.set('startDate', filter.startDate)
		urlSearchParams.set('endDate', filter.endDate)
		urlSearchParams.set('query', filter.query)
		const newUrl = `${currentUrl.origin}${currentUrl.pathname}?${urlSearchParams.toString()}`
		await goto(newUrl, { replaceState: true })
	}
</script>

<label class="nm-button is-variant-tertiary" for="time-filter">
	<i class="_mgr-4 fa-regular fa-clock"></i>
	{#if filter.duration.length}
		{ durationList[filter.duration].label || '-' }
	{:else if filter.startDate && filter.endDate}
		{ format.datetime(filter.startDate * 1000) } to <br class="_dp-f _dp-n:sm">{ format.datetime(filter.endDate * 1000) }
	{:else}
		No date range
	{/if}
</label>
<input
	class="nm-modal-state"
	id="time-filter"
	type="checkbox"
/>
<div
	class="nm-modal _pd-6"
	onclick={ () => { show = false } }
	aria-hidden="true"
>
	<div
		class="nm-modal-panel _ovf-at"
		use:clickAway
		onclickAway={ () => { show = false } }
	>
		<label class="nm-modal-close" for="time-filter">✕</label>
		<h3 class="_mgbt-8">Select a period</h3>
		<div
			class="time-filter-container _dp-g"
			class:show={ showCustom }
		>
			<div
				class="_fdrt-cl _g-4 _dp-f:sm"
				class:_dp-f={ !show }
				class:_dp-n={ show }
			>
				<label
					for="time-filter"
					class="nm-button is-variant-tertiary"
					onclick={ () => { setFilter('PT15MIN') }}
					aria-hidden="true"
				>
					Last 15 min
				</label>
				<label
					for="time-filter"
					class="nm-button is-variant-tertiary"
					onclick={ () => { setFilter('PT30MIN') }}
					aria-hidden="true"
				>
					Last 30 min
				</label>
				<label
					for="time-filter"
					class="nm-button is-variant-tertiary"
					onclick={ () => { setFilter('PT1D') }}
					aria-hidden="true"
				>
					Last 1 days
				</label>
				<label
					for="time-filter"
					class="nm-button is-variant-tertiary"
					onclick={ () => { setFilter('PT7D') }}
					aria-hidden="true"
				>
					Last 7 days
				</label>
				<label
					for="time-filter"
					class="nm-button is-variant-tertiary"
					onclick={ () => { setFilter('PT30D') }}
					aria-hidden="true"
				>
					Last 30 days
				</label>
				<label
					for="time-filter"
					class="nm-button is-variant-tertiary"
					onclick={ () => { setFilter('PT3MO') }}
					aria-hidden="true"
				>
					Last 3 months
				</label>
				<label
					for="time-filter"
					class="nm-button is-variant-tertiary"
					onclick={ () => { setFilter('PT1Y') }}
					aria-hidden="true"
				>
					Last year
				</label>
				<label
					for="time-filter"
					class="nm-button is-variant-tertiary"
					onclick={ reset }
					aria-hidden="true"
				>
					Reset
				</label>
				<button
					type="button"
					class="nm-button"
					class:is-variant-tertiary={ !showCustom }
					class:is-variant-accent={ showCustom }
					onclick={ () => { showCustom = true } }
				>
					<i class="_mgr-4 fa-regular fa-calendar"></i> Custom
				</button>
			</div>
			{#if showCustom}
				<div class="_dp-f _fdrt-cl _g-6 _jtfct-spbtw">
					<div class="_dp-f _fdrt-cl _g-4">
						<div class="nm-field">
							<label for="input-start-date">Start Date</label>
							<div class="nm-input">
								<input
									id="input-start-date"
									type="datetime-local"
									bind:value={ form.startDate }
								/>
							</div>
						</div>
						<div class="nm-field">
							<label for="input-end-date">End Date</label>
							<div class="nm-input">
								<input
									id="input-end-date"
									type="datetime-local"
									bind:value={ form.endDate }
								/>
							</div>
						</div>
					</div>
					<div class="_dp-f _fdrt-cl _g-4">
						<label
							for="time-filter"
							class="nm-button is-variant-tertiary"
							onclick={ reset }
							aria-hidden="true"
						>
							Reset
						</label>
						<label
							class="nm-button"
							class:_opct-50={ !(form.startDate && form.endDate) }
							class:_cs-nal={ !(form.startDate && form.endDate) }
							for="time-filter"
							onclick={ customFilter }
							aria-hidden="true"
						>
							Apply
						</label>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
	.time-filter-container {
		grid-template-columns: 1fr;
		gap: 3rem;

		@media (min-width: 48rem) {
			grid-template-columns: 1fr;
			gap: 1rem;

			&.show {
				grid-template-columns: 1fr 2fr;
			}
		}
	}
</style>
