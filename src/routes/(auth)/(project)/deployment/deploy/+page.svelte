<script>
	import format from '$lib/format'
	import { onMount, tick } from 'svelte'
	import { goto } from '$app/navigation'
	import modal from '$lib/modal'
	import api from '$lib/api'

	export let data

	/** @type {import('$types').Location[]} */
	const locations = data.locations

	const {
		quota,
		deployment
	} = data

	/** @type {string} */
	let project
	$: project = data.project

	const permission = {
		pullSecrets: true,
		workloadIdentities: true,
		disks: true
	}

	/** @type {import('$types').PullSecret[]} */
	let pullSecrets = []

	/** @type {import('$types').WorkloadIdentity[]} */
	let workloadIdentities = []

	/** @type {import('$types').Disk[]} */
	let disks = []

	const form = deployment
		? {
			location: deployment.location,
			name: deployment.name,
			type: deployment.type,
			image: deployment.image,
			pullSecret: deployment.pullSecret,
			workloadIdentity: deployment.workloadIdentity,
			port: deployment.port,
			protocol: deployment.protocol,
			internal: deployment.internal,
			command: deployment.command,
			args: deployment.args,
			schedule: deployment.schedule,
			disk: deployment.disk || {
				name: '',
				mountPath: '',
				subPath: ''
			},
			minReplicas: deployment.minReplicas,
			maxReplicas: deployment.maxReplicas,
			resources: deployment.resources,
			env: Object.entries(deployment.env || {}).map(([k, v]) => ({ k, v })),
			mountData: Object.entries(deployment.mountData || {}).map(([k, v]) => ({ k, v }))
		}
		: {
			location: deployment?.location || '',
			name: '',
			type: 'WebService',
			image: '',
			pullSecret: '',
			workloadIdentity: '',
			port: 8080,
			protocol: 'http',
			internal: false, // default for WebService
			command: [],
			args: [],
			schedule: '',
			disk: {
				name: '',
				mountPath: '',
				subPath: ''
			},
			minReplicas: 1,
			maxReplicas: 1,
			resources: {
				requests: {
					memory: '0'
				}
			},
			env: [],
			mountData: []
		}

	$: currentLocation = locations.find((x) => x.id === form.location)

	async function fetchPullSecrets () {
		const resp = await api.invoke('pullSecret.list', { project, location: currentLocation.id }, fetch)
		if (!resp.ok) {
			if (resp.error.forbidden) {
				permission.pullSecrets = false
				return
			}
			modal.error({ error: resp.error })
			return
		}
		pullSecrets = resp.result.items || []
		form.pullSecret = form.pullSecret
	}

	async function fetchWorkloadIdentities () {
		const resp = await api.invoke('workloadIdentity.list', { project, location: currentLocation.id }, fetch)
		if (!resp.ok) {
			if (resp.error.forbidden) {
				permission.workloadIdentities = false
				return
			}
			modal.error({ error: resp.error })
			return
		}
		workloadIdentities = resp.result.items || []
		form.workloadIdentity = form.workloadIdentity
	}

	async function fetchDisks () {
		const resp = await api.invoke('disk.list', { project, location: currentLocation.id }, fetch)
		if (!resp.ok) {
			if (resp.error.forbidden) {
				permission.disks = false
				return
			}
			modal.error({ error: resp.error })
			return
		}
		disks = resp.result.items || []
		form.disk.name = form.disk.name
	}

	async function changeLocation () {
		pullSecrets = []
		workloadIdentities = []
		disks = []

		await tick()
		if (!currentLocation) {
			return
		}
		fetchPullSecrets()
		fetchWorkloadIdentities()
		fetchDisks()
	}

	let showEnvText = false
	let envText = ''

	function parseEnvText () {
		form.env = envText
			.split('\n')
			.map((t) => t.split('='))
			.map(([k, ...v]) => ({ k, v: v.join('=') }))
	}

	function parseEnvValue () {
		envText = form.env
			.map(({ k, v }) => `${k}=${v}`)
			.join('\n')
	}

	let saving = false

	async function save () {
		if (saving) {
			return
		}

		saving = true
		try {
			const resp = await api.invoke('deployment.deploy', {
				project,
				...form,
				protocol: form.type === 'WebService' ? form.protocol : '',
				env: form.env.reduce((p, x) => { p[x.k] = x.v; return p }, {}),
				mountData: form.mountData.reduce((p, x) => { p[x.k] = x.v; return p }, {})
			}, fetch)
			if (!resp.ok) {
				modal.error({ error: resp.error })
				return
			}
			goto(`/deployment/detail?project=${project}&location=${form.location}&name=${form.name}`)
		} finally {
			saving = false
		}
	}

	onMount(() => {
		changeLocation()
		parseEnvValue()
	})
