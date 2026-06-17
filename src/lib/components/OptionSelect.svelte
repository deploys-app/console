<script lang="ts">
	import { untrack } from 'svelte'

	/**
	 * Searchable single/multi select over a fixed option list — the generic core
	 * behind the WAF country picker ({@link CountrySelect}) and the HTTP-method
	 * picker. The dropdown is filterable by an option's value/label (and optional
	 * code/name); the value stored is always the bare option `value`.
	 *
	 * Single mode binds `value` (one value). Multi mode binds `tags` (an array of
	 * values) and renders the chosen options as chips.
	 */

	interface Option {
		value: string
		label: string // chip + resting display text
		code?: string // optional mono prefix shown in the row
		name?: string // row text after the code (e.g. country name)
	}

	interface Props {
		options: Option[]
		multi?: boolean // multi-select (chips) vs single value
		value?: string // single mode — selected value
		tags?: string[] // multi mode — selected values
		id?: string // id for the inner input (label association)
		placeholder?: string
		emptyText?: string // shown when no option matches the query
		// offer the typed text as a new value when it isn't one of `options` (e.g.
		// an HTTP method outside the known set). Off for closed sets like country
		// codes.
		allowCustom?: boolean
		// notified with the committed value whenever an option (or custom value) is
		// picked.
		onchange?: (value: string) => void
		// single mode — don't rest on the pick: clear the field and keep the menu
		// open so the next value can be typed right away, turning the control into
		// an "add to a list" picker.
		resetOnSelect?: boolean
	}

	let {
		options,
		multi = false,
		value = $bindable(''),
		tags = $bindable([]),
		id,
		placeholder = 'Search',
		emptyText = 'No matches',
		allowCustom = false,
		onchange,
		resetOnSelect = false
	}: Props = $props()

	/** Resting/chip label for a stored value (falls back to the bare value). */
	function labelOf (v: string) {
		return options.find((o) => o.value === v)?.label ?? v
	}

	let open = $state(false)
	// Seed the resting text from the incoming selection (single mode only); reads
	// the initial prop value once, hence untrack.
	let query = $state(untrack(() => (multi ? '' : labelOf(value))))
	let activeIndex = $state(0)

	const listboxId = $derived(`${id ?? 'opt'}-listbox`)

	let inputEl = $state<HTMLInputElement | undefined>()
	let listEl = $state<HTMLDivElement | undefined>()

	// In single mode the resting input text is the selected label; treat it as an
	// empty query so opening the menu shows the whole list rather than filtering
	// to the one current pick. Once the user edits the text it filters normally.
	const effectiveQuery = $derived(
		!multi && query === labelOf(value) ? '' : query
	)

	const matches = $derived.by(() => {
		const q = effectiveQuery.trim().toLowerCase()
		return options.filter((o) => {
			if (multi && tags.includes(o.value)) return false
			if (!q) return true
			return o.value.toLowerCase().includes(q) ||
				o.label.toLowerCase().includes(q) ||
				(o.code?.toLowerCase().includes(q) ?? false) ||
				(o.name?.toLowerCase().includes(q) ?? false)
		})
	})

	// Keep the highlight in range as the filtered list changes.
	$effect(() => {
		if (activeIndex > matches.length - 1) activeIndex = matches.length > 0 ? 0 : -1
	})

	// Creatable: offer the trimmed query as a new value when it isn't already an
	// option or (multi) an existing tag. Empty when `allowCustom` is off.
	const customValue = $derived.by(() => {
		if (!allowCustom) return ''
		const v = effectiveQuery.trim()
		if (!v) return ''
		const lower = v.toLowerCase()
		if (options.some((o) => o.value.toLowerCase() === lower || o.label.toLowerCase() === lower)) return ''
		if (multi && tags.some((t) => t.toLowerCase() === lower)) return ''
		return v
	})

	// Single mode: keep the resting text in sync when `value` changes from outside
	// (the builder keys rows by index, so a row can be reused for a different
	// condition). Skip while the menu is open so it never clobbers live typing.
	$effect(() => {
		if (multi) return
		const label = labelOf(value)
		untrack(() => {
			if (!open && query !== label) query = label
		})
	})

	function commit (o: Option) {
		if (multi) {
			if (!tags.includes(o.value)) tags = [...tags, o.value]
			query = ''
			activeIndex = 0
			inputEl?.focus()
		} else if (resetOnSelect) {
			// Adder mode: surface the pick, then clear the field and keep the menu
			// open so the next value can be typed without reopening.
			query = ''
			activeIndex = 0
			inputEl?.focus()
		} else {
			value = o.value
			query = labelOf(o.value)
			close()
		}
		onchange?.(o.value)
	}

	// Commit the typed text as a brand-new value (creatable mode).
	function commitCustom () {
		const v = effectiveQuery.trim()
		if (!v) return
		if (multi) {
			if (!tags.includes(v)) tags = [...tags, v]
			query = ''
			activeIndex = 0
			inputEl?.focus()
		} else if (resetOnSelect) {
			query = ''
			activeIndex = 0
			inputEl?.focus()
		} else {
			value = v
			query = labelOf(v)
			close()
		}
		onchange?.(v)
	}

	function removeTag (i: number) {
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
		if (!multi) query = labelOf(value)
	}

	function onFocus () {
		openMenu()
		if (!multi) inputEl?.select()
	}

	function onInput () {
		open = true
		activeIndex = matches.length > 0 ? 0 : -1
	}

	function moveActive (dir: number) {
		if (matches.length === 0) return
		let i = activeIndex + dir
		if (i < 0) i = matches.length - 1
		if (i >= matches.length) i = 0
		activeIndex = i
	}

	function onKeydown (e: KeyboardEvent) {
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
			// While the menu is open, Enter belongs to the combobox — never let it
			// submit a surrounding form. Commit a highlighted option or the typed
			// custom value if there is one; otherwise just swallow it.
			if (open) {
				e.preventDefault()
				if (activeIndex >= 0 && matches[activeIndex]) commit(matches[activeIndex])
				else if (customValue) commitCustom()
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

	const optionId = (i: number) => `${id ?? 'opt'}-opt-${i}`

	function clickOutside (node: HTMLElement, handler: () => void): { destroy(): void } {
		function onDown (e: MouseEvent) {
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

<div class="os-box" use:clickOutside={close}>
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="os-control input" onclick={() => inputEl?.focus()}>
		{#if multi}
			{#each tags as tag, i (tag)}
				<span class="chip">
					<span class="chip-label">{labelOf(tag)}</span>
					<button type="button" class="chip-remove" aria-label={`Remove ${labelOf(tag)}`}
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
			class="os-input"
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
		<i class="fa-solid fa-chevron-down os-chevron" class:is-open={open}></i>
	</div>

	{#if open}
		<div bind:this={listEl} id={listboxId} class="os-menu" role="listbox" tabindex="-1">
			{#each matches as o, i (o.value)}
				<div
					id={optionId(i)}
					role="option"
					tabindex="-1"
					aria-selected={!multi && value === o.value}
					class="os-option"
					class:is-active={i === activeIndex}
					class:is-selected={!multi && value === o.value}
					onmouseenter={() => (activeIndex = i)}
					onmousedown={(e) => { e.preventDefault(); commit(o) }}>
					<span class="truncate">
						{#if o.code}<span class="os-code font-mono">{o.code}</span> {o.name ?? ''}{:else}{o.label}{/if}
					</span>
					{#if !multi && value === o.value}
						<i class="fa-solid fa-check os-check"></i>
					{/if}
				</div>
			{/each}
			{#if customValue}
				<div
					role="option"
					tabindex="-1"
					aria-selected="false"
					class="os-option os-custom"
					onmousedown={(e) => { e.preventDefault(); commitCustom() }}>
					<span class="truncate">Add “<span class="font-mono">{customValue}</span>”</span>
					<i class="fa-solid fa-plus os-add"></i>
				</div>
			{/if}
			{#if matches.length === 0 && !customValue}
				<div class="os-empty">{emptyText}</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.os-box {
		position: relative;
		width: 100%;
	}

	.os-control {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
		min-height: 2.5rem;
		padding: 0.375rem 0.5rem;
		cursor: text;
	}

	.os-input {
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

	.os-input::placeholder {
		color: hsl(var(--hsl-content) / 0.5);
	}

	.os-chevron {
		flex-shrink: 0;
		margin-left: auto;
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.6);
		transition: transform 0.15s ease;
	}

	.os-chevron.is-open {
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

	.os-menu {
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

	.os-option {
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

	.os-option.is-active {
		background: hsl(var(--hsl-primary) / 0.1);
	}

	.os-option.is-selected {
		font-weight: 600;
	}

	.os-code {
		color: hsl(var(--hsl-content) / 0.6);
	}

	.os-check {
		flex-shrink: 0;
		font-size: 0.75rem;
		color: hsl(var(--hsl-primary));
	}

	.os-custom {
		color: hsl(var(--hsl-content) / 0.8);
	}

	.os-add {
		flex-shrink: 0;
		font-size: 0.6875rem;
		color: hsl(var(--hsl-primary));
	}

	.os-empty {
		padding: 0.75rem 0.65rem;
		text-align: center;
		font-size: 0.875rem;
		color: hsl(var(--hsl-content) / 0.6);
	}
</style>
