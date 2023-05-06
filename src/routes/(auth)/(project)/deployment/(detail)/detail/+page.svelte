<script>
	import { onMount } from 'svelte'
	import ClipboardJS from 'clipboard'
	import * as format from '$lib/format'
	import { goto } from '$app/navigation'
	import * as modal from '$lib/modal'
	import api from '$lib/api'
	import Secret from '$lib/components/Secret.svelte'

	export let data

	$: deployment = data.deployment
	$: location = data.location

	$: hasExternalTCPAddress = ['TCPService'].includes(deployment.type)
	$: hasInternalTCPAddress = ['WebService', 'TCPService', 'InternalTCPService'].includes(deployment.type)

	onMount(() => {
		const copyList = new ClipboardJS('.copy')
		return () => {
			copyList.destroy()
		}
	})

	function deleteItem () {
		modal.confirm({
			title: `Delete "${deployment.name}" ?`,
			yes: 'Delete',
			callback: async () => {
				const resp = await api.invoke('deployment.delete', {
					project: deployment.project,
					location: deployment.location,
					name: deployment.name
				}, fetch)
				if (!resp.ok) {
					modal.error({ error: resp.error })
					return
				}
				goto(`/deployment?project=${deployment.project}`)
			}
		})
	}
</script>

<h6><strong>Deployment details</strong></h6>
<div class="table-container">
	<table class="table">
		{#if deployment.type === 'WebService'}
			{#if !deployment.internal}
				<tr>
					<td>URL</td>
					<td>
						<a class="link _tdcrt-udl" href={`https://${deployment.url}`} target="_blank">
							{`https://${deployment.url}`}
						</a>
						<span class="_cl-text-mute _cl-white-hover _cs-pt _ussl-n _mgl-12px _fs-600 copy" data-clipboard-text={`https://${deployment.url}`}>
							<i class="fa-light fa-copy"></i>
						</span>
					</td>
				</tr>
			{/if}
			<tr>
				<td>Internal URL</td>
				<td>
					http://{deployment.internalUrl}
					<span class="_cl-text-mute _cl-white-hover _cs-pt _ussl-n _mgl-12px _fs-600 copy" data-clipboard-text={`http://${deployment.internalUrl}`}>
						<i class="fa-light fa-copy"></i>
					</span>
				</td>
			</tr>
		{/if}
		{#if hasExternalTCPAddress}
			<tr>
				<td>Address</td>
				<td>{deployment.address}:{deployment.nodePort}</td>
			</tr>
		{/if}
		{#if hasInternalTCPAddress}
			<tr>
				<td>Internal Address</td>
				<td>
					{deployment.internalAddress}:{deployment.port}
					<span class="_cl-text-mute _cl-white-hover _cs-pt _ussl-n _mgl-12px _fs-600 copy" data-clipboard-text={`${deployment.internalAddress}:${deployment.port}`}>
						<i class="fa-light fa-copy"></i>
					</span>
				</td>
			</tr>
		{/if}
		<tr>
			<td>Type</td>
			<td>
				{format.deploymentType(deployment.type)}
				{#if deployment.internal}
					(Internal)
				{/if}
			</td>
		</tr>
		<tr>
			<td>Location</td>
			<td>
				{deployment.location}
				<span class="_cl-text-mute _cl-white-hover _cs-pt _ussl-n _mgl-12px _fs-600 copy" data-clipboard-text={`${deployment.location}`}>
					<i class="fa-light fa-copy"></i>
				</span>
			</td>
		</tr>
		<tr>
			<td>Image</td>
			<td>
				{deployment.image}
				<span class="_cl-text-mute _cl-white-hover _cs-pt _ussl-n _mgl-12px _fs-600 copy" data-clipboard-text={`${deployment.image}`}>
					<i class="fa-light fa-copy"></i>
				</span>
			</td>
		</tr>
		{#if deployment.type === 'WebService'}
			<tr>
				<td>Port</td>
				<td>{deployment.port}{deployment.protocol ? `:${deployment.protocol}` : ''}</td>
			</tr>
		{:else if deployment.type === 'TCPService'}
			<tr>
				<td>Port</td>
				<td>{deployment.port}:{deployment.nodePort}</td>
			</tr>
		{/if}
		{#if location.features.disk}
			<tr>
				<td>Disk</td>
				<td>
					{#if deployment.disk}
						{deployment.disk.name}
						(mount: {deployment.disk.mountPath || '-'}, sub: {deployment.disk.subPath || '-'})
					{:else}
						-
					{/if}
				</td>
			</tr>
		{/if}
		{#if deployment.minReplicas > 0}
		<tr>
			<td>Replicas</td>
			<td>
				{#if deployment.minReplicas > 0}
					{#if deployment.minReplicas === deployment.maxReplicas}
						{deployment.minReplicas}
					{:else}
						{deployment.minReplicas} - {deployment.maxReplicas}
					{/if}
				{:else}
					-
				{/if}
			</td>
		</tr>
		{/if}
		{#if deployment.type === 'CronJob'}
			<tr>
				<td>Schedule</td>
				<td>{deployment.schedule}</td>
			</tr>
		{/if}
		<tr>
			<td>Command</td>
			<td>{deployment.command.join(' ') || '-'}</td>
		</tr>
		<tr>
			<td>Args</td>
			<td>{deployment.args.join(' ') || '-'}</td>
		</tr>
		<tr>
			<td>Pull Secret</td>
			<td>{deployment.pullSecret || '-'}</td>
		</tr>
		{#if location.features.workloadIdentity}
			<tr>
				<td>Workload Identity</td>
				<td>{deployment.workloadIdentity || '-'}</td>
			</tr>
		{/if}
		<!--{{/*			<tr>*/}}-->
		<!--{{/*				<td>CPU allocated</td>*/}}-->
		<!--{{/*				<td>{{.Deployment.Resources.Requests.CPU | textDeploymentCPU}}</td>*/}}-->
		<!--{{/*			</tr>*/}}-->
		<tr>
			<td>Memory allocated</td>
			<td>{format.memory(deployment.resources.requests.memory)}</td>
		</tr>
		<tr>
			<td>Deployed At</td>
			<td>{format.datetime(deployment.createdAt)}</td>
		</tr>
		<tr>
			<td>Deployed By</td>
			<td>{deployment.createdBy}</td>
		</tr>
		<tr>
			<td>Allocated Price</td>
			<td>{deployment.allocatedPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} THB/month/replica</td>
		</tr>
	</table>
</div>

<div class="_dp-f _fw-w _alit-ct _mgv-32px">
	<div class="_mgl-at-lg _mgbt-12px _mgbt-0px-lg">
		<button class="button -danger -small" type="button" on:click={deleteItem}>Delete</button>
	</div>
</div>

<h6><strong>Environment variables</strong></h6>
<div class="table-container">
	<table class="table">
		<thead>
		<tr>
			<th>Env</th>
			<th>Value</th>
		</tr>
		</thead>
		<tbody>
		{#each Object.entries(deployment.env || {}) as [k, v]}
			<tr>
				<td>{k}</td>
				<td>
					<Secret value={v} />
				</td>
			</tr>
		{:else}
			<tr>
				<td class="_tal-ct _cl-text-mute" colspan="2">No data</td>
			</tr>
		{/each}
		</tbody>
	</table>
</div>

<h6><strong>Mount Data</strong></h6>
<div class="table-container">
	<table class="table">
		<thead>
		<tr>
			<th>Path</th>
			<th>Data</th>
		</tr>
		</thead>
		<tbody>
		{#each Object.entries(deployment.mountData || {}) as [k, v]}
			<tr>
				<td>{k}</td>
				<td class="_wsp-p">{v}</td>
			</tr>
		{:else}
			<tr>
				<td class="_tal-ct _cl-text-mute" colspan="2">No data</td>
			</tr>
		{/each}
		</tbody>
	</table>
</div>
