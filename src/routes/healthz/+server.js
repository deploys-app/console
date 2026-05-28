export const prerender = false

export function GET () {
	return new Response('ok', {
		status: 200,
		headers: { 'cache-control': 'no-store' }
	})
}
