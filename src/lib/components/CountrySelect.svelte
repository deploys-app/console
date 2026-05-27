<script>
	import { untrack } from 'svelte'
	import { countries, countryLabel } from '$lib/waf/countries'

	/**
	 * Searchable country picker. The dropdown lists every country as
	 * `"CODE — Name"` and is filterable by either the ISO code or the name; the
	 * value stored is always the bare ISO alpha-2 code.
	 *
	 * Single mode binds `value` (one code). Multi mode binds `tags` (an array of
	 * codes) and renders the chosen countries as chips.
	 *
	 * @typedef {Object} Props
	 * @property {boolean} [multi]      multi-select (chips) vs single value
	 * @property {string} [value]       single mode — selected code
	 * @property {string[]} [tags]      multi mode — selected codes
	 * @property {string} [id]          id for the inner input (label association)
	 * @property {string} [placeholder]
	 */

	/** @type {Props} */
	let {
		multi = false,
		value = $bindable(''),
		tags = $bindable([]),
		id,
		placeholder = 'Search country or code'
	} = $props()

	let open = $state(false)
	// Seed the resting text from the incoming selection (single mode only); reads
	// the initial prop value once, hence untrack.
	let query = $state(untrack(() => (multi ? '' : countryLabel(value))))
	let activeIndex = $state(0)

	const listboxId = $derived(`${id ?? 'country'}-listbox`)

	/** @type {HTMLInputElement | undefined} */
	let inputEl = $state()
	/** @type {HTMLDivElement | undefined} */
	let listEl = $state()

	// In single mode the resting input text is the selected label; treat it as an
	// empty query so opening the menu shows the whole list rather than filtering
	// to the one current pick. Once the user edits the text it filters normally.
	const effectiveQuery = $derived(
		!multi && query === countryLabel(value) ? '' : query
	)

	const matches = $derived.by(() => {
		const q = effectiveQuery.trim().toLowerCase()
		return countries.filter((c) => {
			if (multi && tags.includes(c.code)) return false
			if (!q) return true
			return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
		})
	})

	// Keep the highlight in range as the filtered list changes.
	$effect(() => {
		if (activeIndex > matches.length - 1) activeIndex = matches.length > 0 ? 0 : -1
	})

	// Single mode: keep the resting text in sync when `value` changes from outside
	// (the builder keys rows by index, so a row can be reused for a different
	// condition). Skip while the menu is open so it never clobbers live typing.
	$effect(() => {
		if (multi) return
		const label = countryLabel(value)
		untrack(() => {
			if (!open && query !== label) query = label
		})
	})

	/** @param {import('$lib/waf/countries').Country} c */
	function commit (c) {
		if (multi) {
			if (!tags.includes(c.code)) tags = [...tags, c.code]
			query = ''
			activeIndex = 0
			inputEl?.focus()
		} else {
			value = c.code
			query = countryLabel(c.code)
			close()
		}
	}

	/** @param {number} i */
	function removeTag (i) {
		tags = tags.filter((_, idx) => idx !== i)
		inputEl?.focus()
	}

	function openMenu () {
		open = true
		activeIndex = matches.length > 0 ? 0 : -1
	}

	function close () {
		open = false
		// Single mode: drop any uncommitted typing and restore the selected label
		// so the control never shows orphaned search text.
		if (!multi) query = countryLabel(value)
	}

	function onFocus () {
		openMenu()
		if (!multi) inputEl?.select()
	}

	function onInput () {
		open = true
		activeIndex = matches.length > 0 ? 0 : -1
	}

	/** @param {number} dir */
	function moveActive (dir) {
		if (matches.length === 0) return
		let i = activeIndex + dir
		if (i < 0) i = matches.length - 1
		if (i >= matches.length) i = 0
		activeIndex = i
	}

	/** @param {KeyboardEvent} e */
	function onKeydown (e) {
		switch (e.key) {
		case 'ArrowDown':
			e.preventDefault()
			open ? moveActive(1) : openMenu()
			break
		case 'ArrowUp':
			e.preventDefault()
			open ? moveActive(-1) : openMenu()
			break
		case 'Enter':
			if (open && activeIndex >= 0 && matches[activeIndex]) {
				e.preventDefault()
				commit(matches[activeIndex])
			}
			break
		case 'Escape':
			if (open) { e.preventDefault(); close() }
			break
		case 'Tab':
			if (open) close()
			break
		case 'Backspace':
			if (multi && query === '' && tags.length > 0) {
				e.preventDefault()
				tags = tags.slice(0, -1)
			}
			break
		}
	}

	const optionId = (/** @type {number} */ i) => `${id ?? 'country'}-opt-${i}`

	/** @type {(node: HTMLElement, handler: () => void) => { destroy(): void }} */
	function clickOutside (node, handler) {
		/** @param {MouseEvent} e */
		function onDown (e) {
			if (e.target instanceof Node && !node.contains(e.target)) handler()
		}
		document.addEventListener('mousedown', onDown)
		return {
			destroy () { document.removeEventListener('mousedown', onDown) }
		}
	}

	// Keep the active option scrolled into view while navigating by keyboard.
	$effect(() => {
		if (!open || activeIndex < 0 || !listEl) return
		const el = listEl.querySelector(`#${CSS.escape(optionId(activeIndex))}`)
		if (el instanceof HTMLElement) el.scrollIntoView({ block: 'nearest' })
	})
