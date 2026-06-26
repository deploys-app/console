<script lang="ts">
	import qrcode from 'qrcode-generator'
	import { canPromptPay, promptPayPayload } from '$lib/promptpay'

	interface Props {
		/** PromptPay id: mobile number, national/company tax ID, or e-wallet id. */
		promptPay: string
		/** Invoice total in THB; omit/0 for a reusable QR without an amount. */
		amount?: number
		/** Invoice currency — the QR only renders for THB. */
		currency: string
		/** Rendered pixel size of the QR (square). */
		size?: number
	}

	const { promptPay, amount, currency, size = 200 }: Props = $props()

	// Quiet zone, in modules, required around a QR for reliable scanning.
	const MARGIN = 4

	// Build the QR matrix once per input and flatten dark modules into a single
	// SVG path (merging horizontal runs) — cheaper than one <rect> per module.
	// Error correction level H (~30% recovery) leaves room for the centre logo.
	const qr = $derived.by(() => {
		if (!canPromptPay(currency, promptPay)) return null
		try {
			const code = qrcode(0, 'H')
			code.addData(promptPayPayload(promptPay, amount))
			code.make()
			const count = code.getModuleCount()
			const dim = count + MARGIN * 2
			let d = ''
			for (let r = 0; r < count; r++) {
				let c = 0
				while (c < count) {
					if (!code.isDark(r, c)) { c++; continue }
					let run = 1
					while (c + run < count && code.isDark(r, c + run)) run++
					d += `M${c + MARGIN} ${r + MARGIN}h${run}v1h-${run}z`
					c += run
				}
			}
			// Centre logo: a white knockout (≈28% of width) with the logo (≈20%)
			// on top. Both well within level-H's recovery budget so the code still
			// scans. Geometry is in module units to match the viewBox.
			const box = Math.round(dim * 0.28)
			const img = Math.round(dim * 0.2)
			return {
				dim,
				path: d,
				box,
				boxPos: (dim - box) / 2,
				img,
				imgPos: (dim - img) / 2,
				radius: Math.max(1, dim * 0.02)
			}
		} catch {
			// An over-long / malformed payload shouldn't take down the modal.
			return null
		}
	})
</script>

{#if qr}
	<figure class="ppqr">
		<!-- Colours are hard-coded black-on-white: a QR must never invert in dark
		     mode, and the white card gives the quiet zone a solid backdrop. -->
		<div class="ppqr-card">
			<svg
				viewBox="0 0 {qr.dim} {qr.dim}"
				width={size}
				height={size}
				role="img"
				aria-label="PromptPay QR code"
			>
				<rect x="0" y="0" width={qr.dim} height={qr.dim} fill="#fff" />
				<path d={qr.path} fill="#000" />
				<rect
					x={qr.boxPos}
					y={qr.boxPos}
					width={qr.box}
					height={qr.box}
					rx={qr.radius}
					fill="#fff"
				/>
				<image
					href="/images/logo.webp"
					x={qr.imgPos}
					y={qr.imgPos}
					width={qr.img}
					height={qr.img}
					preserveAspectRatio="xMidYMid meet"
				/>
			</svg>
		</div>
		<figcaption>Scan with any Thai mobile banking app</figcaption>
	</figure>
{/if}

<style>
	.ppqr {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		margin: 1rem 0 0;
	}

	.ppqr-card {
		background-color: #fff;
		padding: 0.5rem;
		border-radius: 8px;
		border: 1px solid hsl(var(--hsl-content) / 0.15);
		line-height: 0;
	}

	.ppqr figcaption {
		font-size: var(--fs-1);
		color: hsl(var(--hsl-content) / 0.6);
	}
</style>
