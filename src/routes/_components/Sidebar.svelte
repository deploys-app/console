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

<nav class="moon-sidebar _pdt-16px _pst-asl _zid-1 _dp-f _fdrt-cl">
	<div class="site-logo">
		<img src="/images/logo.png" alt="Deploys.app" draggable="false">
	</div>

	<div class="_f-1">
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
					<a sveltekit:prefetch href={`/?project=${$project}`} title="Dashboard">
						<div class="menu-item" class:is-active={$page.stuff.menu === 'dashboard'}>
							<span class="menu-icon">
								<i class="fas fa-columns"></i>
							</span>
							<span>Dashboard</span>
						</div>
					</a>
				</li>
				<li>
					<a sveltekit:prefetch href={`/deployment?project=${$project}`} title="Deployments">
						<div class="menu-item" class:is-active={$page.stuff.menu === 'deployment'}>
							<span class="menu-icon">
								<i class="fas fa-rocket"></i>
							</span>
							<span>Deployments</span>
						</div>
					</a>
				</li>
				<li>
					<a sveltekit:prefetch href={`/route?project=${$project}`} title="Routes">
						<div class="menu-item" class:is-active={$page.stuff.menu === 'route'}>
							<span class="menu-icon">
								<i class="fas fa-router"></i>
							</span>
							<span>Routes</span>
						</div>
					</a>
				</li>
				<li>
					<a sveltekit:prefetch href={`/workload-identity?project=${$project}`} title="Workload Identities">
						<div class="menu-item" class:is-active={$page.stuff.menu === 'workload-identity'}>
							<span class="menu-icon">
								<i class="fas fa-network-wired"></i>
							</span>
							<span>Workload Identities</span>
						</div>
					</a>
				</li>
				<li>
					<a sveltekit:prefetch href={`/disk?project=${$project}`} title="Disks">
						<div class="menu-item" class:is-active={$page.stuff.menu === 'disk'}>
							<span class="menu-icon">
								<i class="fas fa-hdd"></i>
							</span>
							<span>Disks</span>
						</div>
					</a>
				</li>
				<li>
					<a sveltekit:prefetch href={`/pull-secret?project=${$project}`} title="Pull Secrets">
						<div class="menu-item" class:is-active={$page.stuff.menu === 'pull-secret'}>
							<span class="menu-icon">
								<i class="fas fa-key"></i>
							</span>
							<span>Pull Secrets</span>
						</div>
					</a>
				</li>
				<li>
					<a sveltekit:prefetch href={`/role?project=${$project}`} title="Roles">
						<div class="menu-item" class:is-active={$page.stuff.menu === 'role'}>
							<span class="menu-icon">
								<i class="fas fa-user-tag"></i>
							</span>
							<span>Roles</span>
						</div>
					</a>
				</li>
				<li>
					<a sveltekit:prefetch href={`/role/users?project=${$project}`} title="Users">
						<div class="menu-item" class:is-active={$page.stuff.menu === 'role.users'}>
							<span class="menu-icon">
								<i class="fas fa-users"></i>
							</span>
							<span>Users</span>
						</div>
					</a>
				</li>
				<li>
					<a sveltekit:prefetch href={`/service-account?project=${$project}`} title="Users">
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
	</div>

	<div class="_mgt-16px _pdbt-12px">
		<div class="_pdh-12px _mgbt-12px">
			<hr>
		</div>
        <div class="_dp-f _jtfct-spbtw _alit-ct _fdrt-cl">
            <div class="_dp-f _jtfct-fe _alit-ct _gg-8px _w-100pct _pdh-16px">
                <strong class="_fw-500 _fs-300">Contact us</strong>
                <a href="https://discord.gg/5ZttPJsypS" target="_blank" class="_dp-f _jtfct-ct _alit-ct _bgcl-neutral-100 _bgcl-neutral-200-hover _bdrd-4px _w-32px _h-32px">
                    <i class="fa-brands fa-discord"></i>
                </a>
                <a href="mailto:contact@moonrhythm.io" target="_blank" class="_dp-f _jtfct-ct _alit-ct _bgcl-neutral-100 _bgcl-neutral-200-hover _bdrd-4px _w-32px _h-32px">
					<i class="fa-solid fa-envelope"></i>
                </a>
            </div>
        </div>
	</div>
</nav>
