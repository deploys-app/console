export async function load ({ parent }) {
	const { project } = await parent()
	return { project }
}
