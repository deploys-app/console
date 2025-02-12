<script>
	import { onMount } from 'svelte'

	const { data } = $props()

	const deployment = $derived(data.deployment)

	let buffer = ''
	let text = $state('')

	onMount(() => {
		const source = new EventSource(deployment.logUrl)
		source.addEventListener('open', () => {
			buffer = ''
		})
		source.addEventListener('message', (ev) => {
			try {
				const d = JSON.parse(ev.data)
				buffer = `${d.pod} ${d.timestamp} ${d.log}\n` + buffer
			} catch (err) {
				console.error(err)
			}
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
<a class="nm-button _jtfs-fst" href={`${deployment.logUrl}&type=text&raw=1`} target="_blank">Stream Raw Logs</a>
<pre class="pre-scoll" id="js-logs">{text}</pre>
