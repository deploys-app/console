<script lang="ts">
	// Max upload size, mirrors api.MaxTransferSlipSize (10 MiB). The server
	// enforces this too; checking here gives instant feedback.
	const MAX_SIZE = 10 * 1024 * 1024

	interface Props {
		/** called after a slip is accepted */
		onuploaded?: () => void
	}

	const { onuploaded }: Props = $props()

	let invoice = $state<Api.Invoice | null>(null)
	let isActive = $state(false)
	let uploading = $state(false)
	let error = $state('')
	let selectedFile = $state<File | null>(null)
	let elFile = $state<HTMLInputElement | null>(null)

	export function open (inv: Api.Invoice): void {
		invoice = inv
		selectedFile = null
		error = ''
		if (elFile) elFile.value = ''
		isActive = true
	}

	function close () {
		if (uploading) return
		isActive = false
	}

	/**
	 * Close only when the backdrop itself is clicked, not when a click inside
	 * the panel bubbles up — otherwise interacting with the form would dismiss
	 * the modal.
	 */
	function onBackdrop (e: MouseEvent) {
		if (e.target === e.currentTarget) close()
	}

	function onFileChange (e: Event) {
		const input = e.currentTarget as HTMLInputElement
		const f = input.files?.[0] ?? null
		error = ''
		if (f && f.size > MAX_SIZE) {
			error = 'Slip is too large (max 10 MB).'
			selectedFile = null
			input.value = ''
			return
		}
		selectedFile = f
	}

	async function upload () {
		if (uploading || !selectedFile || !invoice) return
		uploading = true
		error = ''
		try {
			const fd = new FormData()
			fd.append('id', invoice.id)
			fd.append('slip', selectedFile)
			const resp = await fetch('/api/billing.uploadTransferSlip', {
				method: 'POST',
				body: fd
			})
			const res = await resp.json().catch(() => null)
			if (!resp.ok || !res?.ok) {
				error = res?.error?.message ?? `Upload failed (${resp.status}).`
				return
			}
			isActive = false
			onuploaded?.()
		} catch (err) {
			error = err instanceof Error ? err.message : String(err)
		} finally {
			uploading = false
		}
	}

	function fileSize (n: number): string {
		if (n < 1024) return `${n} B`
		if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
		return `${(n / 1024 / 1024).toFixed(1)} MB`
	}

	function money (v: number, currency: string): string {
		return `${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
	}
</script>

<div class="modal" onclick={onBackdrop} class:is-active={isActive} aria-hidden={!isActive}>
	<div class="modal-panel">
		<div class="modal-close" onclick={close} onkeypress={close} tabindex="0" role="button">✕</div>
		<h4><strong>Pay invoice {invoice?.number}</strong></h4>
		<p class="mt-1 text-content/70">
			Transfer the amount to the account below, then upload your bank transfer slip as proof of payment. We'll verify it and mark the invoice as paid.
		</p>

		{#if invoice?.payment?.accountNo}
			<div class="pay-to">
				<div class="pay-to-title">Transfer to</div>
				<div class="pay-grid">
					<div class="pay-key">Amount due</div>
					<div class="font-semibold tabular-nums">{money(invoice.total, invoice.currency)}</div>
					<div class="pay-key">Bank</div>
					<div>{invoice.payment.bank}</div>
					<div class="pay-key">Account name</div>
					<div>{invoice.payment.accountName}</div>
					<div class="pay-key">Account no.</div>
					<div class="tabular-nums">{invoice.payment.accountNo}</div>
					<div class="pay-key">PromptPay</div>
					<div class="tabular-nums">{invoice.payment.promptPay}</div>
				</div>
			</div>
		{/if}

		<input
			bind:this={elFile}
			class="hidden-input"
			type="file"
			accept="image/*,application/pdf"
			onchange={onFileChange}
		>

		<div class="mt-4 grid gap-3">
			<button type="button" class="button is-variant-secondary is-icon-left" onclick={() => elFile?.click()}>
				<i class="fa-solid fa-paperclip"></i>
				Choose file
			</button>

			{#if selectedFile}
				<div class="selected-file">
					<i class="fa-solid fa-file-invoice file-icon"></i>
					<div class="file-meta">
						<div class="file-name">{selectedFile.name}</div>
						<div class="file-size">{fileSize(selectedFile.size)}</div>
					</div>
				</div>
			{/if}

			{#if error}
				<div class="text-negative">{error}</div>
			{/if}

			<button
				class="button is-icon-left"
				class:is-loading={uploading}
				disabled={!selectedFile || uploading}
				onclick={upload}
			>
				<i class="fa-solid fa-cloud-arrow-up"></i>
				Upload slip
			</button>
		</div>
	</div>
</div>

<style>
	.modal-panel {
		width: 100%;
		max-width: 32rem;
	}

	.hidden-input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}

	.pay-to {
		margin-top: 1rem;
		padding: 0.75rem 1rem;
		background-color: hsl(var(--hsl-content) / 0.06);
		border: 1px solid hsl(var(--hsl-content) / 0.15);
		border-radius: 6px;
	}

	.pay-to-title {
		font-size: var(--fs-1);
		font-weight: 600;
		color: hsl(var(--hsl-content) / 0.6);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin-bottom: 0.5rem;
	}

	.pay-grid {
		display: grid;
		grid-template-columns: max-content 1fr;
		column-gap: 1.25rem;
		row-gap: 0.35rem;
	}

	.pay-grid .pay-key {
		color: hsl(var(--hsl-content) / 0.65);
	}

	.selected-file {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background-color: hsl(var(--hsl-content) / 0.06);
		border: 1px solid hsl(var(--hsl-content) / 0.15);
		border-radius: 6px;
		/* This row is a grid item (the modal's button column). Grid items default
		   to min-width:auto, which would let a long file name push the row — and
		   the whole modal — wider than the panel. min-width:0 lets it shrink so
		   the .file-name ellipsis below actually kicks in. */
		min-width: 0;
	}

	.selected-file .file-icon {
		font-size: 1.25rem;
		color: hsl(var(--hsl-content) / 0.7);
	}

	.selected-file .file-meta {
		flex: 1;
		min-width: 0;
	}

	.selected-file .file-name {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.selected-file .file-size {
		font-size: var(--fs-1);
		color: hsl(var(--hsl-content) / 0.6);
	}
</style>
