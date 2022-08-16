export async function load ({ parent }) {
	const { projects } = await parent()

	return {
		projects
	}
}