</script>

<div class="cs-box" use:clickOutside={close}>
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="cs-control input" onclick={() => inputEl?.focus()}>
		{#if multi}
			{#each tags as code, i (code)}
				<span class="chip">
					<span class="chip-label">{countryLabel(code)}</span>
					<button type="button" class="chip-remove" aria-label={`Remove ${countryLabel(code)}`}
						onclick={(e) => { e.stopPropagation(); removeTag(i) }}>
						<i class="fa-solid fa-xmark"></i>
					</button>
				</span>
			{/each}
		{/if}
		<input
			bind:this={inputEl}
			bind:value={query}
			{id}
			class="cs-input"
			type="text"
			role="combobox"
			autocomplete="off"
			aria-autocomplete="list"
			aria-expanded={open}
			aria-controls={listboxId}
			aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
			placeholder={multi && tags.length > 0 ? '' : placeholder}
			onfocus={onFocus}
			oninput={onInput}
			onkeydown={onKeydown}>
		<i class="fa-solid fa-chevron-down cs-chevron" class:is-open={open}></i>
	</div>

	{#if open}
		<div bind:this={listEl} id={listboxId} class="cs-menu" role="listbox" tabindex="-1">
			{#each matches as c, i (c.code)}
				<div
					id={optionId(i)}
					role="option"
					tabindex="-1"
					aria-selected={!multi && value === c.code}
					class="cs-option"
					class:is-active={i === activeIndex}
					class:is-selected={!multi && value === c.code}
					onmouseenter={() => (activeIndex = i)}
					onmousedown={(e) => { e.preventDefault(); commit(c) }}>
					<span class="truncate"><span class="cs-code font-mono">{c.code}</span> {c.name}</span>
					{#if !multi && value === c.code}
						<i class="fa-solid fa-check cs-check"></i>
					{/if}
				</div>
			{:else}
				<div class="cs-empty">No matching country</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.cs-box {
		position: relative;
		width: 100%;
	}

	.cs-control {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
		min-height: 2.5rem;
		padding: 0.375rem 0.5rem;
		cursor: text;
	}

	.cs-input {
		flex: 1;
		min-width: 6rem;
		padding: 0.25rem;
		background: transparent;
		border: 0;
		outline: 0;
		color: inherit;
		font: inherit;
		font-size: 0.875rem;
	}

	.cs-input::placeholder {
		color: hsl(var(--hsl-content) / 0.5);
	}

	.cs-chevron {
		flex-shrink: 0;
		margin-left: auto;
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.6);
		transition: transform 0.15s ease;
	}

	.cs-chevron.is-open {
		transform: rotate(180deg);
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

	.cs-menu {
		position: absolute;
		top: calc(100% + 0.35rem);
		left: 0;
		z-index: 20;
		width: 100%;
		max-height: 18rem;
		overflow-y: auto;
		padding: 0.25rem;
		background: hsl(var(--hsl-base-300));
		border: 1px solid hsl(var(--hsl-line));
		border-radius: 0.625rem;
		box-shadow:
			0 4px 12px hsl(220 20% 10% / 0.12),
			0 12px 32px hsl(220 20% 10% / 0.18);
	}

	.cs-option {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.65rem;
		padding: 0.5rem 0.65rem;
		border-radius: 0.4rem;
		font-size: 0.875rem;
		cursor: pointer;
		color: hsl(var(--hsl-content));
	}

	.cs-option.is-active {
		background: hsl(var(--hsl-primary) / 0.1);
	}

	.cs-option.is-selected {
		font-weight: 600;
	}

	.cs-code {
		color: hsl(var(--hsl-content) / 0.6);
	}

	.cs-check {
		flex-shrink: 0;
		font-size: 0.75rem;
		color: hsl(var(--hsl-primary));
	}

	.cs-empty {
		padding: 0.75rem 0.65rem;
		text-align: center;
		font-size: 0.875rem;
		color: hsl(var(--hsl-content) / 0.6);
	}
</style>