</script>

<div>
	<ul class="breadcrumb">
		<li>
			<a href={`/deployment?project=${project}`} class="link"><h6>Deployments</h6></a>
		</li>
		{#if deployment}
			<li>
				<a href={`/deployment/detail?project=${project}&location=${deployment.location}&name=${deployment.name}`} class="link">
					<h6>{deployment.name}</h6>
				</a>
			</li>
		{/if}
		<li>
			<h6>Deploy</h6>
		</li>
	</ul>
</div>
<br>

<div class="panel _dp-g _gg-24px">
	<div class="lo-12 _jtfit-st _gg-12px">
		{#if deployment}
			<h5><strong>Deploy new revision</strong></h5>
		{:else}
			<h5><strong>Deploy new deployment</strong></h5>
		{/if}
	</div>
	<hr>

	<form class="_dp-g _gg-16px _w-100pct _mxw-700px" on:submit|preventDefault={save}>
		{#if deployment}
			<div class="field">
				<label for="input-location-readonly">Location</label>
				<div class="input">
					<input id="input-location-readonly" value={deployment.location} readonly>
				</div>
			</div>
		{:else}
			<div class="field _mgbt-20px">
				<label for="input-location">Location</label>
				<div class="select">
					<select id="input-location" bind:value={form.location} on:change={changeLocation} required>
						<option value="" selected disabled>Select Location</option>
						{#each locations as it}
							<option value={it.id}>
								{it.id}
							</option>
						{/each}
					</select>
				</div>
			</div>
		{/if}

		{#if currentLocation}
			<div class="field">
				<label for="input-name">Name</label>
				<div class="input">
					<input id="input-name" placeholder="name" bind:value={form.name} readonly={!!deployment}>
				</div>
			</div>

			{#if deployment}
				<div class="field">
					<label for="input-type-readonly">Type</label>
					<div class="input">
						<input id="input-type-readonly" value={format.deploymentType(deployment.type)} readonly>
					</div>
				</div>
			{:else}
				<div class="field">
					<label for="input-type">Type</label>
					<div class="select">
						<select id="input-type" class="js-type" bind:value={form.type}>
							<option value="WebService">Web Service</option>
							<option value="InternalTCPService">Internal TCP Service</option>
							<option value="Worker">Worker</option>
							<option value="CronJob">CronJob</option>
						</select>
					</div>
				</div>
			{/if}

		<div class="field">
			<label for="input-image">Image</label>
			<div class="input">
				<input id="input-image" placeholder="image" bind:value={form.image}>
			</div>
		</div>

		{#if permission.pullSecrets}
			<div class="field">
				<label for="input-pull_secret">Pull Secret</label>
				<div class="select">
					<select id="input-pull_secret" bind:value={form.pullSecret}>
						<option value="">No Pull Secret</option>
						{#each pullSecrets as it}
							<option value={it.name}>{it.name}</option>
						{/each}
					</select>
				</div>
			</div>
		{:else}
			<div class="field">
				<label for="input-pull_secret-text">Pull Secret</label>
				<div class="input">
					<input id="input-pull_secret-text" placeholder="Pull Secret Name" bind:value={form.pullSecret}>
				</div>
				<p class="_fs-200">* You don't have permission to list pull secrets</p>
			</div>
		{/if}

		{#if currentLocation?.features.workloadIdentity}
			{#if permission.workloadIdentities}
				<div class="field">
					<label for="input-workload_identity">Workload Identity</label>
					<div class="select">
						<select id="input-workload_identity" bind:value={form.workloadIdentity}>
							<option value="">No Workload Identity</option>
							{#each workloadIdentities as it}
								<option value={it.name}>{it.name}</option>
							{/each}
						</select>
					</div>
				</div>
			{:else}
				<div class="field">
					<label for="input-workload_identity-text">Workload Identity</label>
					<div class="input">
						<input id="input-workload_identity-text" placeholder="Workload Identity Name" bind:value={form.workloadIdentity}>
					</div>
					<p class="_fs-200">* You don't have permission to list workload identities</p>
				</div>
			{/if}
		{/if}

		{#if ['WebService', 'TCPService', 'InternalTCPService'].includes(form.type)}
			<div class="field">
				<label for="input-port">Port</label>
				<div class="input">
					<input class="-no-arrow" id="input-port" placeholder="8080" type="number" bind:value={form.port}>
				</div>
			</div>
		{/if}

		{#if form.type === 'WebService'}
			<div class="field">
				<label for="input-protocol">Protocol</label>
				<div class="select">
					<select id="input-protocol" bind:value={form.protocol}>
						<option value="http">http</option>
						<option value="https">https</option>
						<option value="h2c">h2c</option>
					</select>
				</div>
			</div>
			<div class="field">
				<div class="checkbox">
					<input id="input-internal" type="checkbox" bind:checked={form.internal}>
					<label for="input-internal">Internal Service</label>
				</div>
			</div>
		{/if}

		<div class="field">
			<label for="div-command">Command</label>
			<div id="div-command" class="_pdbt-8px">
				{#each form.command as _, i}
					<div class="input -has-icon-right _mgbt-8px">
						<input bind:value={form.command[i]}>
						<div class="icon -is-right _cs-pt" on:click={() => { form.command.splice(i, 1); form.command = form.command }}>
							<i class="fa-solid fa-trash-alt"></i>
						</div>
					</div>
				{/each}
			</div>
			<button class="button -small _mg-at" type="button" on:click={() => { form.command = [...form.command, ''] }}>
				<i class="fa-solid fa-plus _mgr-12px"></i>
				<span>Add Command</span>
			</button>
		</div>

		<div class="field">
			<label for="div-args">Args</label>
			<div id="div-args" class="_pdbt-8px">
				{#each form.args as _, i}
					<div class="input -has-icon-right _mgbt-8px">
						<input bind:value={form.args[i]}>
						<div class="icon -is-right _cs-pt" on:click={() => { form.args.splice(i, 1); form.args = form.args }}>
							<i class="fa-solid fa-trash-alt"></i>
						</div>
					</div>
				{/each}
			</div>
			<button class="button -small _mg-at" type="button" on:click={() => { form.args = [...form.args, ''] }}>
				<i class="fa-solid fa-plus _mgr-12px"></i>
				<span>Add Arg</span>
			</button>
		</div>

		{#if form.type === 'CronJob'}
			<div class="field">
				<label for="input-schedule">Schedule</label>
				<div class="input">
					<input id="input-schedule" placeholder="*/5 * * * *" bind:value={form.schedule}>
				</div>
			</div>
		{/if}

		{#if currentLocation.features.disk}
			<div class="_dp-g _gg-16px">
				<br>
				<hr>
				<br>

				<h6><strong>Disk</strong></h6>

				{#if permission.disks}
					<div class="field">
						<label for="input-disk_name">Name</label>
						<div class="select">
							<select id="input-disk_name" bind:value={form.disk.name}>
								<option value="">No Disk</option>
								{#each disks as it}
									<option value={it.name}>{it.name}</option>
								{/each}
							</select>
						</div>
					</div>
				{:else}
					<div class="field">
						<label for="input-disk_name-text">Name</label>
						<div class="input">
							<input id="input-disk_name-text" placeholder="Disk Name" bind:value={form.disk.name}>
						</div>
						<p class="_fs-200">* You don't have permission to list disks</p>
					</div>
				{/if}

				{#if form.disk.name}
					<div class="field">
						<label for="input-disk_mount_path">Mount Path</label>
						<div class="input">
							<input id="input-disk_mount_path" placeholder="" bind:value={form.disk.mountPath}>
						</div>
					</div>
					<div class="field">
						<label for="input-disk_sub_path">Sub Path</label>
						<div class="input">
							<input id="input-disk_sub_path" placeholder="" bind:value={form.disk.subPath}>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		{#if ['WebService', 'Worker', 'InternalTCPService'].includes(form.type)}
			<div>
				<div class="_dp-g _gg-16px">
					<br>
					<hr>
					<br>

					<h6><strong>Autoscaling</strong></h6>
					<div class="lo-6 _gg-16px">
						<div class="field">
							<label for="input-min_replicas">Min Replicas</label>
							<div class="input">
								<input id="input-min_replicas"
									bind:value={form.minReplicas}
									type="number"
									min="1"
									max={quota.deploymentMaxReplicas}>
							</div>
						</div>

						<div class="field">
							<label for="input-max_replicas">Max Replicas</label>
							<div class="input">
								<input id="input-max_replicas"
									bind:value={form.maxReplicas}
									type="number"
									min="1"
									max={quota.deploymentMaxReplicas}>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<br>
		<hr>
		<br>

<!--		{{/*        <div class="field">*/}}-->
<!--		{{/*            <label for="input-cpu">CPU allocated</label>*/}}-->
<!--		{{/*            <div class="select">*/}}-->
<!--		{{/*                <select id="input-cpu" name="cpu">*/}}-->
<!--		{{/*                    {{range .Location.CPUAllocatable}}*/}}-->
<!--		{{/*                    <option value="{{.}}" {{if eq . $.Form.CPU}}selected{{end}}>{{. | textDeploymentCPU}}</option>*/}}-->
<!--		{{/*                    {{end}}*/}}-->
<!--		{{/*                </select>*/}}-->
<!--		{{/*            </div>*/}}-->
<!--		{{/*            <small class="_cl-light-secondary">*/}}-->
<!--		{{/*                Number of vCPUs allocated to each container instance.*/}}-->
<!--		{{/*            </small>*/}}-->
<!--		{{/*        </div>*/}}-->

		<div class="field">
			<label for="input-memory">Memory allocated</label>
			<div class="select">
				<select id="input-memory" bind:value={form.resources.requests.memory}>
					{#each currentLocation.memoryAllocatable as it}
						<option value={it}>{format.memory(it)}</option>
					{/each}
				</select>
			</div>
			<small class="_cl-light-secondary">
				Memory to allocate to each container instance.
			</small>
		</div>

		<br>
		<hr>
		<br>

		<h6><strong>Environment Variables</strong></h6>
		<div>
			<div class="table-container">
				<table class="table -ruled">
					<thead>
						<tr>
							<th>Key</th>
							<th class="collapsed _pd-0px"></th>
							<th>Value</th>
							<th class="collapsed"></th>
						</tr>
					</thead>
					<tbody>
						{#each form.env as it, i}
							<tr>
								<td class="_mnw-128px">
									<div class="input">
										<input bind:value={it.k} placeholder="Variable name" on:change={parseEnvValue}>
									</div>
								</td>
								<td class="_pd-0px _pdl-12px">:</td>
								<td class="_mnw-128px _pdl-12px">
									<div class="input">
										<input bind:value={it.v} placeholder="Value" on:change={parseEnvValue}>
									</div>
								</td>
								<td class="table-action-container" style="padding: 19px 12px;">
									<div class="icon-button -negative"
										on:click={() => { form.env.splice(i, 1); form.env = form.env; parseEnvValue() }}>
										<i class="fa-solid fa-trash-alt"></i>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr>
							<td colspan="4">
								<button class="button -small _mg-at" type="button"
									on:click={() => { form.env.push({ k: '', v: '' }); form.env = form.env; parseEnvValue() }}>
									<i class="fa-solid fa-plus _mgr-12px"></i>
									<span>Add Variable</span>
								</button>
							</td>
						</tr>
					</tfoot>
				</table>
			</div>

			<button class="button -small _mg-at" type="button" on:click={() => showEnvText = !showEnvText}>
				{#if showEnvText}Hide{:else}Show{/if}&nbsp;Text Editor
			</button>
			{#if showEnvText}
				<div class="textarea _mgt-12px">
					<textarea rows="20" bind:value={envText} on:change={parseEnvText}></textarea>
				</div>
			{/if}
		</div>

		<hr>

		<h6><strong>Mount Data</strong></h6>
		<div>
			<div class="table-container">
				<table class="table -ruled">
					<thead>
						<tr>
							<th>Path</th>
							<th class="collapsed _pd-0px"></th>
							<th>Data</th>
							<th class="collapsed"></th>
						</tr>
					</thead>
					<tbody>
						{#each form.mountData as it, i}
							<tr>
								<td class="_mnw-128px">
									<div class="input">
										<input bind:value={it.k} placeholder="Path">
									</div>
								</td>
								<td class="_pd-0px _pdl-12px">:</td>
								<td class="_mnw-128px _pdl-12px">
									<div class="textarea">
										<textarea bind:value={it.v} placeholder="Data"></textarea>
									</div>
								</td>
								<td class="table-action-container" style="padding: 19px 12px;">
									<div class="icon-button -negative" on:click={() => { form.mountData.splice(i, 1); form.mountData = form.mountData }}>
										<i class="fa-solid fa-trash-alt"></i>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
					<tr>
						<td colspan="4">
							<button class="button -small _mg-at" type="button" on:click={() => { form.mountData.push({ k: '', v: '' }); form.mountData = form.mountData }}>
								<i class="fa-solid fa-plus _mgr-12px"></i>
								<span>Add Data</span>
							</button>
						</td>
					</tr>
					</tfoot>
				</table>
			</div>
		</div>

		<hr>

		<button class="button _mgt-16px _mgr-at" class:-loading={saving}>
			Deploy
		</button>
	{/if}
	</form>
</div>
