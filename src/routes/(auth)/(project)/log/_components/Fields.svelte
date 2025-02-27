<script>
	import { slide } from 'svelte/transition'
	import { sineInOut } from 'svelte/easing'

	let { show = $bindable(), list } = $props()
</script>

<div class="_dp-f _fdrt-cl _g-6">
	<span
		class="_cl-dark _cs-pt _ussl-n _fw-600"
		onclick={ () => { show = !show } }
		aria-hidden="true"
	>
		Fields
	</span>
	{#if show}
		<div
			transition:slide={{ duration: 400, easing: sineInOut, axis: 'y' }}
			class="_dp-f _fdrt-cl _g-4"
		>
			{#each list as item}
				<div
					class="_dp-g"
					style="grid-template-columns: 100px 1fr;"
				>
					<div class="nm-badge _w-fct">{ item.type }</div>
					<span class="_wb-ba">{ item.name }</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
