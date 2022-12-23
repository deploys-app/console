<script>
	import { onMount } from "svelte";
	import ansi from "ansi-to-html";

	export let data;
	$: ({ deployment } = data);

	const ansiCoverter = new ansi();
	let buffer = "";
	let text = "";

	onMount(() => {
		const source = new EventSource(deployment.logUrl);
		source.addEventListener("open", () => {
			buffer = "";
		});
		source.addEventListener("message", (ev) => {
			try {
				const d = JSON.parse(ev.data);
				buffer = `${d.pod} ${d.timestamp} ${d.log}\n${buffer}`;
			} catch (err) {}
		});
		const interval = setInterval(() => {
			if (text !== buffer) {
				text = buffer;
			}
		}, 1000);

		return () => {
			source.close();
			clearInterval(interval);
		};
	});
</script>

<h6><strong>Logs</strong></h6>
<a
	class="button -info -small _jtfs-fst"
	href={`${deployment.logUrl}&type=text&raw=1`}
	target="_">Stream Raw Logs</a
>
<pre class="_pdv-30px pre-scoll" id="js-logs">{@html ansiCoverter.toHtml(
		text
	)}</pre>

<style>
	.pre-scoll {
		font-size: 12px;
	}
</style>
