<script lang="ts">
	import { kindMeta } from './format'

	interface Props { kind: Api.ErrorKind }
	const { kind }: Props = $props()
	const meta = $derived(kindMeta(kind))
</script>

<span class="kind-badge" style={`--kind-hue: ${meta.hue}`}>{meta.label}</span>

<style>
	/* Placed by the parent grid's `kind` column; the badge component renders this
	   span directly into .issue-row (Svelte adds no wrapper). */
	.kind-badge {
		grid-column: kind;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.12rem 0;
		width: 100%;
		border-radius: 5px;
		font-size: 0.6875rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		background: hsl(var(--kind-hue) 60% 50% / 0.2);
		color: hsl(var(--kind-hue) 64% 38%);
		border: 1px solid hsl(var(--kind-hue) 60% 50% / 0.36);
	}
	:global(.dark) .kind-badge {
		background: hsl(var(--kind-hue) 60% 60% / 0.16);
		color: hsl(var(--kind-hue) 70% 72%);
		border-color: hsl(var(--kind-hue) 60% 60% / 0.3);
	}
</style>
