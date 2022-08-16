export async function load ({ parent }) {
	const {
		deployment
	} = await parent()

	return {
		deployment
	}
}
