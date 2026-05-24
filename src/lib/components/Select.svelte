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

	/** @type {HTMLButtonElement} */
	let triggerEl
	/** @type {HTMLDivElement | undefined} */
	let listEl = $state()

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
		const o = options[i]
		return !!o && !o.separator && !o.disabled
	}

	/** @param {Option} opt */
	function commit (opt) {
		if (opt.separator || opt.disabled) return
		const v = opt.value ?? ''
		value = v
		close()
		triggerEl?.focus()
		onchange?.(v)
		if (resetOnSelect) value = ''
	}

	function openMenu () {
		if (disabled) return
		open = true
		const sel = options.findIndex((o) => !o.separator && (o.value ?? '') === value)
		activeIndex = sel >= 0 && isSelectable(sel) ? sel : firstSelectable()
	}

	function close () {
		open = false
		activeIndex = -1
	}

	function firstSelectable () {
		for (let i = 0; i < options.length; i++) if (isSelectable(i)) return i
		return -1
	}

	function lastSelectable () {
		for (let i = options.length - 1; i >= 0; i--) if (isSelectable(i)) return i
		return -1
	}

	/** @param {number} dir */
	function moveActive (dir) {
		let i = activeIndex
		for (let step = 0; step < options.length; step++) {
			i += dir
			if (i < 0) i = options.length - 1
			if (i >= options.length) i = 0
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
		const match = options.findIndex(
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
			if (open && activeIndex >= 0) commit(options[activeIndex])
			else openMenu()
			break
		case ' ':
			e.preventDefault()
			if (open && activeIndex >= 0) commit(options[activeIndex])
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

	{#if open}
		<div bind:this={listEl} id={listboxId} class="select-menu" role="listbox" tabindex="-1">
			{#each options as opt, i (i)}
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
