<script>
	/** @type {string} */
	export let value

	let isHidden = true

	function toggle () {
		isHidden = !isHidden
	}
</script>

<span>
	<div on:click={toggle} on:keypress={toggle} tabindex="0" role="link">
		{#if isHidden}
			<i class="fa-solid fa-eye"></i>
		{:else}
			<i class="fa-solid fa-eye-slash"></i>
		{/if}
	</div>
	{#if isHidden}
		•••••••••••••••
	{:else}
		{value}
	{/if}
</span>

<style>
	span {
		display: inline-flex;
	}

	div {
		margin-right: 8px;
		cursor:       pointer;
	}
</style>
