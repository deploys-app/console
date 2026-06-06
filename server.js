// Custom production entrypoint that serves the SvelteKit adapter-node build over
// h2c (cleartext HTTP/2) instead of HTTP/1.1.
//
// The deploys.app ingress connects to backends over h2c using prior knowledge, so
// the console serves HTTP/2 directly and no h2cp sidecar is required. Bun's
// `http2.createServer()` is h2c-only (no HTTP/1.1 fallback, no `Upgrade: h2c`),
// which is exactly what prior-knowledge ingress and the default TCP-socket health
// probes need. This replaces `build/index.js`, whose adapter-node server is bound
// to `node:http` and relies on `http.STATUS_CODES` / `closeIdleConnections()` that
// `Http2Server` does not provide.
//
// Run from inside the build output (it imports `./handler.js` and `./env.js`); the
// Dockerfile copies this file alongside the build and runs it as the entrypoint.
import http2 from 'node:http2'
import process from 'node:process'
import { handler } from './handler.js'
import { env } from './env.js'

const path = env('SOCKET_PATH', false)
const host = env('HOST', '0.0.0.0')
const port = env('PORT', !path && '3000')
const shutdownTimeout = parseInt(env('SHUTDOWN_TIMEOUT', '30'))

const server = http2.createServer()

server.on('request', (req, res) => {
	// Bun's HTTP/2 compatibility layer exposes the `:authority` pseudo-header but,
	// unlike Node, does not synthesize a `host` header from it. SvelteKit builds the
	// request URL from `host`, so without this it returns 400 Bad Request for every
	// SSR route. Map it through before handing off to the handler.
	if (!req.headers.host && req.headers[':authority']) {
		req.headers.host = req.headers[':authority']
	}

	// SvelteKit's adapter-node `handler` is polka-style middleware. It always
	// terminates the response (the trailing `ssr` handler emits a 404 when nothing
	// matches), so this final `next` is only a safety net.
	handler(req, res, () => {
		if (!res.headersSent) {
			res.statusCode = 404
			res.end('Not Found')
		}
	})
})

/** @type {NodeJS.Timeout | void} */
let shutdownTimeoutId

/** @param {'SIGINT' | 'SIGTERM'} reason */
function gracefulShutdown (reason) {
	if (shutdownTimeoutId) return

	server.close((error) => {
		// occurs if the server is already closed
		if (error) return

		if (shutdownTimeoutId) {
			clearTimeout(shutdownTimeoutId)
		}

		// @ts-expect-error custom events cannot be typed
		process.emit('sveltekit:shutdown', reason)
	})

	// Http2Server has no closeAllConnections(); force exit so a stuck stream can't
	// hold the process open past the grace period.
	shutdownTimeoutId = setTimeout(() => {
		process.exit(0)
	}, shutdownTimeout * 1000)
}

if (path) {
	server.listen({ path }, () => {
		console.log(`Listening on ${path} (h2c)`)
	})
} else {
	server.listen({ host, port: Number(port) }, () => {
		console.log(`Listening on http://${host}:${port} (h2c)`)
	})
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

export { host, path, port, server }
