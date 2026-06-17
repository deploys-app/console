import ClipboardJS from 'clipboard'

export function setupCopy (selector: string): () => void {
	const clip = new ClipboardJS(selector)
	clip.on('success', (e) => {
		const trigger = e.trigger as HTMLElement
		trigger.setAttribute('data-copied', '')
		setTimeout(() => trigger.removeAttribute('data-copied'), 1500)
		e.clearSelection()
	})
	return () => clip.destroy()
}
