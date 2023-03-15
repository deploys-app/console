<script>
	import { createEventDispatcher } from 'svelte'
	import { page } from '$app/stores'
	import { project } from '$lib/stores'

	export let projects
	$: menu = $page.data.menu || ''
	$: projectName = projects.find((p) => p.project === $project)?.name || $project

	const dispatch = createEventDispatcher()

	function openProjectModal () {
		dispatch('openProjectModal')
	}
</script>

<style lang="scss">
	.sidebar {
		width: var(--width-sidebar, 300px);
		min-height: 100vh;

		background-color: var(--color-neutral-600);
		box-shadow: var(--raised-z10);
	}

	.site-logo {
		margin: 0 auto;
		width: 100px;

		img {
			width: 100%;
			max-width: 100%;
			height: auto;
		}
	}

	.project-box {
		display: flex;
		padding: 10px 12px;
		background-color: var(--color-neutral-500);
		font-size: 0.9375rem;
		border-radius: 4px;
		border: 1px solid var(--color-neutral-400);
		color: var(--color-light-primary);
		outline: none;
		transition: all var(--timing-normal) ease;
		box-shadow: var(--raised-z6);

		&:hover {
			border: 1px solid var(--color-neutral-300);
		}

		span {
			width: 150px;
			flex: 1;
			text-overflow: ellipsis;
			white-space: nowrap;
			overflow-x: hidden;
		}
	}
</style>

<nav class="sidebar _pdt-16px _pst-asl _zid-1 _dp-f _fdrt-cl _h-100vh _ovfy-at">
	<div class="site-logo">
		<img src="/images/logo.png" alt="Deploys.app" draggable="false">
	</div>

	<div class="_f-1">
		<div class="lo-12 _gg-12px _pdh-12px _mgt-32px">
			<small class="_dp-f _jtfct-spbtw">
				<strong>CURRENT PROJECT</strong>
			</small>

			<div class="project-box _cs-pt" on:click={openProjectModal}>
				<span>
					{#if $project}
						{projectName}
					{:else}
						&#45;&#45;PROJECT&#45;&#45;
					{/if}
				</span>
				<i class="fa-solid fa-caret-down _mgl-4px"></i>
			</div>

			<div class="u-halign-right">
				<a href="/project">
					<small class="link">View all projects</small>
				</a>
			</div>
		</div>
		<br>

		<div>
			<ul class="sidebar-menus">
				{#if $project}
					<li>
						<a href={`/?project=${$project}`} title="Dashboard">
							<div class="menu-item" class:is-active={menu === 'dashboard'}>
								<span class="menu-icon">
									<i class="fa-solid fa-columns"></i>
								</span>
								<span>Dashboard</span>
							</div>
						</a>
					</li>
					<li>
						<a href={`/deployment?project=${$project}`} title="Deployments">
							<div class="menu-item" class:is-active={menu === 'deployment'}>
								<span class="menu-icon">
									<i class="fa-solid fa-rocket"></i>
								</span>
								<span>Deployments</span>
							</div>
						</a>
					</li>
					<li>
						<a href={`/domain?project=${$project}`} title="Domains">
							<div class="menu-item" class:is-active={menu === 'domain'}>
								<span class="menu-icon">
									<i class="fa-solid fa-globe"></i>
								</span>
								<span>Domains</span>
							</div>
						</a>
					</li>
					<li>
						<a href={`/route?project=${$project}`} title="Routes">
							<div class="menu-item" class:is-active={menu === 'route'}>
								<span class="menu-icon">
									<i class="fa-solid fa-router"></i>
								</span>
								<span>Routes</span>
							</div>
						</a>
					</li>
					<li>
						<a href={`/workload-identity?project=${$project}`} title="Workload Identities">
							<div class="menu-item" class:is-active={menu === 'workload-identity'}>
								<span class="menu-icon">
									<i class="fa-solid fa-network-wired"></i>
								</span>
								<span>Workload Identities</span>
							</div>
						</a>
					</li>
					<li>
						<a href={`/disk?project=${$project}`} title="Disks">
							<div class="menu-item" class:is-active={menu === 'disk'}>
								<span class="menu-icon">
									<i class="fa-solid fa-hdd"></i>
								</span>
								<span>Disks</span>
							</div>
						</a>
					</li>
					<li>
						<a href={`/pull-secret?project=${$project}`} title="Pull Secrets">
							<div class="menu-item" class:is-active={menu === 'pull-secret'}>
								<span class="menu-icon">
									<i class="fa-solid fa-key"></i>
								</span>
								<span>Pull Secrets</span>
							</div>
						</a>
					</li>
					<li>
						<a href={`/role?project=${$project}`} title="Roles">
							<div class="menu-item" class:is-active={menu === 'role'}>
								<span class="menu-icon">
									<i class="fa-solid fa-user-tag"></i>
								</span>
								<span>Roles</span>
							</div>
						</a>
					</li>
					<li>
						<a href={`/role/users?project=${$project}`} title="Users">
							<div class="menu-item" class:is-active={menu === 'role.users'}>
								<span class="menu-icon">
									<i class="fa-solid fa-users"></i>
								</span>
								<span>Users</span>
							</div>
						</a>
					</li>
					<li>
						<a href={`/service-account?project=${$project}`} title="Service Accounts">
							<div class="menu-item" class:is-active={menu === 'service-account'}>
								<span class="menu-icon">
									<i class="fa-solid fa-user-lock"></i>
								</span>
								<span>Service Accounts</span>
							</div>
						</a>
					</li>
					<li>
						<a href={`/email?project=${$project}`} title="Emails">
							<div class="menu-item" class:is-active={menu === 'email'}>
								<span class="menu-icon">
									<i class="fa-solid fa-envelope"></i>
								</span>
								<span>Emails</span>
							</div>
						</a>
					</li>
				{/if}
			</ul>
		</div>
	</div>

	<div class="_mgt-16px _pdbt-12px">
		<div class="_pdh-12px _mgbt-12px">
			<hr>
		</div>
		<div class="_dp-f _jtfct-spbtw _alit-ct _fdrt-cl">
			<div class="_dp-f _jtfct-fe _alit-ct _gg-8px _w-100pct _pdh-16px">
				<a href="https://github.com/deploys-app" target="_blank" class="_dp-f _jtfct-ct _alit-ct _bgcl-neutral-100 _bgcl-neutral-200-hover _bdrd-4px _w-32px _h-32px">
					<i class="fa-brands fa-github"></i>
				</a>
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
