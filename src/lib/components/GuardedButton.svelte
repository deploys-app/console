<script lang="ts">
	import { type Snippet } from 'svelte'
	import { denyTooltip, getPermissionContext } from '$lib/permission'

	interface Props {
		/**
		 * required permission(s), e.g. 'deployment.deploy' or
		 * ['envgroup.update', 'deployment.deploy']. When an array, ALL are required.
		 */
		permission: string | string[]
		/** when set AND allowed, renders an <a> instead of a <button> */
		href?: string
		onclick?: (e: MouseEvent) => void
		/** button type (ignored for <a>); default 'button' */
		type?: 'button' | 'submit' | 'reset'
		/** adds the is-loading state */
		loading?: boolean
		/** an ADDITIONAL disable, independent of permission */
		disabled?: boolean
		/** control class; default 'button' */
		class?: string
		/** overrides the allowed-state title; ignored when denied */
		title?: string
		children?: Snippet
		// passthrough attributes spread onto the rendered control
		[key: string]: any
	}

	const {
		permission,
		href,
		onclick,
		type = 'button',
		loading = false,
		disabled = false,
		class: klass = 'button',
		title,
		children,
		...rest
	}: Props = $props()

	const { can } = getPermissionContext()

	const required = $derived(Array.isArray(permission) ? permission : [permission])
	// First permission the caller is missing — drives the deny tooltip so the
	// user sees exactly which grant is needed.
	const missing = $derived(required.find((p) => !can(p)))
	const allowed = $derived(missing === undefined)
</script>

{#if !allowed}
	<!--
		Denied: render a disabled <button> (never an <a>, so it cannot navigate
		even if href was set), wrapped in a <span> carrying the deny tooltip. The
		wrapping span is what makes the native title tooltip reliably appear on
		hover — a bare disabled button does not fire hover tooltips consistently
		across browsers.
	-->
	<span class="inline-flex" title={denyTooltip(missing)}>
		<button class={klass} type="button" disabled aria-disabled="true" {...rest}>
			{@render children?.()}
		</button>
	</span>
{:else if href}
	<a class={klass} {href} {title} {...rest}>
		{@render children?.()}
	</a>
{:else}
	<button
		class={klass}
		class:is-loading={loading}
		{type}
		{onclick}
		{title}
		disabled={disabled || loading}
		{...rest}>
		{@render children?.()}
	</button>
{/if}
