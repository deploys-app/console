import ClipboardJS from 'clipboard'

/**
 * @param {string} selector
 * @returns {() => void}
 */
export function setupCopy(selector) {
	const clip = new ClipboardJS(selector)
	clip.on('success', (e) => {
		const trigger = /** @type {HTMLElement} */ (e.trigger)
		trigger.setAttribute('data-copied', '')
		setTimeout(() => trigger.removeAttribute('data-copied'), 1500)
		e.clearSelection()
	})
	return () => clip.destroy()
}
