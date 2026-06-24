<script lang="ts">
	type Tone = 'positive' | 'warning' | 'negative' | 'muted'

	interface Option {
		value?: string | number
		label?: string
		disabled?: boolean
		separator?: boolean
		dot?: Tone // leading status dot, colored by tone
		badge?: string // trailing pill text
		badgeTone?: Tone // pill color (defaults to muted)
	}

	interface Props {
		value?: string | number
		options: Option[]
		placeholder?: string
		required?: boolean
		disabled?: boolean
		editable?: boolean // free-text combobox mode: a typed value is allowed alongside picking an option
		id?: string
		name?: string
		onchange?: (value: string | number) => void
		resetOnSelect?: boolean
		class?: string
	}

	let {
		value = $bindable(''),
		options,
		placeholder = '',
		required = false,
		disabled = false,
		editable = false,
		id,
		name,
		onchange,
		resetOnSelect = false,
		class: className = ''
	}: Props = $props()

	const uid = $props.id()
	const listboxId = `${uid}-listbox`
	const optionId = (i: number) => `${uid}-opt-${i}`

	let open = $state(false)
	let activeIndex = $state(-1)

	// Safari/iOS ignore autocomplete="off" and contact-autofill an editable text
	// field. Keeping it readonly until focus means the field isn't an autofill
	// target when the browser evaluates it; we drop readonly on focus so typing
	// works, and re-arm on blur for the next focus.
	let autofillGuard = $state(true)

	let boxEl = $state<HTMLDivElement | undefined>()
	let triggerEl = $state<HTMLButtonElement | undefined>()
	let inputEl = $state<HTMLInputElement | undefined>()
	let listEl = $state<HTMLDivElement | undefined>()

	// The menu is positioned with `position: fixed` (anchored to the trigger via
	// getBoundingClientRect) so it floats above any clipping ancestor — e.g. a
	// modal panel with `overflow-y: auto` would otherwise trap and scroll it.
	let menuStyle = $state('')

	function positionMenu () {
		if (!boxEl) return
		const r = boxEl.getBoundingClientRect()
		const gap = 6 // matches the old `top: calc(100% + 0.35rem)` offset
		const margin = 8 // breathing room from the viewport edge
		const maxH = 288 // 18rem cap, same as the CSS max-height
		const below = window.innerHeight - r.bottom - gap - margin
		const above = r.top - gap - margin
		// Flip above only when there's too little room below and more room above.
		const placeAbove = below < 160 && above > below
		const avail = Math.max(120, Math.min(maxH, placeAbove ? above : below))
		const vertical = placeAbove
			? `bottom: ${window.innerHeight - r.top + gap}px`
			: `top: ${r.bottom + gap}px`
		menuStyle = `position: fixed; left: ${r.left}px; width: ${r.width}px; max-height: ${avail}px; ${vertical};`
	}

	// Editable mode filters the visible options by case-insensitive substring of
	// the typed value. Non-editable mode always shows the full list.
	const visibleOptions = $derived(
		editable && value !== '' && value != null
			? options.filter(
				(o) => o.separator || (o.label ?? '').toLowerCase().includes(String(value).toLowerCase())
			)
			: options
	)

	let typeahead = ''
	let typeaheadTimer: ReturnType<typeof setTimeout> | undefined

	const selectedOption = $derived(
		options.find((o) => !o.separator && (o.value ?? '') === value)
	)
	const displayLabel = $derived(selectedOption ? selectedOption.label : placeholder)
	const hasSelection = $derived(!!selectedOption)

	function isSelectable (i: number) {
		const o = visibleOptions[i]
		return !!o && !o.separator && !o.disabled
	}

	function commit (opt: Option) {
		if (opt.separator || opt.disabled) return
		const v = opt.value ?? ''
		value = v
		close()
		if (editable) inputEl?.focus()
		else triggerEl?.focus()
		onchange?.(v)
		if (resetOnSelect) value = ''
	}

	function openMenu () {
		if (disabled) return
		open = true
		const sel = visibleOptions.findIndex((o) => !o.separator && (o.value ?? '') === value)
		activeIndex = sel >= 0 && isSelectable(sel) ? sel : firstSelectable()
	}

	function close () {
		open = false
		activeIndex = -1
	}

	function firstSelectable () {
		for (let i = 0; i < visibleOptions.length; i++) if (isSelectable(i)) return i
		return -1
	}

	function lastSelectable () {
		for (let i = visibleOptions.length - 1; i >= 0; i--) if (isSelectable(i)) return i
		return -1
	}

	function moveActive (dir: number) {
		let i = activeIndex
		for (let step = 0; step < visibleOptions.length; step++) {
			i += dir
			if (i < 0) i = visibleOptions.length - 1
			if (i >= visibleOptions.length) i = 0
			if (isSelectable(i)) {
				activeIndex = i
				return
			}
		}
	}

	function typeaheadSearch (char: string) {
		clearTimeout(typeaheadTimer)
		typeahead += char.toLowerCase()
		typeaheadTimer = setTimeout(() => { typeahead = '' }, 500)
		const match = visibleOptions.findIndex(
			(o, i) => isSelectable(i) && (o.label ?? '').toLowerCase().startsWith(typeahead)
		)
		if (match >= 0) activeIndex = match
	}

	function onKeydown (e: KeyboardEvent) {
		if (disabled) return
		switch (e.key) {
		case 'ArrowDown':
			e.preventDefault()
			open ? moveActive(1) : openMenu()
			break
		case 'ArrowUp':
			e.preventDefault()
			open ? moveActive(-1) : openMenu()
			break
		case 'Home':
			if (open) { e.preventDefault(); activeIndex = firstSelectable() }
			break
		case 'End':
			if (open) { e.preventDefault(); activeIndex = lastSelectable() }
			break
		case 'Enter':
			e.preventDefault()
			if (open && activeIndex >= 0) commit(visibleOptions[activeIndex])
			else openMenu()
			break
		case ' ':
			e.preventDefault()
			if (open && activeIndex >= 0) commit(visibleOptions[activeIndex])
			else openMenu()
			break
		case 'Escape':
			if (open) { e.preventDefault(); close() }
			break
		case 'Tab':
			if (open) close()
			break
		default:
			if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
				if (!open) openMenu()
				typeaheadSearch(e.key)
			}
		}
	}

	// Keydown handler for the editable (free-text) trigger input. Printable keys
	// fall through to edit the input; only navigation/commit keys are handled.
	function onInputKeydown (e: KeyboardEvent) {
		if (disabled) return
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
			// Enter inside the combobox must never submit the surrounding form:
			// commit the highlighted option if any, otherwise just close the menu
			// and keep the typed text.
			e.preventDefault()
			if (open && activeIndex >= 0) {
				commit(visibleOptions[activeIndex])
			} else if (open) {
				close()
			}
			break
		case 'Escape':
			if (open) { e.preventDefault(); close() }
			break
		case 'Tab':
			if (open) close()
			break
		}
	}

	// While typing in editable mode keep the menu open and reset the active
	// option to the first match of the freshly filtered list.
	function onInput () {
		if (disabled) return
		if (!open) open = true
		activeIndex = firstSelectable()
		onchange?.(value)
	}

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

	// While the menu is open, keep it pinned to the trigger as the page (or an
	// ancestor such as a scrollable modal panel) scrolls or the window resizes.
	$effect(() => {
		if (!open) return
		positionMenu()
		const reposition = () => positionMenu()
		window.addEventListener('scroll', reposition, true)
		window.addEventListener('resize', reposition)
		return () => {
			window.removeEventListener('scroll', reposition, true)
			window.removeEventListener('resize', reposition)
		}
	})
