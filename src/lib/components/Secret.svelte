<script lang="ts">

	interface Props {
		value: string
		show?: boolean
	}

	const { value, show = false }: Props = $props()

	let isHidden = $derived(!show)

	function toggle () {
		isHidden = !isHidden
	}
</script>

<span>
	<div onclick={toggle} onkeypress={toggle} tabindex="0" role="link">
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
