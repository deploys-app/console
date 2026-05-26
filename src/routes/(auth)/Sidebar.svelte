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

	/** @type {{ id: string, title: string, icon: string, link: string, preview?: boolean }[]} */
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
			id: 'waf',
			title: 'Firewall',
			icon: 'fa-shield-halved',
			link: '/waf',
			preview: true
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
			id: 'env-group',
			title: 'Env Groups',
			icon: 'fa-cog',
			link: '/env-group'
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
			id: 'dropbox',
			title: 'Dropbox',
			icon: 'fa-box-open',
			link: '/dropbox'
		},
		{
			id: 'registry',
			title: 'Registry',
			icon: 'fa-warehouse-full',
			link: '/registry'
		},
		{
			id: 'audit-log',
			title: 'Audit Logs',
			icon: 'fa-clipboard-list',
			link: '/audit-log'
		}
	]
</script>

<style>
	.sidebar {
		width: var(--width-sidebar, 300px);
		/* Two declarations, ordered so dvh wins where supported. iOS
		 * Safari's bottom toolbar shrinks dvh, so this keeps the bottom
		 * social row above the toolbar. The Tailwind h-screen / h-dvh
		 * utilities were unreliable here because their order in the
		 * generated stylesheet is not stable. */
		height: 100vh;
		height: 100dvh;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		background-color: hsl(var(--hsl-base-300));
		border-right: 1px solid hsl(var(--hsl-line));
	}

	.sidebar-bottom {
		padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
	}

	.sidebar-menus .menu-item {
		position: relative;
		display: grid;
		grid-auto-flow: column;
		grid-gap: .75rem;
		justify-content: start;
		align-items: center;
		margin: 1px 0.5rem;
		padding: .625rem .75rem;
		border-radius: var(--radius-md);
		font-size: var(--fs-2);
		font-weight: 500;
		color: hsl(var(--hsl-content) / 0.7);
		cursor: pointer;
		transition: color var(--timing-faster) ease, background-color var(--timing-faster) ease;
	}

	.sidebar-menus .menu-item:hover {
		color: hsl(var(--hsl-content));
		background: hsl(var(--hsl-content) / 0.05);
	}

	.sidebar-menus .menu-item.is-active {
		color: hsl(var(--hsl-primary));
		background: hsl(var(--hsl-primary) / 0.1);
	}

	/* Signal bar — the active route gets an accent rail on its leading edge. */
	.sidebar-menus .menu-item.is-active::before {
		content: '';
		position: absolute;
		left: -0.5rem;
		top: 50%;
		transform: translateY(-50%);
		width: 3px;
		height: 1.25rem;
		border-radius: 0 3px 3px 0;
		background: hsl(var(--hsl-primary));
	}

	.sidebar-menus .menu-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.5rem;
		font-size: 0.9375rem;
	}

	.sidebar-menus .menu-label {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	/* Marks a feature that's still in preview. */
	.preview-badge {
		padding: 0.0625rem 0.375rem;
		font-size: 0.625rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		line-height: 1.4;
		border-radius: 9999px;
		color: hsl(var(--hsl-primary));
		background-color: hsl(var(--hsl-primary) / 0.12);
	}

	.section-caption {
		font-size: 0.6875rem;
		letter-spacing: 0.12em;
		color: hsl(var(--hsl-content) / 0.45);
	}

	.site-logo {
		margin: 0 auto;
		width: 100px;
	}

	.site-logo img {
		width: 100%;
		max-width: 100%;
		height: auto;
	}

	.project-box {
		display: flex;
		align-items: center;
		padding: 10px 12px;
		background-color: hsl(var(--hsl-base-400) / 0.2);
		font-size: 0.9375rem;
		font-weight: 500;
		border-radius: var(--radius-md);
		border: 1px solid hsl(var(--hsl-line));
		color: hsl(var(--hsl-content));
		outline: none;
		transition: border-color var(--timing-faster) ease, background-color var(--timing-faster) ease;
	}

	.project-box:hover {
		border-color: hsl(var(--hsl-primary) / 0.5);
		background-color: hsl(var(--hsl-primary) / 0.06);
	}

	.project-box span {
		width: 150px;
		flex: 1;
		text-overflow: ellipsis;
		white-space: nowrap;
		overflow-x: hidden;
	}

	.social > a {
		color: hsl(var(--hsl-content) / 0.6);
		transition: color var(--timing-faster) ease, background-color var(--timing-faster) ease;
	}

	.social > a:hover {
		color: hsl(var(--hsl-content));
		background-color: hsl(var(--hsl-content) / 0.06);
	}
</style>

<nav class="sidebar pt-4 absolute z-[1]">
	<div class="site-logo">
		<img src="/images/logo.webp" alt="Deploys.app" draggable="false">
	</div>

	<div class="flex-1">
		<div class="grid grid-cols-1 gap-3 px-3 mt-8">
			<small class="section-caption flex justify-between">
				<strong>CURRENT PROJECT</strong>
			</small>

			<div class="project-box cursor-pointer" role="button" tabindex="0"
				onclick={openProjectModal} onkeypress={openProjectModal}>
				<span>
					{#if project}
						{projectName}
					{:else}
						&#45;&#45;PROJECT&#45;&#45;
					{/if}
				</span>
				<i class="fa-solid fa-caret-down ml-1"></i>
			</div>

			<div class="flex justify-end">
				<a href="/project">
					<small class="link">View all projects</small>
				</a>
			</div>
		</div>
		<br>

		<div class="hidden">
			<!-- Preload codes -->
			{#each projectMenuList as menu (menu.id)}
				<a href="{menu.link}?project={project}" title={menu.title}>{menu.title}</a>
			{/each}
		</div>

		<div>
			<ul class="sidebar-menus">
				{#if project}
					{#each projectMenuList as menu (menu.id)}
						<li>
							<a href="{menu.link}?project={project}" title={menu.title}>
								<div class="menu-item" class:is-active={menu.id === pageMenu}>
									<span class="menu-icon">
										<i class="fa-solid {menu.icon}"></i>
									</span>
									<span class="menu-label">
										{menu.title}
										{#if menu.preview}<span class="preview-badge">Preview</span>{/if}
									</span>
								</div>
							</a>
						</li>
					{/each}
				{/if}
			</ul>
		</div>
	</div>

	<div class="sidebar-bottom mt-4">
		<div class="px-3 mb-3">
			<hr>
		</div>
		<div class="flex justify-between items-center flex-col">
			<div class="social flex justify-end items-center gap-2 w-full px-4">
				<a href="https://github.com/deploys-app" target="_blank" rel="external" class="flex justify-center items-center rounded w-8 h-8" aria-label="Go to GitHub">
					<i class="fa-brands fa-github"></i>
				</a>
				<a href="https://discord.gg/5ZttPJsypS" target="_blank" rel="external" class="flex justify-center items-center rounded w-8 h-8" aria-label="Go to Discord">
					<i class="fa-brands fa-discord"></i>
				</a>
				<a href="mailto:contact@moonrhythm.io" target="_blank" class="flex justify-center items-center rounded w-8 h-8" aria-label="Email">
					<i class="fa-solid fa-envelope"></i>
				</a>
			</div>
		</div>
	</div>
</nav>