</script>

<div bind:this={boxEl} class="select-box {className}" class:is-disabled={disabled} use:clickOutside={close}>
	{#if editable}
		<div class="select-trigger select-trigger-editable" class:is-open={open}>
			<!-- A combobox, not a real text field — suppress browser and
			     password-manager autofill (1Password / LastPass / Bitwarden /
			     Dashlane). Safari/iOS ignore autocomplete="off", so the input is
			     also kept readonly until focus (see autofillGuard). -->
			<input
				bind:this={inputEl}
				bind:value
				{id}
				type="text"
				class="select-input"
				role="combobox"
				autocomplete="off"
				data-1p-ignore
				data-lpignore="true"
				data-bwignore
				data-form-type="other"
				readonly={autofillGuard}
				aria-autocomplete="list"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={listboxId}
				aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
				{placeholder}
				{disabled}
				onfocus={() => { autofillGuard = false }}
				onblur={() => { autofillGuard = true }}
				oninput={onInput}
				onkeydown={onInputKeydown}
				onclick={openMenu}>
			<!-- Decorative; the input above handles keyboard interaction. -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<i class="fa-solid fa-chevron-down select-chevron" class:is-open={open}
				onmousedown={(e) => { e.preventDefault(); open ? close() : openMenu(); inputEl?.focus() }}></i>
		</div>
	{:else}
		<button
			bind:this={triggerEl}
			{id}
			type="button"
			class="select-trigger"
			role="combobox"
			aria-haspopup="listbox"
			aria-expanded={open}
			aria-controls={listboxId}
			aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
			{disabled}
			onclick={() => (open ? close() : openMenu())}
			onkeydown={onKeydown}>
			<span class="select-value" class:is-placeholder={!hasSelection}>
				{#if selectedOption?.dot}
					<span class="select-dot" data-tone={selectedOption.dot}></span>
				{/if}
				<span class="truncate">{displayLabel}</span>
				{#if selectedOption?.badge}
					<span class="select-badge" data-tone={selectedOption.badgeTone ?? 'muted'}>{selectedOption.badge}</span>
				{/if}
			</span>
			<i class="fa-solid fa-chevron-down select-chevron" class:is-open={open}></i>
		</button>
	{/if}

	{#if open}
		<div bind:this={listEl} id={listboxId} class="select-menu" role="listbox" tabindex="-1" style={menuStyle}>
			{#each visibleOptions as opt, i (i)}
				{#if opt.separator}
					<div class="select-sep" role="separator"></div>
				{:else}
					<!-- Keyboard handling lives on the combobox trigger via aria-activedescendant. -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div
						id={optionId(i)}
						role="option"
						tabindex="-1"
						aria-selected={(opt.value ?? '') === value}
						aria-disabled={opt.disabled || undefined}
						class="select-option"
						class:is-active={i === activeIndex}
						class:is-selected={(opt.value ?? '') === value}
						class:is-disabled={opt.disabled}
						onmouseenter={() => { if (isSelectable(i)) activeIndex = i }}
						onclick={() => commit(opt)}>
						{#if opt.dot}
							<span class="select-dot" data-tone={opt.dot}></span>
						{/if}
						<span class="truncate">{opt.label}</span>
						{#if opt.badge}
							<span class="select-badge" data-tone={opt.badgeTone ?? 'muted'}>{opt.badge}</span>
						{/if}
						{#if (opt.value ?? '') === value}
							<i class="fa-solid fa-check select-check"></i>
						{/if}
					</div>
				{/if}
			{:else}
				<div class="select-empty">No options</div>
			{/each}
		</div>
	{/if}

	{#if !editable}
		<!-- Hidden mirror keeps native form constraint validation (`required`) working. -->
		<select
			class="select-validity"
			bind:value
			{name}
			{required}
			{disabled}
			tabindex="-1"
			aria-hidden="true">
			{#if placeholder}<option value="">{placeholder}</option>{/if}
			{#each options as opt, i (i)}
				{#if !opt.separator}<option value={opt.value ?? ''}>{opt.label}</option>{/if}
			{/each}
		</select>
	{:else}
		<!-- Editable mode allows free-text values, so a fixed-option mirror would
			 wrongly constrain validity. Use a plain hidden input instead. -->
		<input type="hidden" {name} {value}>
	{/if}
</div>

<style>
	.select-box {
		position: relative;
		width: 100%;
	}

	.select-trigger {
		appearance: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		width: 100%;
		min-height: 2.5rem;
		padding: 0.5rem 0.75rem;
		font: inherit;
		font-size: 0.875rem;
		text-align: left;
		color: inherit;
		cursor: pointer;
		background-color: hsl(var(--hsl-base-400) / 0.2);
		border: 1px solid hsl(var(--hsl-base-400) / 0.3);
		border-radius: var(--radius-md);
		transition: border-color var(--timing-faster) ease,
			box-shadow var(--timing-faster) ease,
			background-color var(--timing-faster) ease;
	}

	:root:not(.dark) .select-trigger {
		border-color: hsl(var(--hsl-line));
		background-color: hsl(var(--hsl-base-100));
	}

	.select-trigger:hover:not(:disabled) {
		border-color: hsl(var(--hsl-primary) / 0.45);
	}

	.select-trigger:focus-visible,
	.select-box:focus-within .select-trigger {
		outline: 0;
		border-color: hsl(var(--hsl-primary));
		box-shadow: 0 0 0 3px hsl(var(--hsl-primary) / 0.16);
	}

	.select-box.is-disabled .select-trigger,
	.select-trigger:disabled {
		cursor: not-allowed;
		background-color: hsl(var(--hsl-content) / 0.05);
		color: hsl(var(--hsl-content) / 0.6);
	}

	/* Editable mode: the wrapper carries the trigger look; the input inside is
	 * transparent/borderless so the closed control matches a normal dropdown. */
	.select-trigger-editable {
		cursor: text;
	}

	.select-trigger-editable:hover {
		border-color: hsl(var(--hsl-primary) / 0.45);
	}

	.select-trigger-editable:focus-within {
		outline: 0;
		border-color: hsl(var(--hsl-primary));
		box-shadow: 0 0 0 3px hsl(var(--hsl-primary) / 0.16);
	}

	.select-input {
		flex: 1;
		min-width: 0;
		appearance: none;
		padding: 0;
		margin: 0;
		border: 0;
		background: transparent;
		font: inherit;
		font-size: 0.875rem;
		color: inherit;
		outline: 0;
	}

	.select-input::placeholder {
		color: hsl(var(--hsl-content) / 0.5);
	}

	.select-input:disabled {
		cursor: not-allowed;
	}

	.select-trigger-editable .select-chevron {
		cursor: pointer;
	}

	.select-value {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.select-value .truncate,
	.select-option .truncate {
		flex: 1;
		min-width: 0;
	}

	.select-dot {
		flex-shrink: 0;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		background: hsl(var(--hsl-content) / 0.35);
	}

	.select-dot[data-tone='positive'] { background: hsl(var(--hsl-positive)); }
	.select-dot[data-tone='warning'] { background: hsl(var(--hsl-warning)); }
	.select-dot[data-tone='negative'] { background: hsl(var(--hsl-negative)); }

	.select-badge {
		flex-shrink: 0;
		padding: 0.05rem 0.4rem;
		border-radius: 9999px;
		font-size: 0.7rem;
		font-weight: 600;
		line-height: 1.25;
		letter-spacing: 0.01em;
		color: hsl(var(--hsl-content) / 0.7);
		background: hsl(var(--hsl-content) / 0.1);
	}

	.select-badge[data-tone='warning'] {
		color: hsl(var(--hsl-warning));
		background: hsl(var(--hsl-warning) / 0.14);
	}

	.select-badge[data-tone='positive'] {
		color: hsl(var(--hsl-positive));
		background: hsl(var(--hsl-positive) / 0.14);
	}

	.select-badge[data-tone='negative'] {
		color: hsl(var(--hsl-negative));
		background: hsl(var(--hsl-negative) / 0.14);
	}

	.select-value.is-placeholder {
		color: hsl(var(--hsl-content) / 0.5);
	}

	.select-chevron {
		flex-shrink: 0;
		font-size: 0.75rem;
		color: hsl(var(--hsl-content) / 0.6);
		transition: transform 0.15s ease;
	}

	.select-chevron.is-open {
		transform: rotate(180deg);
	}

	.select-menu {
		/* Positioned as `position: fixed` via an inline style (see positionMenu)
		 * so the menu floats above clipping ancestors like a scrollable modal
		 * panel. z-index sits above the modal layer (.modal is z-index 50). */
		z-index: 100;
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

	.select-option {
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

	.select-option.is-active {
		background: hsl(var(--hsl-primary) / 0.1);
	}

	.select-option.is-selected {
		font-weight: 600;
	}

	.select-option.is-disabled {
		color: hsl(var(--hsl-content) / 0.4);
		cursor: not-allowed;
	}

	.select-check {
		flex-shrink: 0;
		font-size: 0.75rem;
		color: hsl(var(--hsl-primary));
	}

	.select-sep {
		height: 1px;
		margin: 0.25rem 0.4rem;
		background: hsl(var(--hsl-line) / 0.7);
	}

	.select-empty {
		padding: 0.75rem 0.65rem;
		text-align: center;
		font-size: 0.875rem;
		color: hsl(var(--hsl-content) / 0.6);
	}

	/* Visually hidden but still focusable so native constraint validation
	 * (the `required` bubble) anchors to the control's position. */
	.select-validity {
		position: absolute;
		left: 0;
		bottom: 0;
		width: 100%;
		height: 0;
		padding: 0;
		margin: 0;
		border: 0;
		opacity: 0;
		pointer-events: none;
	}
</style>
