/**
 * PromptPay QR payload generation.
 *
 * A PromptPay QR is not an image of the phone number — it is an EMVCo
 * "Merchant-Presented Mode" payload string (the Bank of Thailand "Standardized
 * Thai QR" profile) that a banking app parses to prefill a transfer. This module
 * builds that string; rendering it as a QR matrix is the caller's job
 * (see PromptPayQR.svelte).
 *
 * The payload is a flat list of `[id][length][value]` blocks (2-digit id, 2-digit
 * zero-padded length, then the value), terminated by a CRC-16 over everything
 * including the CRC tag+length. The PromptPay target lives in template tag 29,
 * whose sub-tag selects the identifier kind:
 *   - 01 mobile number     (10 digits, normalised to 0066…)
 *   - 02 national / tax ID (13 digits — citizen ID and company tax ID share this)
 *   - 03 e-wallet ID       (15 digits)
 *
 * Spec: https://www.bot.or.th/content/dam/bot/fipcs/documents/FPG/2562/EngPDF/25620084.pdf
 */

const AID_PROMPTPAY = 'A000000677010111'

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — the EMVCo QR checksum. */
function crc16 (s: string): string {
	let crc = 0xffff
	for (let i = 0; i < s.length; i++) {
		crc ^= s.charCodeAt(i) << 8
		for (let b = 0; b < 8; b++) {
			crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
			crc &= 0xffff
		}
	}
	return crc.toString(16).toUpperCase().padStart(4, '0')
}

/** Encode one EMVCo TLV block: id + zero-padded length + value. */
function field (id: string, value: string): string {
	return id + value.length.toString().padStart(2, '0') + value
}

/**
 * Build the tag-29 PromptPay target sub-field from a raw identifier. The kind is
 * chosen by digit count, matching how banking apps parse it:
 *   15 digits → e-wallet, 13 → national/tax ID, otherwise → mobile.
 */
function promptPayTarget (digits: string): string {
	if (digits.length >= 15) {
		return field('03', digits)
	}
	if (digits.length === 13) {
		return field('02', digits)
	}
	// Mobile: drop the leading 0, prefix country code 66, left-pad to 13.
	const msisdn = ('0000000000000' + digits.replace(/^0/, '66')).slice(-13)
	return field('01', msisdn)
}

/**
 * Generate the PromptPay EMVCo payload string for an identifier (mobile number,
 * national/company tax ID, or e-wallet id). Non-digit characters in `id` (spaces,
 * dashes) are ignored. When `amount` is a positive number the QR is a one-time
 * "dynamic" payload carrying that exact amount in THB; otherwise it is a reusable
 * "static" payload the payer fills in.
 */
export function promptPayPayload (id: string, amount?: number): string {
	const digits = id.replace(/\D/g, '')
	const hasAmount = amount != null && Number.isFinite(amount) && amount > 0

	// Field order mirrors the de-facto-standard promptpay-qr library (country 58
	// before currency 53/amount 54) so the payload is byte-identical to the one
	// every Thai banking app is known to accept.
	const payload =
		field('00', '01') + // payload format indicator
		field('01', hasAmount ? '12' : '11') + // 12 = dynamic (one-time), 11 = static
		field('29', field('00', AID_PROMPTPAY) + promptPayTarget(digits)) +
		field('58', 'TH') + // country code
		field('53', '764') + // currency = THB (ISO 4217)
		(hasAmount ? field('54', amount.toFixed(2)) : '') // transaction amount

	// CRC is computed over the payload plus the CRC tag id+length ("6304").
	const withCrcTag = payload + '6304'
	return withCrcTag + crc16(withCrcTag)
}

/**
 * Whether a PromptPay QR can be shown for this invoice. PromptPay settles in THB
 * only, so non-THB invoices (and invoices with no PromptPay id) get no QR.
 */
export function canPromptPay (currency: string, promptPay: string): boolean {
	return currency === 'THB' && promptPay.replace(/\D/g, '').length >= 10
}
