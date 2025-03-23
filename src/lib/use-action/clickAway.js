export default function clickAway (node) {
	const handleClick = (event) => {
		if (node && !node.contains(event.target) && !event.defaultPrevented) {
			node.dispatchEvent(new CustomEvent('clickAway'))
		}
	}

	document.addEventListener('click', handleClick, true)

	return {
		destroy () {
			document.removeEventListener('click', handleClick, true)
		}
	}
}
