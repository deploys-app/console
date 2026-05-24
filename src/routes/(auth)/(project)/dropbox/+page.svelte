<script>
	import ClipboardJS from 'clipboard'
	import { onMount } from 'svelte'
	import api from '$lib/api'
	import * as format from '$lib/format'

	const { data } = $props()

	const project = $derived(data.project)
	const items = $derived(data.items)
	const loadError = $derived(data.error)

	/** @type {HTMLInputElement} */
	let elFile
	let uploading = $state(false)
	let dragOver = $state(false)
	let error = $state('')
	let justCopied = $state('')

	/** @type {File | null} */
	let selectedFile = $state(null)

	onMount(() => {
		const clip = new ClipboardJS('.copy-url')
		clip.on('success', (e) => {
			justCopied = String(e.text)
			setTimeout(() => {
				if (justCopied === e.text) justCopied = ''
			}, 1500)
			e.clearSelection()
		})
		return () => clip?.destroy()
	})

	/**
	 * @param {number} bytes
	 * @returns {string}
	 */
	function formatSize (bytes) {
		if (bytes < 1024) return `${bytes} B`
		if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
		if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
		return `${(bytes / 1024 ** 3).toFixed(2)} GB`
	}

	function onFileChange () {
		selectedFile = elFile.files?.[0] ?? null
		error = ''
	}

	/**
	 * @param {DragEvent} e
	 */
	function onDrop (e) {
		e.preventDefault()
		dragOver = false
		const file = e.dataTransfer?.files?.[0]
		if (!file) return
		const dt = new DataTransfer()
		dt.items.add(file)
		elFile.files = dt.files
		selectedFile = file
		error = ''
	}

	/**
	 * @param {DragEvent} e
	 */
	function onDragOver (e) {
		e.preventDefault()
		dragOver = true
	}

	function onDragLeave () {
		dragOver = false
	}

	function clearFile () {
		if (!elFile) return
		elFile.value = ''
		selectedFile = null
		error = ''
	}

	/**
	 * @param {Event} e
	 */
	async function upload (e) {
		e.preventDefault()
		if (uploading || !selectedFile) return

		const file = selectedFile
		uploading = true
		error = ''
		try {
			const resp = await fetch(`/api/dropbox?project=${project}&filename=${encodeURIComponent(file.name)}`, {
				method: 'POST',
				body: file
			})
			const res = await resp.json()
			if (!resp.ok || !res?.ok) {
				error = res?.error?.message ?? `upload failed (${resp.status})`
				return
			}
			clearFile()
			await api.invalidate('dropbox.list')
		} catch (err) {
			error = err instanceof Error ? err.message : String(err)
		} finally {
			uploading = false
		}
	}
</script>

