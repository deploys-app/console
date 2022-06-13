<script context="module">
	export function load ({ stuff }) {
		const {
			deployment
		} = stuff

		return {
			props: {
				deployment
			}
		}
	}
</script>

<script>
	import { onMount } from 'svelte'

	export let deployment

	let buffer = ''
	let text = ''

	onMount(() => {
		const source = new EventSource(deployment.logUrl)
		source.addEventListener('open', () => {
			buffer = ''
		})
		source.addEventListener('message', (ev) => {
			try {
				const d = JSON.parse(ev.data)
				buffer = `${d.pod} ${d.timestamp} ${d.log}\n` + buffer
			} catch (err) {}
		})
		const interval = setInterval(() => {
			if (text !== buffer) {
				text = buffer
			}
		}, 1000)

		return () => {
			source.close()
			clearInterval(interval)
		}
	})
</script>

<h6><strong>Logs</strong></h6>
<a class="moon-button -info -small _jtfs-fst" href={`${deployment.logUrl}&type=text&raw=1`} target="_blank">Stream Raw Logs</a>
<pre class="_pdv-30px pre-scoll" id="js-logs">{text}</pre>
