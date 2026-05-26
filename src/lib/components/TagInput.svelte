<script>
	/**
	 * @typedef {Object} Props
	 * @property {string[]} tags        bindable list of committed chips
	 * @property {string} [placeholder] placeholder for the text input
	 * @property {string} [id]          id for the inner input (label association)
	 */

	/** @type {Props} */
	let { tags = $bindable([]), placeholder = '', id } = $props()

	let draft = $state('')

	/** @type {HTMLInputElement | undefined} */
	let inputEl = $state()

	// Commit the current draft as a chip: trim, ignore empties, de-dupe.
	function commit () {
		const v = draft.trim()
		draft = ''
		if (!v) return
		if (tags.includes(v)) return
		tags = [...tags, v]
	}

	/** @param {number} i */
	function remove (i) {
		tags = tags.filter((_, idx) => idx !== i)
		inputEl?.focus()
	}

	/** @param {KeyboardEvent} e */
	function onkeydown (e) {
		if (e.key === 'Enter') {
			e.preventDefault()
			commit()
		} else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
			// Backspace on an empty input removes the last chip.
			e.preventDefault()
			tags = tags.slice(0, -1)
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="tag-input input" onclick={() => inputEl?.focus()}>
	{#each tags as tag, i (tag)}
		<span class="chip">
			<span class="chip-label">{tag}</span>
			<button type="button" class="chip-remove" aria-label={`Remove ${tag}`} onclick={(e) => { e.stopPropagation(); remove(i) }}>
				<i class="fa-solid fa-xmark"></i>
			</button>
		</span>
	{/each}
	<input
		bind:this={inputEl}
		{id}
		class="chip-field"
		bind:value={draft}
		placeholder={tags.length === 0 ? placeholder : ''}
		{onkeydown}
		onblur={commit}>
</div>

<style>
	.tag-input {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.5rem;
		min-height: 2.5rem;
		cursor: text;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.125rem 0.25rem 0.125rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.8125rem;
		line-height: 1.4;
		background-color: hsl(var(--hsl-base-400) / 0.45);
		color: hsl(var(--hsl-content));
	}

	:root:not(.dark) .chip {
		background-color: hsl(var(--hsl-base-400) / 0.25);
	}

	.chip-label {
		white-space: nowrap;
	}

	.chip-remove {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.125rem;
		height: 1.125rem;
		border-radius: 9999px;
		font-size: 0.6875rem;
		color: hsl(var(--hsl-content) / 0.6);
		cursor: pointer;
		transition: background-color var(--timing-faster) ease, color var(--timing-faster) ease;
	}

	.chip-remove:hover {
		background-color: hsl(var(--hsl-content) / 0.12);
		color: hsl(var(--hsl-content));
	}

	.chip-field {
		flex: 1;
		min-width: 6rem;
		padding: 0.25rem 0.25rem;
		background: transparent;
		border: 0;
		outline: 0;
		color: inherit;
		font: inherit;
		font-size: 0.875rem;
	}
</style>
