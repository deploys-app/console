import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'

/**
 * Escape a string for safe interpolation into a SweetAlert `html` body.
 */
function escapeHtml (s: string): string {
	return s.replace(/[&<>"']/g, (c) => (
		({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c] ?? c
	))
}

interface ModalConfirmOptions {
	title?: string
	html?: string
	yes?: string
	callback?: (() => void) | null
}

export async function confirm ({ title, html, yes, callback }: ModalConfirmOptions): Promise<boolean> {
	const result = await Swal.fire({
		title: 'Are you sure?',
		text: title,
		html,
		icon: 'warning',
		showCancelButton: true,
		buttonsStyling: false,
		background: 'var(--modal-panel-background)',
		color: 'var(--modal-panel-color)',
		confirmButtonText: yes || 'Yes',
		customClass: {
			confirmButton: 'button is-variant-negative mr-4',
			cancelButton: 'button is-variant-tertiary',
			actions: 'mt-6'
		}
	})
	if (!result.value) {
		return false
	}

	callback?.()
	return true
}

interface ModalErrorOptions {
	error?: string | Api.Error | unknown
	callback?: (() => void) | null
}

export async function error ({ error, callback }: ModalErrorOptions): Promise<void> {
	if (!error) {
		callback?.()
		return
	}

	let msg = ''
	if (typeof error === 'string') {
		msg = error
	} else if (error instanceof Error) {
		msg = error.message
	} else if (typeof error === 'object') {
		if ('message' in error && typeof error.message === 'string') {
			msg = error.message
		}
		if ('validate' in error && Array.isArray(error.validate)) {
			msg = error.validate.join('<br>')
		}
		// Domain delete blocked by routes — render the blockers as a list with a
		// clear next step instead of the raw "api: domain in used by route(s): …".
		if ('domainInUsed' in error && error.domainInUsed) {
			const routes = 'routes' in error && Array.isArray(error.routes) ? error.routes : []
			const more = 'routesMore' in error && typeof error.routesMore === 'number' ? error.routesMore : 0
			if (routes.length) {
				const items = routes.map((r) => `<li>${escapeHtml(String(r))}</li>`).join('')
				const list = `<ul style="text-align:left; margin:0.75rem auto 0; padding-left:1.25rem; max-width:24rem;">${items}</ul>`
				const moreLine = more ? `<p style="margin-top:0.5rem; opacity:0.7;">…and ${more} more.</p>` : ''
				const verb = routes.length === 1 ? 'it' : 'them'
				const noun = routes.length === 1 ? 'route' : 'routes'
				msg = `This domain is still used by the following ${noun}. Delete ${verb} first:${list}${moreLine}`
			} else {
				msg = 'This domain is still in use by one or more routes. Delete its routes first.'
			}
		}
	}

	await Swal.fire({
		title: 'Oops...',
		html: msg,
		icon: 'error',
		background: 'var(--modal-panel-background)',
		color: 'var(--modal-panel-color)',
		customClass: {
			actions: 'mt-6',
			confirmButton: 'button is-variant-negative'
		}
	})
	callback?.()
}

interface ModalSuccessOptions {
	content?: string
}

export async function success ({ content }: ModalSuccessOptions): Promise<void> {
	await Swal.fire({
		title: 'Success',
		text: content,
		icon: 'success',
		background: 'var(--modal-panel-background)',
		color: 'var(--modal-panel-color)',
		customClass: {
			actions: 'mt-6',
			confirmButton: 'button is-variant-negative'
		}
	})
}
