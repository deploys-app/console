<script>
	import DeploymentStatusIcon from '$lib/components/DeploymentStatusIcon.svelte'
	import { page } from '$app/stores'

	export let deployment

	$: project = $page.stuff.project
</script>

<div class="lo-12 _gg-12px">
	<div class="_dp-g _gg-12px _gatf-r _gatf-cl-lg">
		<h3 class="_dp-f _fw-w _alit-fst _mgr-24px _mgbt-16px _mgbt-0px-lg">
			<div>
				<DeploymentStatusIcon action={deployment.action} status={deployment.status} url={deployment.statusUrl} />
			</div>
			<div>
				{deployment.name}
				<div class="_fs-400 _cl-dark-secondary _mgt-4px _wb-ba">{deployment.image}</div>
			</div>
		</h3>
		<div class="_dp-f _alit-ct _fw-w">
			<a class="moon-button -info -small _mgl-at-lg _mgr-24px _mgbt-16px _mgbt-0px-lg"
				href={`/deployment/deploy?project=${project}&location=${deployment.location}&name=${deployment.name}`}>
				Deploy New Revision
			</a>
			<!--{{if .CanPause}}-->
			<!--<form action="{{route "deployment.pause"}}" method="POST" data-confirm="Pause {{.Deployment.Name}}" data-confirm-yes="Pause">-->
			<!--	<input name="project" type="hidden" value="{{.Page.Project}}">-->
			<!--<input type="hidden" name="location" value="{{.Deployment.Location}}">-->
			<!--<input type="hidden" name="name" value="{{.Deployment.Name}}">-->
			<!--<button class="moon-button -info -small _mgl-at-lg _mgr-24px _mgbt-16px _mgbt-0px-lg"><i class="fas fa-pause"></i>&nbsp;&nbsp;Pause</button>-->
			<!--</form>-->
			<!--{{end}}-->
			<!--{{if .CanResume}}-->
			<!--<form action="{{route "deployment.resume"}}" method="POST" data-confirm="Resume {{.Deployment.Name}}" data-confirm-yes="Resume">-->
			<!--		<input name="project" type="hidden" value="{{.Page.Project}}">-->
			<!--<input type="hidden" name="location" value="{{.Deployment.Location}}">-->
			<!--<input type="hidden" name="name" value="{{.Deployment.Name}}">-->
			<!--<button class="moon-button -info -small _mgl-at-lg _mgr-24px _mgbt-16px _mgbt-0px-lg"><i class="fas fa-play"></i>&nbsp;&nbsp;Resume</button>-->
			<!--</form>-->
			<!--{{end}}-->
		</div>
	</div>
</div>

<hr>

<div class="nav-tabs-wrap _fdrt-cl _fdrt-r-md">
	<ul class="nav nav-tabs _mgbt-20px _mgbt-0px-lg _w-100pct">
		<li class="nav-item">
			<a class="nav-link" class:active={$page.url.pathname === '/deployment/metrics'} href={`/deployment/metrics?project=${project}&location=${deployment.location}&name=${deployment.name}`}>Metric</a>
		</li>
		<li class="nav-item">
			<a class="nav-link" class:active={$page.url.pathname === '/deployment/detail'} href={`/deployment/detail?project=${project}&location=${deployment.location}&name=${deployment.name}`}>Details</a>
		</li>
		<li class="nav-item">
			<a class="nav-link" class:active={$page.url.pathname === '/deployment/revision'} href={`/deployment/revision?project=${project}&location=${deployment.location}&name=${deployment.name}`}>Revision</a>
		</li>
		<li class="nav-item">
			<a class="nav-link" class:active={$page.url.pathname === '/deployment/logs'} href={`/deployment/logs?project=${project}&location=${deployment.location}&name=${deployment.name}`}>Logs</a>
		</li>
		<li class="nav-item">
			<a class="nav-link" class:active={$page.url.pathname === '/deployment/events'} href={`/deployment/events?project=${project}&location=${deployment.location}&name=${deployment.name}`}>Events</a>
		</li>
	</ul>
</div>
