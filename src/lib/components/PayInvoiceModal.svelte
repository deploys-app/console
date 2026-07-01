<script lang="ts">
	import PromptPayQR from '$lib/components/PromptPayQR.svelte'

	// Max upload size, mirrors api.MaxTransferSlipSize (10 MiB). The server
	// enforces this too; checking here gives instant feedback.
	const MAX_SIZE = 10 * 1024 * 1024

	interface Props {
		/** called after a slip is accepted */
		onuploaded?: () => void
	}

	const { onuploaded }: Props = $props()

	// Thai service withholding-tax rate (mirrors api.WithholdingTaxRate). Only a
	// company buyer may withhold; it is deducted off the pre-VAT subtotal.
	const WHT_RATE = 0.03

	let invoice = $state<Api.Invoice | null>(null)
	let isActive = $state(false)
	let uploading = $state(false)
	let error = $state('')
	let selectedFile = $state<File | null>(null)
	let elFile = $state<HTMLInputElement | null>(null)
	let withholdTax = $state(false)
	let certFile = $state<File | null>(null)
	let elCert = $state<HTMLInputElement | null>(null)

	// Only a company (juristic) buyer may withhold tax. The amount is 3% of the
	// pre-VAT subtotal, rounded to satang like the server; the net is what to
	// transfer. Withholding off -> net == total.
	const isCompany = $derived(invoice?.taxEntityType === 'company')
	const whtAmount = $derived(
		withholdTax && invoice ? Math.round(invoice.subtotal * WHT_RATE * 100) / 100 : 0
	)
	const netAmount = $derived(invoice ? Math.round((invoice.total - whtAmount) * 100) / 100 : 0)

	export function open (inv: Api.Invoice): void {
		invoice = inv
		selectedFile = null
		withholdTax = false
		certFile = null
		error = ''
		if (elFile) elFile.value = ''
		if (elCert) elCert.value = ''
		isActive = true
	}

	function onToggleWithhold (e: Event) {
		withholdTax = (e.currentTarget as HTMLInputElement).checked
		// Clearing the election drops any attached certificate too.
		if (!withholdTax) {
			certFile = null
			if (elCert) elCert.value = ''
		}
	}

	function onCertChange (e: Event) {
		const input = e.currentTarget as HTMLInputElement
		const f = input.files?.[0] ?? null
		error = ''
		if (f && f.size > MAX_SIZE) {
			error = 'Certificate is too large (max 10 MB).'
			certFile = null
			input.value = ''
			return
		}
		certFile = f
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
			if (isCompany) fd.append('withholdingTax', String(withholdTax))
			if (withholdTax && certFile) fd.append('whtCert', certFile)
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
					<div>
						<div class="font-semibold tabular-nums">{money(netAmount, invoice.currency)}</div>
						{#if withholdTax}
							<div class="wht-note tabular-nums">
								{money(invoice.total, invoice.currency)} less {WHT_RATE * 100}% withholding {money(whtAmount, invoice.currency)}
							</div>
						{/if}
					</div>
					<div class="pay-key">Bank</div>
					<div>{invoice.payment.bank}</div>
					<div class="pay-key">Account name</div>
					<div>{invoice.payment.accountName}</div>
					<div class="pay-key">Account no.</div>
					<div class="tabular-nums">{invoice.payment.accountNo}</div>
					<div class="pay-key">PromptPay</div>
					<div class="tabular-nums">{invoice.payment.promptPay}</div>
				</div>

				<!-- Self-gates to nothing unless the invoice is THB with a PromptPay id,
				     so no wrapper/spacing is rendered for non-THB invoices. -->
				<PromptPayQR
					promptPay={invoice.payment.promptPay}
					amount={netAmount}
					currency={invoice.currency}
				/>
			</div>
		{/if}

		{#if isCompany}
			<div class="wht mt-4">
				<label class="checkbox">
					<input type="checkbox" checked={withholdTax} onchange={onToggleWithhold}>
					<span>Withhold 3% tax (หัก ณ ที่จ่าย)</span>
				</label>
				<p class="mt-1 text-content/60 text-sm">
					For a company withholding tax on this payment: transfer the net amount above and,
					if you have it, attach the withholding tax certificate (50 ทวิ). The invoice is still
					settled in full.
				</p>

				{#if withholdTax}
					<input
						bind:this={elCert}
						class="hidden-input"
						type="file"
						accept="image/*,application/pdf"
						onchange={onCertChange}
					>
					<button
						type="button"
						class="button is-variant-secondary is-icon-left is-size-small mt-3"
						onclick={() => elCert?.click()}
					>
						<i class="fa-solid fa-paperclip"></i>
						Attach WHT certificate (optional)
					</button>
					{#if certFile}
						<div class="selected-file mt-2">
							<i class="fa-solid fa-file-lines file-icon"></i>
							<div class="file-meta">
								<div class="file-name">{certFile.name}</div>
								<div class="file-size">{fileSize(certFile.size)}</div>
							</div>
						</div>
					{/if}
				{/if}
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

	.wht-note {
		margin-top: 0.15rem;
		font-size: var(--fs-1);
		color: hsl(var(--hsl-content) / 0.6);
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
