<script>
	const { data } = $props()

	const project = $derived(data.project)

	/** @type {HTMLInputElement} */
	let elFile

	let downloadUrl = $state('')
	let uploading = $state(false)

	/**
	 * @param {Event} e
	 */
	async function upload (e) {
		e.preventDefault()

		if (uploading) {
			return
		}
		if (!elFile.files?.length) {
			return
		}

		const file = elFile.files[0]

		downloadUrl = ''
		uploading = true
		try {
			const resp = await fetch(`/api/dropbox?project=${project}`, {
				method: 'POST',
				body: file
			})
			const res = await resp.json()
			downloadUrl = res?.result?.downloadUrl ?? ''
			elFile.value = ''
		} catch (e) {
			console.log(e)
		} finally {
			uploading = false
		}
	}
</script>

<h6>Dropbox (Alpha)</h6>
<br>
<div class="nm-panel is-level-300">
	<form class="_dp-g _g-6 _w-100pct" onsubmit={upload}>
		<div class="nm-field">
			<input class="nm-field" type="file" name="file" bind:this={elFile}>
		</div>
		<div class="_dp-f _g-6">
			<button class="nm-button" class:is-loading={uploading} type="submit">Upload</button>
		</div>
	</form>

	{#if downloadUrl}
		<div class="_mgt-8">
			Download URL
			<pre>{downloadUrl}</pre>
		</div>
	{/if}
</div>