<style>
	.drop-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 2.5rem 1rem;
		border: 2px dashed hsl(var(--hsl-base-400) / 0.6);
		border-radius: 8px;
		background-color: hsl(var(--hsl-base-400) / 0.08);
		text-align: center;
		color: hsl(var(--hsl-content) / 0.75);
		cursor: pointer;
		transition: all var(--timing-normal) ease;
	}

	.drop-zone:hover,
	.drop-zone.is-drag-over {
		border-color: hsl(var(--hsl-primary));
		background-color: hsl(var(--hsl-primary) / 0.06);
		color: hsl(var(--hsl-content));
	}

	.drop-zone .drop-icon {
		font-size: 2rem;
		color: hsl(var(--hsl-content) / 0.6);
	}

	.hidden-input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}

	.selected-file {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background-color: hsl(var(--hsl-base-400) / 0.12);
		border: 1px solid hsl(var(--hsl-base-400) / 0.3);
		border-radius: 6px;
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

	.selected-file .file-clear {
		background: none;
		border: none;
		padding: 0.25rem 0.5rem;
		color: hsl(var(--hsl-content) / 0.6);
		cursor: pointer;
	}

	.selected-file .file-clear:hover {
		color: hsl(var(--hsl-content));
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		background-color: hsl(var(--hsl-negative) / 0.1);
		color: hsl(var(--hsl-negative));
		border: 1px solid hsl(var(--hsl-negative) / 0.3);
		font-size: var(--fs-2);
	}

	.uploads {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.upload-item {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 0.75rem;
		align-items: center;
		padding: 0.75rem 1rem;
		background-color: hsl(var(--hsl-base-400) / 0.08);
		border: 1px solid hsl(var(--hsl-base-400) / 0.25);
		border-radius: 6px;
	}

	.upload-item .upload-icon {
		color: hsl(var(--hsl-positive));
		font-size: 1.125rem;
	}

	.upload-item .upload-info {
		min-width: 0;
	}

	.upload-item .upload-info .upload-name {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.upload-item .upload-info .upload-url {
		font-family: var(--ff-mono, monospace);
		font-size: var(--fs-1);
		color: hsl(var(--hsl-content) / 0.7);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.upload-item .upload-info .upload-sub {
		font-size: var(--fs-1);
		color: hsl(var(--hsl-content) / 0.55);
	}

	.upload-item .upload-actions {
		display: flex;
		gap: 0.25rem;
	}

	.upload-item .upload-actions .icon-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background: none;
		border: 1px solid hsl(var(--hsl-base-400) / 0.4);
		border-radius: 4px;
		color: hsl(var(--hsl-content) / 0.75);
		cursor: pointer;
		transition: all var(--timing-faster) ease;
	}

	.upload-item .upload-actions .icon-button:hover {
		background-color: hsl(var(--hsl-base-400) / 0.15);
		color: hsl(var(--hsl-content));
		border-color: hsl(var(--hsl-base-400) / 0.7);
	}

	.upload-item .upload-actions .icon-button.is-copied {
		color: hsl(var(--hsl-positive));
		border-color: hsl(var(--hsl-positive) / 0.5);
	}
</style>

<h6>Dropbox</h6>
<br>
<div class="panel is-level-300 grid gap-4">
	<div>
		<p class="mb-0.5">Upload a file and get a shareable download URL.</p>
		<small class="text-content/60">
			Files are scoped to this project. Drag a file into the drop zone or click to browse.
		</small>
	</div>

	<form class="grid gap-3 w-full" onsubmit={upload}>
		<label
			class="drop-zone"
			class:is-drag-over={dragOver}
			ondragover={onDragOver}
			ondragleave={onDragLeave}
			ondrop={onDrop}>
			<span class="drop-icon">
				<i class="fa-solid fa-cloud-arrow-up"></i>
			</span>
			<div>
				<strong>Drop a file here</strong> or click to browse
			</div>
			<input
				class="hidden-input"
				type="file"
				name="file"
				bind:this={elFile}
				onchange={onFileChange}>
		</label>

		{#if selectedFile}
			<div class="selected-file">
				<span class="file-icon">
					<i class="fa-solid fa-file"></i>
				</span>
				<div class="file-meta">
					<div class="file-name">{selectedFile.name}</div>
					<div class="file-size">{formatSize(selectedFile.size)}</div>
				</div>
				<button class="file-clear" type="button" onclick={clearFile} disabled={uploading} aria-label="Remove file">
					<i class="fa-solid fa-xmark"></i>
				</button>
			</div>
		{/if}

		{#if error}
			<div class="error-banner">
				<i class="fa-solid fa-circle-exclamation"></i>
				<span>{error}</span>
			</div>
		{/if}

		<div class="flex gap-4 justify-end">
			<button
				class="button"
				class:is-loading={uploading}
				type="submit"
				disabled={!selectedFile || uploading}>
				<i class="fa-solid fa-upload mr-1"></i>
				Upload
			</button>
		</div>
	</form>

	<hr>
	<div>
		<div class="flex justify-between items-center mb-3">
			<strong>Files</strong>
			<small class="text-content/60">expires automatically</small>
		</div>

		{#if loadError}
			<div class="error-banner">
				<i class="fa-solid fa-circle-exclamation"></i>
				<span>{loadError.message || 'Failed to load files. Please try again.'}</span>
			</div>
		{:else if items.length === 0}
			<small class="text-content/60">No files yet. Upload one above to get a shareable download URL.</small>
		{:else}
			<div class="uploads">
				{#each items as it, i (i)}
					<div class="upload-item">
						<span class="upload-icon">
							<i class="fa-solid fa-file"></i>
						</span>
						<div class="upload-info">
							<div class="upload-name">{it.filename || '(no name)'}</div>
							<div class="upload-url" title={it.downloadUrl}>{it.downloadUrl}</div>
							<div class="upload-sub">
								{formatSize(it.size)} · uploaded {format.datetime(it.createdAt)} · expires {format.datetime(it.expiresAt)}
							</div>
						</div>
						<div class="upload-actions">
							<button
								class="icon-button copy-url"
								class:is-copied={justCopied === it.downloadUrl}
								type="button"
								data-clipboard-text={it.downloadUrl}
								aria-label="Copy URL">
								{#if justCopied === it.downloadUrl}
									<i class="fa-solid fa-check"></i>
								{:else}
									<i class="fa-light fa-copy"></i>
								{/if}
							</button>
							<a
								class="icon-button"
								href={it.downloadUrl}
								target="_blank"
								rel="noopener noreferrer"
								aria-label="Open URL">
								<i class="fa-solid fa-arrow-up-right-from-square"></i>
							</a>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
