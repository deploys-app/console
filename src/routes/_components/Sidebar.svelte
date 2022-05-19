<script>
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { project } from '$lib/stores'

	export let projects

	function setProject (sid) {
		const q = new URLSearchParams($page.url.search)
		q.set('project', sid)

		if ($project) {
			goto(`?${q.toString()}`)
			return
		}
		goto(`/?${q.toString()}`)
	}
</script>

<nav class="moon-sidebar _pdt-16px _pst-asl _zid-1">
	<div class="site-logo">
		<img src="/images/logo.png" alt="Deploys.app" draggable="false">
	</div>

	<div class="lo-12 _gg-12px _pdh-12px _mgt-32px">
		<small class="_dp-f _jtfct-spbtw">
			<strong>CURRENT PROJECT</strong>
		</small>

		<div class="moon-select">
			<select on:change={(e) => setProject(e.target.value)}>
				<option value="" disabled selected="{!$project}">&#45;&#45;PROJECT&#45;&#45;</option>
				{#each projects as it}
					<option value={it.project} selected={$project === it.project}>{it.name}</option>
				{/each}
			</select>
		</div>

		<div class="u-halign-right">
			<a href="/project">
				<small class="moon-link">View all projects</small>
			</a>
		</div>
	</div>
	<br>

	<ul class="sidebar-menus">
		{#if $project}
			<li>
				<a href={`/?project=${$project}`} title="Dashboard">
					<div class="menu-item" class:is-active={$page.stuff.menu === 'dashboard'}>
						<span class="menu-icon">
							<i class="fas fa-columns"></i>
						</span>
						<span>Dashboard</span>
					</div>
				</a>
			</li>
			<li>
				<a href={`/deployment?project=${$project}`} title="Deployments">
					<div class="menu-item" class:is-active={$page.stuff.menu === 'deployment'}>
						<span class="menu-icon">
							<i class="fas fa-rocket"></i>
						</span>
						<span>Deployments</span>
					</div>
				</a>
			</li>
			<li>
				<a href={`/route?project=${$project}`} title="Routes">
					<div class="menu-item" class:is-active={$page.stuff.menu === 'route'}>
						<span class="menu-icon">
							<i class="fas fa-router"></i>
						</span>
						<span>Routes</span>
					</div>
				</a>
			</li>
			<li>
				<a href={`/workload-identity?project=${$project}`} title="Workload Identities">
					<div class="menu-item" class:is-active={$page.stuff.menu === 'workload-identity'}>
						<span class="menu-icon">
							<i class="fas fa-network-wired"></i>
						</span>
						<span>Workload Identities</span>
					</div>
				</a>
			</li>
			<li>
				<a href={`/disk?project=${$project}`} title="Disks">
					<div class="menu-item" class:is-active={$page.stuff.menu === 'disk'}>
						<span class="menu-icon">
							<i class="fas fa-hdd"></i>
						</span>
						<span>Disks</span>
					</div>
				</a>
			</li>
			<li>
				<a href={`/pull-secret?project=${$project}`} title="Pull Secrets">
					<div class="menu-item" class:is-active={$page.stuff.menu === 'pull-secret'}>
						<span class="menu-icon">
							<i class="fas fa-key"></i>
						</span>
						<span>Pull Secrets</span>
					</div>
				</a>
			</li>
			<li>
				<a href={`/role?project=${$project}`} title="Roles">
					<div class="menu-item" class:is-active={$page.stuff.menu === 'role'}>
						<span class="menu-icon">
							<i class="fas fa-user-tag"></i>
						</span>
						<span>Roles</span>
					</div>
				</a>
			</li>
			<li>
				<a href={`/role/users?project=${$project}`} title="Users">
					<div class="menu-item" class:is-active={$page.stuff.menu === 'role.users'}>
						<span class="menu-icon">
							<i class="fas fa-users"></i>
						</span>
						<span>Users</span>
					</div>
				</a>
			</li>
			<li>
				<a href={`/service-account?project=${$project}`} title="Users">
					<div class="menu-item" class:is-active={$page.stuff.menu === 'service-account'}>
						<span class="menu-icon">
							<i class="fas fa-user-lock"></i>
						</span>
						<span>Service Accounts</span>
					</div>
				</a>
			</li>
		{/if}
	</ul>
</nav>
