<script>
	/**
	 * @typedef {Object} Option
	 * @property {string | number} [value]
	 * @property {string} [label]
	 * @property {boolean} [disabled]
	 * @property {boolean} [separator]
	 */

	/**
	 * @typedef {Object} Props
	 * @property {string | number} [value]
	 * @property {Option[]} options
	 * @property {string} [placeholder]
	 * @property {boolean} [required]
	 * @property {boolean} [disabled]
	 * @property {boolean} [editable] free-text combobox mode: a typed value is allowed alongside picking an option
	 * @property {string} [id]
	 * @property {string} [name]
	 * @property {(value: string | number) => void} [onchange]
	 * @property {boolean} [resetOnSelect]
	 * @property {string} [class]
	 */

	/** @type {Props} */
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
	} = $props()

	const uid = $props.id()
	const listboxId = `${uid}-listbox`
	const optionId = (/** @type {number} */ i) => `${uid}-opt-${i}`

	let open = $state(false)
	let activeIndex = $state(-1)

	/** @type {HTMLButtonElement | undefined} */
	let triggerEl = $state()
	/** @type {HTMLInputElement | undefined} */
	let inputEl = $state()
	/** @type {HTMLDivElement | undefined} */
	let listEl = $state()

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
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let typeaheadTimer

	const selectedOption = $derived(
		options.find((o) => !o.separator && (o.value ?? '') === value)
	)
	const displayLabel = $derived(selectedOption ? selectedOption.label : placeholder)
	const hasSelection = $derived(!!selectedOption)

	/** @param {number} i */
	function isSelectable (i) {
		const o = visibleOptions[i]
		return !!o && !o.separator && !o.disabled
	}

	/** @param {Option} opt */
	function commit (opt) {
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

	/** @param {number} dir */
	function moveActive (dir) {
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

	/** @param {string} char */
	function typeaheadSearch (char) {
		clearTimeout(typeaheadTimer)
		typeahead += char.toLowerCase()
		typeaheadTimer = setTimeout(() => { typeahead = '' }, 500)
		const match = visibleOptions.findIndex(
			(o, i) => isSelectable(i) && (o.label ?? '').toLowerCase().startsWith(typeahead)
		)
		if (match >= 0) activeIndex = match
	}

	/** @param {KeyboardEvent} e */
	function onKeydown (e) {
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
	/** @param {KeyboardEvent} e */
	function onInputKeydown (e) {
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
			// Commit the active option if one is highlighted; otherwise keep the
			// typed text as-is and just close the menu.
			if (open && activeIndex >= 0) {
				e.preventDefault()
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

<div class="select-box {className}" class:is-disabled={disabled} use:clickOutside={close}>
	{#if editable}
		<div class="select-trigger select-trigger-editable" class:is-open={open}>
			<!-- A combobox, not a real text field — suppress browser and
			     password-manager autofill (1Password / LastPass / Bitwarden /
			     Dashlane), which ignore autocomplete="off". -->
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
				aria-autocomplete="list"
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-controls={listboxId}
				aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
				{placeholder}
				{disabled}
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
			<span class="select-value" class:is-placeholder={!hasSelection}>{displayLabel}</span>
			<i class="fa-solid fa-chevron-down select-chevron" class:is-open={open}></i>
		</button>
	{/if}

	{#if open}
		<div bind:this={listEl} id={listboxId} class="select-menu" role="listbox" tabindex="-1">
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
						<span class="truncate">{opt.label}</span>
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
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
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
