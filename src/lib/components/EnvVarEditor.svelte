<script lang="ts">
	/**
	 * Key/value environment-variable editor: a table of name/value inputs with
	 * add/remove plus a toggleable bulk `KEY=VALUE` text editor. Shared by the
	 * deployment deploy form and the env-group create/edit form. Bind the rows:
	 *   <EnvVarEditor bind:entries={form.env} />
	 */
	interface EnvVar {
		k: string
		v: string
	}

	let { entries = $bindable() }: { entries: EnvVar[] } = $props()

	function toText (rows: EnvVar[]): string {
		return rows.map(({ k, v }) => `${k}=${v}`).join('\n')
	}

	let showText = $state(false)
	let envText = $state(toText(entries))

	// Mirror table edits into the text editor so it's current when opened.
	function sync () {
		envText = toText(entries)
	}

	// Re-snapshot the text mirror when `entries` is replaced from outside (e.g. a
	// parent form switching to a different record) so opening the text editor
	// later shows current values, not stale ones. Skip while it's open so we
	// never clobber in-progress typing.
	$effect(() => {
		if (!showText) envText = toText(entries)
	})

	// Parse the text editor back into rows, dropping blank lines.
	function parseText () {
		entries = envText
			.split('\n')
			.filter((t) => t.length > 0)
			.map((t) => t.split('='))
			.map(([k, ...v]) => ({ k, v: v.join('=') }))
	}

	function addVar () {
		entries = [...entries, { k: '', v: '' }]
		sync()
	}

	function removeVar (i: number) {
		entries = entries.filter((_, k) => k !== i)
		sync()
	}
</script>

<div>
	<div class="table-container">
		<table class="table">
			<thead>
				<tr>
					<th>Key</th>
					<th class="is-collapse p-0"></th>
					<th>Value</th>
					<th class="is-collapse is-align-right"></th>
				</tr>
			</thead>
			<tbody>
				{#each entries as it, i (i)}
					<tr>
						<td>
							<div class="input">
								<input bind:value={it.k} placeholder="Variable name" onchange={sync}>
							</div>
						</td>
						<td class="p-0 pl-3">:</td>
						<td class="pl-3">
							<div class="input">
								<input bind:value={it.v} placeholder="Value" onchange={sync}>
							</div>
						</td>
						<td style="padding: 19px 12px;">
							<button class="icon-button" type="button" aria-label="Remove an environment variable"
								onclick={() => removeVar(i)}>
								<i class="fa-solid fa-trash-alt"></i>
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
			<tfoot>
				<tr>
					<td colspan="4">
						<button class="button is-variant-secondary flex m-auto" type="button" onclick={addVar}>
							<i class="fa-solid fa-plus mr-3"></i>
							<span>Add Variable</span>
						</button>
					</td>
				</tr>
			</tfoot>
		</table>
	</div>

	<button class="button is-variant-secondary flex m-auto" type="button" onclick={() => showText = !showText}>
		{#if showText}Hide{:else}Show{/if}&nbsp;Text Editor
	</button>
	{#if showText}
		<div class="textarea mt-3">
			<textarea rows="20" bind:value={envText} onchange={parseText}></textarea>
		</div>
	{/if}
</div>
