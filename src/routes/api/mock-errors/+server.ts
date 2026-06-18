// Mock error-pod feed for offline development. Only active when MOCK_API is
// set — otherwise the route 404s. Returns the same JSON shape the real log
// service's /errors endpoint emits: an array of Api.PodError. The deployment
// fixture points an *erroring* deployment's errorsUrl here so the masthead
// strip and the Events-tab Pod Health card are exercisable offline.
//
// Pod names use full id-named pod names (`d128-77-<rsHash>-<podHash>`) so the
// UI exercises pod-name prefix stripping.

import type { RequestHandler } from './$types'
import { env } from '$env/dynamic/private'

const POD_ERRORS = [
	{
		name: 'd128-77-7d8f9b6c5-x2k9p',
		phase: 'Running',
		ready: false,
		restartCount: 7,
		waitingReason: 'CrashLoopBackOff',
		lastTerminatedReason: 'Error',
		lastTerminatedExitCode: 1,
		message: 'back-off 5m0s restarting failed container app'
	},
	{
		name: 'd128-77-7d8f9b6c5-q8m2t',
		phase: 'Pending',
		ready: false,
		restartCount: 0,
		waitingReason: 'ImagePullBackOff',
		message: 'Back-off pulling image "registry.deploys.app/acme/web:latest"'
	}
]

export const GET: RequestHandler = async () => {
	if (!env.MOCK_API) return new Response('not found', { status: 404 })

	return new Response(JSON.stringify(POD_ERRORS), {
		headers: {
			'content-type': 'application/json',
			'cache-control': 'no-store'
		}
	})
}
