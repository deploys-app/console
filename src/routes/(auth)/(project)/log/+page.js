export async function load ({ url }) {
	const duration = url.searchParams.get('duration') || ''
	const startDate = url.searchParams.get('startDate') || ''
	const endDate = url.searchParams.get('endDate') || ''
	const query = url.searchParams.get('query') || ''
	const indexId = url.searchParams.get('indexId') || ''
	const endpoint = url.searchParams.get('endpoint') || ''

	return {
		duration,
		startDate,
		endDate,
		query,
		indexId,
		endpoint
	}
}
