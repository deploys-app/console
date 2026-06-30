<script lang="ts">
	import { modalState, settle } from './store.svelte'

	// Mounted once (in the authed shell). A single native <dialog> renders every
	// confirm/error/success/prompt the app raises. Opening is imperative
	// (showModal, since callers `await modal.confirm(...)` from JS); closing is
	// plain JS (dialogEl.close()) on each button's onclick — we intentionally do
	// NOT use the Invoker Commands API (command="close") here because iOS support
	// is still limited. The dialog's `close` event resolves the pending promise.

	let dialogEl = $state<HTMLDialogElement | null>(null)
	// Whether the confirm button was the one activated. Set before close; reset on
	// every open so Esc / backdrop / the X / Cancel all read as a dismissal.
	let confirmed = false

	const ICONS: Record<string, string> = {
		warning: 'fa-triangle-exclamation',
		error: 'fa-circle-xmark',
		success: 'fa-circle-check'
	}

	// For type-to-confirm prompts the confirm button stays disabled until the
	// trimmed input matches; otherwise it's always enabled.
	const confirmEnabled = $derived(
		modalState.requireMatch === null || modalState.value.trim() === modalState.requireMatch
	)

	$effect(() => {
		const el = dialogEl
		if (!el) return
		if (modalState.open && !el.open) {
			confirmed = false
			el.showModal()
			// Focus the input on prompts, otherwise the confirm button. Done after
			// showModal (which focuses the first focusable) so we win. data-autofocus
			// sits on the input when present and on the confirm button always, so the
			// first match in DOM order is the right target.
			queueMicrotask(() => el.querySelector<HTMLElement>('[data-autofocus]')?.focus())
		} else if (!modalState.open && el.open) {
			el.close()
		}
	})

	function onClose () {
		settle(confirmed)
	}

	function doConfirm () {
		if (!confirmEnabled) return
		confirmed = true
		dialogEl?.close()
	}

	function cancel () {
		dialogEl?.close()
	}

	// Native dialogs don't light-dismiss; match the previous behaviour by treating
	// a click on the backdrop (target is the dialog itself, since its box is the
	// panel) as a cancel.
	function onClick (e: MouseEvent) {
		if (e.target === dialogEl) dialogEl?.close()
	}
</script>

<dialog
	bind:this={dialogEl}
	id="app-modal"
	class="app-dialog"
	aria-labelledby={modalState.heading ? 'app-modal-heading' : undefined}
	onclose={onClose}
	onclick={onClick}
>
	<div class="modal-panel">
		<button type="button" class="modal-close" aria-label="Close" onclick={cancel}>
			<i class="fa-solid fa-xmark"></i>
		</button>

		<div class="modal-body">
			{#if modalState.icon !== 'none'}
				<div class="modal-icon is-{modalState.icon}">
					<i class="fa-solid {ICONS[modalState.icon]}"></i>
				</div>
			{/if}

			{#if modalState.heading}
				<h2 id="app-modal-heading" class="modal-heading">{modalState.heading}</h2>
			{/if}

			{#each modalState.lines as line, i (`${i}:${line}`)}
				<p class="modal-line">{line}</p>
			{/each}

			{#if modalState.listItems.length}
				<ul class="modal-list">
					{#each modalState.listItems as item, i (`${i}:${item}`)}
						<li>{item}</li>
					{/each}
				</ul>
			{/if}

			{#if modalState.note}
				<p class="modal-note">{modalState.note}</p>
			{/if}

			{#if modalState.input}
				<div class="field modal-field">
					{#if modalState.input.label}
						<label for="app-modal-input">{modalState.input.label}</label>
					{/if}
					{#if modalState.input.multiline}
						<div class="textarea">
							<textarea id="app-modal-input" rows="3" placeholder={modalState.input.placeholder ?? ''} bind:value={modalState.value} data-autofocus></textarea>
						</div>
					{:else}
						<div class="input">
							<input id="app-modal-input" type="text" placeholder={modalState.input.placeholder ?? ''} bind:value={modalState.value} autocomplete="off" data-autofocus
								onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doConfirm() } }}>
						</div>
					{/if}
				</div>
			{/if}

			<div class="modal-actions">
				{#if modalState.cancel}
					<button type="button" class="button is-variant-tertiary" onclick={cancel}>
						{modalState.cancelText}
					</button>
				{/if}
				<button type="button" id="app-modal-confirm" class="button {modalState.confirmVariant}" disabled={!confirmEnabled} data-autofocus onclick={doConfirm}>
					{modalState.confirmText}
				</button>
			</div>
		</div>
	</div>
</dialog>

<style>
	/* The dialog is just a top-layer positioning shell; the visible card is the
	   inner .modal-panel (a shared component class). Reset the UA chrome and let
	   the panel size it. */
	.app-dialog {
		margin: auto;
		width: calc(100% - 2rem);
		max-width: 32rem;
		padding: 0;
		border: 0;
		background: transparent;
		color: inherit;
		overflow: visible;
	}

	/* Enter/exit animation via discrete-property transitions + @starting-style;
	   the global prefers-reduced-motion rule collapses the duration to a snap. */
	.app-dialog,
	.app-dialog::backdrop {
		transition:
			opacity var(--timing-faster) ease,
			transform var(--timing-faster) ease,
			overlay var(--timing-faster) ease allow-discrete,
			display var(--timing-faster) ease allow-discrete;
	}

	.app-dialog {
		opacity: 0;
		transform: translateY(6px) scale(0.98);
	}

	.app-dialog[open] {
		opacity: 1;
		transform: none;
	}

	@starting-style {
		.app-dialog[open] {
			opacity: 0;
			transform: translateY(6px) scale(0.98);
		}
	}

	.app-dialog::backdrop {
		background: rgb(0 0 0 / 0.5);
		opacity: 0;
	}

	.app-dialog[open]::backdrop {
		opacity: 1;
	}

	@starting-style {
		.app-dialog[open]::backdrop {
			opacity: 0;
		}
	}

	.modal-body {
		text-align: center;
	}

	.modal-icon {
		font-size: 2.25rem;
		line-height: 1;
		margin-bottom: 0.75rem;
	}

	.modal-icon.is-warning { color: hsl(var(--hsl-warning)); }
	.modal-icon.is-error { color: hsl(var(--hsl-negative)); }
	.modal-icon.is-success { color: hsl(var(--hsl-positive)); }

	.modal-heading {
		font-size: 1.25rem;
		font-weight: 700;
		line-height: 1.3;
	}

	.modal-line {
		margin-top: 0.5rem;
		color: hsl(var(--hsl-content) / 0.72);
		line-height: 1.55;
	}

	/* Lists + footnote read better left-aligned even inside the centered panel. */
	.modal-list {
		margin: 0.75rem auto 0;
		padding-left: 1.25rem;
		max-width: 24rem;
		text-align: left;
		list-style: disc;
		color: hsl(var(--hsl-content) / 0.85);
	}

	.modal-list > li {
		margin-top: 0.25rem;
		word-break: break-word;
	}

	.modal-note {
		margin-top: 0.5rem;
		font-size: 0.875rem;
		color: hsl(var(--hsl-content) / 0.6);
	}

	.modal-field {
		margin-top: 1.25rem;
		text-align: left;
	}

	.modal-actions {
		display: flex;
		justify-content: center;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}
</style>
