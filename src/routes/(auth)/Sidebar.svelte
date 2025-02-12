<script>
	import { page } from '$app/stores'

	/**
	 * @typedef {Object} Props
	 * @property {Api.Project[]} projects
	 * @property {() => void} openProjectModal
	 */

	/** @type {Props} */
	const { projects, openProjectModal } = $props()

	const pageMenu = $derived($page.data.menu || '')
	const project = $derived($page.url.searchParams.get('project'))
	const projectName = $derived(projects.find((p) => p.project === project)?.name || project)

	const projectMenuList = [
		{
			id: 'dashboard',
			title: 'Dashboard',
			icon: 'fa-columns',
			link: '/'
		},
		{
			id: 'deployment',
			title: 'Deployments',
			icon: 'fa-rocket',
			link: '/deployment'
		},
		{
			id: 'domain',
			title: 'Domains',
			icon: 'fa-globe',
			link: '/domain'
		},
		{
			id: 'route',
			title: 'Routes',
			icon: 'fa-router',
			link: '/route'
		},
		{
			id: 'workload-identity',
			title: 'Workload Identities',
			icon: 'fa-network-wired',
			link: '/workload-identity'
		},
		{
			id: 'disk',
			title: 'Disks',
			icon: 'fa-hdd',
			link: '/disk'
		},
		{
			id: 'pull-secret',
			title: 'Pull Secrets',
			icon: 'fa-key',
			link: '/pull-secret'
		},
		{
			id: 'role',
			title: 'Roles',
			icon: 'fa-user-tag',
			link: '/role'
		},
		{
			id: 'role.users',
			title: 'Users',
			icon: 'fa-users',
			link: '/role/users'
		},
		{
			id: 'service-account',
			title: 'Service Accounts',
			icon: 'fa-user-lock',
			link: '/service-account'
		},
		{
			id: 'email',
			title: 'Emails',
			icon: 'fa-envelope',
			link: '/email'
		},
		{
			id: 'dropbox',
			title: 'Dropbox (Alpha)',
			icon: 'fa-box-open',
			link: '/dropbox'
		},
		{
			id: 'registry',
			title: 'Registry (Alpha)',
			icon: 'fa-warehouse-full',
			link: '/registry'
		}
	]
</script>

<style lang="scss">
	.sidebar {
		width: var(--width-sidebar, 300px);
		min-height: 100vh;

		background-color: hsl(var(--hsl-base-300));
		box-shadow: var(--raised-z10);
	}

	.sidebar-menus {
		.menu-item {
			display: grid;
			grid-auto-flow: column;
			grid-gap: .75rem;

			justify-content: start;
			align-items: center;

			padding: .75rem 1rem;

			font-size: var(--fs-2);
			color: hsl(var(--hsl-content)/0.75);

			cursor: pointer;

			&:hover {
				background: hsl(var(--hsl-base-200));
			}

			&.is-active {
				color: hsl(var(--hsl-content));
				background: hsl(var(--hsl-base-200));
			}
		}

		.menu-icon {
			display: inline-flex;
			align-items: center;
			justify-content: center;

			width: 1.5rem;
			height: 1.5rem;
		}
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
		background-color: hsl(var(--hsl-base-400)/0.2);
		font-size: 0.9375rem;
		border-radius: 4px;
		border: 1px solid hsl(var(--hsl-base-400)/0.3);
		color: hsl(var(--hsl-content));
		outline: none;
		transition: all var(--timing-normal) ease;
		box-shadow: var(--raised-z6);

		&:hover {
			border: 1px solid hsl(var(--hsl-base-400)/0.7);
		}

		span {
			width: 150px;
			flex: 1;
			text-overflow: ellipsis;
			white-space: nowrap;
			overflow-x: hidden;
		}
	}

	.social > a {
		&:hover {
			background-color: hsl(var(--hsl-base-200));
		}
	}
</style>

<nav class="sidebar _pdt-6 _pst-asl _zid-1 _dp-f _fdrt-cl _h-100vh _ovfy-at">
	<div class="site-logo">
		<img src="/images/logo.webp" alt="Deploys.app" draggable="false">
	</div>

	<div class="_f-1">
		<div class="lo-12 _g-5 _pdh-5 _mgt-8">
			<small class="_dp-f _jtfct-spbtw">
				<strong>CURRENT PROJECT</strong>
			</small>

			<div class="project-box _cs-pt" role="button" tabindex="0"
				onclick={openProjectModal} onkeypress={openProjectModal}>
				<span>
					{#if project}
						{projectName}
					{:else}
						&#45;&#45;PROJECT&#45;&#45;
					{/if}
				</span>
				<i class="fa-solid fa-caret-down _mgl-3"></i>
			</div>

			<div class="_dp-f _jtfct-fe">
				<a href="/project">
					<small class="nm-link">View all projects</small>
				</a>
			</div>
		</div>
		<br>

		<div class="_dp-n">
			<!-- Preload codes -->
			{#each projectMenuList as menu}
				<a href="{menu.link}?project={project}" title={menu.title}>{menu.title}</a>
			{/each}
		</div>

		<div>
			<ul class="sidebar-menus">
				{#if project}
					{#each projectMenuList as menu}
						<li>
							<a href="{menu.link}?project={project}" title={menu.title}>
								<div class="menu-item" class:is-active={menu.id === pageMenu}>
									<span class="menu-icon">
										<i class="fa-solid {menu.icon}"></i>
									</span>
									<span>{menu.title}</span>
								</div>
							</a>
						</li>
					{/each}
				{/if}
			</ul>
		</div>
	</div>

	<div class="_mgt-6 _pdbt-5">
		<div class="_pdh-5 _mgbt-5">
			<hr>
		</div>
		<div class="_dp-f _jtfct-spbtw _alit-ct _fdrt-cl">
			<div class="social _dp-f _jtfct-fe _alit-ct _g-4 _w-100pct _pdh-6">
				<a href="https://github.com/deploys-app" target="_blank" rel="external" class="_dp-f _jtfct-ct _alit-ct _bdrd-3 _w-8 _h-8" aria-label="Goto Github">
					<i class="fa-brands fa-github"></i>
				</a>
				<a href="https://discord.gg/5ZttPJsypS" target="_blank" rel="external" class="_dp-f _jtfct-ct _alit-ct _bdrd-3 _w-8 _h-8" aria-label="Goto Discord">
					<i class="fa-brands fa-discord"></i>
				</a>
				<a href="mailto:contact@moonrhythm.io" target="_blank" class="_dp-f _jtfct-ct _alit-ct _bdrd-3 _w-8 _h-8" aria-label="Email">
					<i class="fa-solid fa-envelope"></i>
				</a>
			</div>
		</div>
	</div>
</nav>
