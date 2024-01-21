import { createServer } from 'http'
import { readdir, readFile } from 'fs/promises'
import escapeHtml from 'escape-html'
import { renderToString } from 'react-dom/server'

function log(...args) {
	return console.log(new Date().toISOString().replace('T', ' ').replace('Z', ''), ...args)
}

function parseJSX(key, value) {
	if (value === '$RE') {
		return Symbol.for('react.element')
	} else if (typeof value === 'string' && value.startsWith('$')) {
		return value.slice(1)
	} else {
		return value
	}
}

const server = createServer(async (req, res) => {

	try {
		const url = new URL(req.url, `http://${req.headers.host}`)
		if (url.pathname === '/client.js') {
			res.writeHead(200, {
				'Content-Type': 'application/javascript',
			})
			res.end(await readFile('./' + url.pathname, 'utf8'))
			return
		}
		const response = await fetch('http://127.0.0.1:8081' + url.pathname)
		if (!response.ok) {
			res.statusCode = response.status
			res.end()
			return
		}

		const clientJSXString = await response.text()

		if (url.searchParams.has('jsx')) {
			res.setHeader('Content-Type', 'application/json')
			res.end(clientJSXString)
		} else {
			const clientJSX = JSON.parse(clientJSXString, parseJSX)
			const html = renderToString(clientJSX)

			const pos = html.indexOf('</body>')

			let result = html.slice(0, pos)
			result += `<script type="importmap">
			  {
				"imports": {
				  "react": "https://esm.sh/react@canary",
				  "react-dom/client": "https://esm.sh/react-dom@canary/client"
				}
			  }
			</script>`

			// const clientJSXString = JSON.stringify(clientJSX, stringifyJSX)

			result += `<script>window.__INITIAL_CLIENT_JSX_STRING__ = `
			result += JSON.stringify(clientJSXString).replaceAll('<', '\\u003c')
			result += `</script>`
			result += `<script type="module" src="client.js"></script>`
			result += html.slice(pos)

			res.writeHead(200, {
				'Content-Type': 'text/html',
			})
			res.end(result)

		}
	} catch (err) {
		console.error(err)
		res.statusCode = err.statusCode ?? 500
		res.end()
	}
})


server.listen(8080, () => {
	log(`Server listening on http://localhost:8080/`)
})

log('SSR server')
