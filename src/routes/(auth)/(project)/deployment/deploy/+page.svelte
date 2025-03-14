<script>
	import * as format from '$lib/format'
	import { onMount, tick } from 'svelte'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'

	const { data } = $props()

	let locations = $state(data.locations)
	let quota = $state(data.projectInfo.quota)

	$effect(() => {
		locations = data.locations
	})

	const project = $derived(data.project)

	$effect(() => {
		quota = data.projectInfo.quota
	})

	const deployment = data.deployment

	const permission = $state({
		pullSecrets: true,
		workloadIdentities: true,
		disks: true
	})

	/** @type {Api.PullSecret[]} */
	let pullSecrets = $state([])

	/** @type {Api.WorkloadIdentity[]} */
	let workloadIdentities = $state([])

	/** @type {Api.Disk[]} */
	let disks = $state([])

	const form = $state({
		location: deployment?.location || '',
		name: '',
		type: 'WebService',
		image: '',
		pullSecret: '',
		workloadIdentity: '',
		port: 8080,
		protocol: 'http',
		internal: false, // default for WebService
		/** @type {string[]} */
		command: [],
		/** @type {string[]} */
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
			},
			limits: {
				cpu: '0'
			}
		},
		/** @type {{ k: string, v: string }[]} */
		env: [],
		/** @type {{ k: string, v: string }[]} */
		mountData: [],
		// /** @type {Api.Sidecar[]} */
		// sidecars: [],
		sidecar: {
			type: '',
			cloudSqlProxy: {
				instance: '',
				/** @type {?number} */
				port: null,
				credentials: ''
			}
		}
	})
	if (deployment) {
		form.location = deployment.location
		form.name = deployment.name
		form.type = deployment.type
		form.image = deployment.image
		form.pullSecret = deployment.pullSecret
		form.workloadIdentity = deployment.workloadIdentity
		form.port = deployment.port
		form.protocol = deployment.protocol
		form.internal = deployment.internal
		form.command = deployment.command
		form.args = deployment.args
		form.schedule = deployment.schedule
		form.disk = deployment.disk || {
			name: '',
			mountPath: '',
			subPath: ''
		}
		form.minReplicas = deployment.minReplicas
		form.maxReplicas = deployment.maxReplicas
		form.resources = deployment.resources
		form.env = Object.entries(deployment.env || {}).map(([k, v]) => ({ k, v }))
		form.mountData = Object.entries(deployment.mountData || {}).map(([k, v]) => ({ k, v }))
		form.sidecar = (deployment.sidecars || []).length > 0
			? {
				type: 'cloudSqlProxy',
				cloudSqlProxy: {
					instance: deployment.sidecars[0].cloudSqlProxy?.instance ?? '',
					port: deployment.sidecars[0].cloudSqlProxy?.port ?? null,
					credentials: deployment.sidecars[0].cloudSqlProxy?.credentials ?? ''
				}
			}
			: {
				type: '',
				cloudSqlProxy: {
					instance: '',
					port: null,
					credentials: ''
				}
			}
	}

	const selectedLocation = $derived(locations.find((x) => x.id === form.location))

	async function fetchPullSecrets () {
		if (!selectedLocation) {
			pullSecrets = []
			return
		}

		const resp = await api.invoke('pullSecret.list', { project, location: selectedLocation.id }, fetch)
		if (!resp.ok) {
			if (resp.error?.forbidden) {
				permission.pullSecrets = false
				return
			}
			modal.error({ error: resp.error })
			return
		}
		pullSecrets = resp.result.items ?? []
	}

	async function fetchWorkloadIdentities () {
		if (!selectedLocation) {
			workloadIdentities = []
			return
		}

		const resp = await api.invoke('workloadIdentity.list', { project, location: selectedLocation.id }, fetch)
		if (!resp.ok) {
			if (resp.error?.forbidden) {
				permission.workloadIdentities = false
				return
			}
			modal.error({ error: resp.error })
			return
		}
		workloadIdentities = resp.result.items ?? []
	}

	async function fetchDisks () {
		if (!selectedLocation) {
			disks = []
			return
		}

		const resp = await api.invoke('disk.list', { project, location: selectedLocation.id }, fetch)
		if (!resp.ok) {
			if (resp.error?.forbidden) {
				permission.disks = false
				return
			}
			modal.error({ error: resp.error })
			return
		}
		disks = resp.result.items ?? []
	}

	async function changeLocation () {
		pullSecrets = []
		workloadIdentities = []
		disks = []

		await tick()
		if (!selectedLocation) {
			return
		}
		fetchPullSecrets()
		fetchWorkloadIdentities()
		fetchDisks()
	}

	let showEnvText = $state(false)
	let envText = $state('')

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

	function convertSidecar () {
		if (!form.sidecar.type) {
			return []
		}
		return [
			{
				cloudSqlProxy: {
					instance: form.sidecar.cloudSqlProxy.instance,
					port: form.sidecar.cloudSqlProxy.port,
					credentials: form.sidecar.cloudSqlProxy.credentials
				}
			}
		]
	}

	let saving = $state(false)

	/**
	 * @param {Event} e
	 */
	async function save (e) {
		e.preventDefault()

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
				mountData: form.mountData.reduce((p, x) => { p[x.k] = x.v; return p }, {}),
				sidecars: convertSidecar()
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

<div class="nm-breadcrumb">
	<div class="nm-breadcrumb-item">
		<a href={`/deployment?project=${project}`} class="nm-link"><h6>Deployments</h6></a>
	</div>
	{#if deployment}
		<div class="nm-breadcrumb-item">
			<a href={`/deployment/detail?project=${project}&location=${deployment.location}&name=${deployment.name}`} class="nm-link">
				<h6>{deployment.name}</h6>
			</a>
		</div>
	{/if}
	<div class="nm-breadcrumb-item">
		<h6>Deploy</h6>
	</div>
</div>

<br>

<div class="nm-panel is-level-300 _dp-g _g-7">
	<div class="lo-12 _jtfit-st _g-5">
		{#if deployment}
			<h5><strong>Deploy new revision</strong></h5>
		{:else}
			<h5><strong>Deploy new deployment</strong></h5>
		{/if}
	</div>
	<hr>

	<form class="_dp-g _g-6 _w-100pct" onsubmit={save}>
		{#if deployment}
			<div class="nm-field">
				<label for="input-location-readonly">Location</label>
				<div class="nm-input">
					<input id="input-location-readonly" value={deployment.location} readonly>
				</div>
			</div>
		{:else}
			<div class="nm-field">
				<label for="input-location">Location</label>
				<div class="nm-select">
					<select id="input-location" bind:value={form.location} onchange={changeLocation} required>
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

		{#if selectedLocation}
			<div class="nm-field">
				<label for="input-name">Name</label>
				<div class="nm-input">
					<input id="input-name" placeholder="name" bind:value={form.name} readonly={!!deployment}>
				</div>
			</div>

			{#if deployment}
				<div class="nm-field">
					<label for="input-type-readonly">Type</label>
					<div class="nm-input">
						<input id="input-type-readonly" value={format.deploymentType(deployment.type)} readonly>
					</div>
				</div>
			{:else}
				<div class="nm-field">
					<label for="input-type">Type</label>
					<div class="nm-select">
						<select id="input-type" class="js-type" bind:value={form.type}>
							<option value="WebService">Web Service</option>
							<option value="InternalTCPService">Internal TCP Service</option>
							<option value="Worker">Worker</option>
							<option value="CronJob">CronJob</option>
						</select>
					</div>
				</div>
			{/if}

		<div class="nm-field">
			<label for="input-image">Image</label>
			<div class="nm-input">
				<input id="input-image" placeholder="image" bind:value={form.image}>
			</div>
		</div>

		{#if permission.pullSecrets}
			<div class="nm-field">
				<label for="input-pull_secret">Pull Secret</label>
				<div class="nm-select">
					{#key pullSecrets}
						<select id="input-pull_secret" bind:value={form.pullSecret}>
							<option value="">No Pull Secret</option>
							{#each pullSecrets as it (it.name)}
								<option value={it.name}>{it.name}</option>
							{/each}
						</select>
					{/key}
				</div>
			</div>
		{:else}
			<div class="nm-field">
				<label for="input-pull_secret-text">Pull Secret</label>
				<div class="nm-input">
					<input id="input-pull_secret-text" placeholder="Pull Secret Name" bind:value={form.pullSecret}>
				</div>
				<p class="_fs-1">* You don't have permission to list pull secrets</p>
			</div>
		{/if}

		{#if selectedLocation?.features.workloadIdentity}
			{#if permission.workloadIdentities}
				<div class="nm-field">
					<label for="input-workload_identity">Workload Identity</label>
					<div class="nm-select">
						{#key workloadIdentities}
							<select id="input-workload_identity" bind:value={form.workloadIdentity}>
								<option value="">No Workload Identity</option>
								{#each workloadIdentities as it (it.name)}
									<option value={it.name}>{it.name}</option>
								{/each}
							</select>
						{/key}
					</div>
				</div>
			{:else}
				<div class="nm-field">
					<label for="input-workload_identity-text">Workload Identity</label>
					<div class="nm-input">
						<input id="input-workload_identity-text" placeholder="Workload Identity Name" bind:value={form.workloadIdentity}>
					</div>
					<p class="_fs-1">* You don't have permission to list workload identities</p>
				</div>
			{/if}
		{/if}

		{#if ['WebService', 'TCPService', 'InternalTCPService'].includes(form.type)}
			<div class="nm-field">
				<label for="input-port">Port</label>
				<div class="nm-input">
					<input class="-no-arrow" id="input-port" placeholder="8080" type="number" bind:value={form.port}>
				</div>
			</div>
		{/if}

		{#if form.type === 'WebService'}
			<div class="nm-field">
				<label for="input-protocol">Protocol</label>
				<div class="nm-select">
					<select id="input-protocol" bind:value={form.protocol}>
						<option value="http">http</option>
						<option value="https">https</option>
						<option value="h2c">h2c</option>
					</select>
				</div>
			</div>
			<div class="nm-field">
				<div class="nm-checkbox">
					<input id="input-internal" type="checkbox" bind:checked={form.internal}>
					<label for="input-internal">Internal Service</label>
				</div>
			</div>
		{/if}

		<div class="nm-field">
			<label for="div-command">Command</label>
			<div id="div-command" class="_pdbt-4">
				{#each form.command as _, i (i)}
					<div class="nm-input -has-icon-right _mgbt-4">
						<input bind:value={form.command[i]}>
						<button class="icon-button icon -is-right" type="button" aria-label="Remove"
							onclick={() => { form.command = form.command.filter((_, k) => k !== i) }}>
							<i class="fa-solid fa-trash-alt"></i>
						</button>
					</div>
				{/each}
			</div>
			<button class="nm-button _mg-at" type="button" onclick={() => { form.command = [...form.command, ''] }}>
				<i class="fa-solid fa-plus _mgr-5"></i>
				<span>Add Command</span>
			</button>
		</div>

		<div class="nm-field">
			<label for="div-args">Args</label>
			<div id="div-args" class="_pdbt-4">
				{#each form.args as _, i (i)}
					<div class="nm-input -has-icon-right _mgbt-4">
						<input bind:value={form.args[i]}>
						<button class="icon-button icon -is-right" type="button" aria-label="Remove an argument"
							onclick={() => { form.args = form.args.filter((_, k) => k !== i) }}>
							<i class="fa-solid fa-trash-alt"></i>
						</button>
					</div>
				{/each}
			</div>
			<button class="nm-button _mg-at" type="button"
					onclick={() => { form.args = [...form.args, ''] }}>
				<i class="fa-solid fa-plus _mgr-5"></i>
				<span>Add Arg</span>
			</button>
		</div>

		{#if form.type === 'CronJob'}
			<div class="nm-field">
				<label for="input-schedule">Schedule</label>
				<div class="nm-input">
					<input id="input-schedule" placeholder="*/5 * * * *" bind:value={form.schedule}>
				</div>
			</div>
		{/if}

		{#if selectedLocation.features.disk}
			<div class="_dp-g _g-6">
				<br>
				<hr>
				<br>

				<h6><strong>Disk</strong></h6>

				{#if permission.disks}
					<div class="nm-field">
						<label for="input-disk_name">Name</label>
						<div class="nm-select">
							{#key disks}
								<select id="input-disk_name" bind:value={form.disk.name}>
									<option value="">No Disk</option>
									{#each disks as it (it.name)}
										<option value={it.name}>{it.name}</option>
									{/each}
								</select>
							{/key}
						</div>
					</div>
				{:else}
					<div class="nm-field">
						<label for="input-disk_name-text">Name</label>
						<div class="nm-input">
							<input id="input-disk_name-text" placeholder="Disk Name" bind:value={form.disk.name}>
						</div>
						<p class="_fs-1">* You don't have permission to list disks</p>
					</div>
				{/if}

				{#if form.disk.name}
					<div class="nm-field">
						<label for="input-disk_mount_path">Mount Path</label>
						<div class="nm-input">
							<input id="input-disk_mount_path" placeholder="" bind:value={form.disk.mountPath}>
						</div>
					</div>
					<div class="nm-field">
						<label for="input-disk_sub_path">Sub Path</label>
						<div class="nm-input">
							<input id="input-disk_sub_path" placeholder="" bind:value={form.disk.subPath}>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		{#if ['WebService', 'Worker', 'InternalTCPService'].includes(form.type)}
			<div>
				<div class="_dp-g _g-6">
					<br>
					<hr>
					<br>

					<h6><strong>Autoscaling</strong></h6>
					<div class="lo-6 _g-6">
						<div class="nm-field">
							<label for="input-min_replicas">Min Replicas</label>
							<div class="nm-input">
								<input id="input-min_replicas"
									bind:value={form.minReplicas}
									type="number"
									min="1"
									max={quota.deploymentMaxReplicas}>
							</div>
						</div>

						<div class="nm-field">
							<label for="input-max_replicas">Max Replicas</label>
							<div class="nm-input">
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

<!--        <div class="nm-field">-->
<!--            <label for="input-cpu">CPU allocated</label>-->
<!--            <div class="nm-select">-->
<!--                <select id="input-cpu" name="cpu">-->
<!--                    {{range .Location.CPUAllocatable}}-->
<!--                    <option value="{{.}}" {{if eq . $.Form.CPU}}selected{{end}}>{{. | textDeploymentCPU}}</option>-->
<!--                    {{end}}-->
<!--                </select>-->
<!--            </div>-->
<!--            <small class="helper">-->
<!--                Number of vCPUs allocated to each container instance.-->
<!--            </small>-->
<!--        </div>-->

		<div class="nm-field">
			<label for="input-cpu-limit">CPU limited</label>
            <div class="nm-select">
                <select id="input-cpu-limit" name="cpu" bind:value={form.resources.limits.cpu}>
                    <option value="0">Cluster Default</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="4">4</option>
                </select>
            </div>
            <small class="helper">
                Number of vCPUs limit to each container instance. Autoscale trigger when CPU hit 80% of the limit.
            </small>
        </div>

		<div class="nm-field">
			<label for="input-memory">Memory allocated</label>
			<div class="nm-select">
				<select id="input-memory" bind:value={form.resources.requests.memory}>
					{#each selectedLocation.memoryAllocatable as it}
						<option value={it}>{format.memory(it)}</option>
					{/each}
				</select>
			</div>
			<small class="helper">
				Memory to allocate to each container instance.
			</small>
		</div>

		<br>
		<hr>
		<br>

		<h6><strong>Environment Variables</strong></h6>
		<div>
			<div class="nm-table-container">
				<table class="nm-table">
					<thead>
						<tr>
							<th>Key</th>
							<th class="is-collapse _pd-0"></th>
							<th>Value</th>
							<th class="is-collapse is-align-right"></th>
						</tr>
					</thead>
					<tbody>
						{#each form.env as it, i}
							<tr>
								<td>
									<div class="nm-input">
										<input bind:value={it.k} placeholder="Variable name" onchange={parseEnvValue}>
									</div>
								</td>
								<td class="_pd-0 _pdl-5">:</td>
								<td class="_pdl-5">
									<div class="nm-input">
										<input bind:value={it.v} placeholder="Value" onchange={parseEnvValue}>
									</div>
								</td>
								<td style="padding: 19px 12px;">
									<button class="icon-button" type="button" aria-label="Remove an environment variable"
										onclick={() => { form.env = form.env.filter((_, k) => k !== i); parseEnvValue() }}>
										<i class="fa-solid fa-trash-alt"></i>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr>
							<td colspan="4">
								<button class="nm-button _dp-f _mg-at" type="button"
									onclick={() => { form.env = [...form.env, { k: '', v: '' }]; parseEnvValue() }}>
									<i class="fa-solid fa-plus _mgr-5"></i>
									<span>Add Variable</span>
								</button>
							</td>
						</tr>
					</tfoot>
				</table>
			</div>

			<button class="nm-button _dp-f _mg-at" type="button" onclick={() => showEnvText = !showEnvText}>
				{#if showEnvText}Hide{:else}Show{/if}&nbsp;Text Editor
			</button>
			{#if showEnvText}
				<div class="nm-textarea _mgt-5">
					<textarea rows="20" bind:value={envText} onchange={parseEnvText}></textarea>
				</div>
			{/if}
		</div>

		<hr>

		<h6><strong>Mount Data</strong></h6>
		<div>
			<div class="nm-table-container">
				<table class="nm-table">
					<thead>
						<tr>
							<th>Path</th>
							<th class="is-collapse _pd-0"></th>
							<th>Data</th>
							<th class="is-collapse is-align-right"></th>
						</tr>
					</thead>
					<tbody>
						{#each form.mountData as it, i}
							<tr>
								<td>
									<div class="nm-input">
										<input bind:value={it.k} placeholder="Path">
									</div>
								</td>
								<td class="_pd-0 _pdl-5">:</td>
								<td class="_pdl-5">
									<div class="nm-textarea">
										<textarea bind:value={it.v} placeholder="Data"></textarea>
									</div>
								</td>
								<td style="padding: 19px 12px;">
									<button class="icon-button" type="button" aria-label="Remove a mount data"
										onclick={() => { form.mountData = form.mountData.filter((_, k) => k !== i) }}>
										<i class="fa-solid fa-trash-alt"></i>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
					<tr>
						<td colspan="4">
							<button class="nm-button _dp-f _mg-at" type="button"
								onclick={() => { form.mountData = [...form.mountData, { k: '', v: '' }] }}>
								<i class="fa-solid fa-plus _mgr-5"></i>
								<span>Add Data</span>
							</button>
						</td>
					</tr>
					</tfoot>
				</table>
			</div>
		</div>

		<hr>

		<h6><strong>Sidecar</strong></h6>
		<div class="_dp-g _g-6">
			<div class="nm-field">
				<label for="input-sidecar-type">Type</label>
				<div class="nm-select">
					<select id="input-sidecar-type" bind:value={form.sidecar.type}>
						<option value="">None</option>
						<option value="cloudSqlProxy">Cloud SQL Proxy</option>
					</select>
				</div>
			</div>
			{#if form.sidecar.type === 'cloudSqlProxy'}
				<div class="nm-field">
					<label for="input-sidecar-instance">Instance</label>
					<div class="nm-input">
						<input id="input-sidecar-instance" placeholder="Instance" bind:value={form.sidecar.cloudSqlProxy.instance} required>
					</div>
				</div>
				<div class="nm-field">
					<label for="input-sidecar-port">Port</label>
					<div class="nm-input">
						<input class="-no-arrow" id="input-sidecar-port" placeholder="Port" type="number" bind:value={form.sidecar.cloudSqlProxy.port} required>
					</div>
				</div>
				<div class="nm-field">
					<label for="input-sidecar-credentials">Credentials</label>
					<div class="nm-input">
						<input id="input-sidecar-credentials" placeholder="Credentials" bind:value={form.sidecar.cloudSqlProxy.credentials}>
					</div>
				</div>
			{/if}
<!--			<button class="nm-button _dp-f _mg-at" type="button"-->
<!--					onclick={() => { form.sidecars.push({}) }}>-->
<!--				<i class="fa-solid fa-plus _mgr-5"></i>-->
<!--				<span>Add Sidecar</span>-->
<!--			</button>-->
		</div>

		<hr>

		<button class="nm-button _mgt-6 _mgr-at" class:is-loading={saving}>
			Deploy
		</button>
	{/if}
	</form>
</div>
