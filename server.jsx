import { createServer } from 'http'
import { readdir, readFile } from 'fs/promises'
import escapeHtml from 'escape-html'
import sanitizeFilename from 'sanitize-filename'

const server = createServer(async (req, res) => {
	try {
		const url = new URL(req.url, `http://${req.headers.host}`)

		if (url.pathname === '/client.js' || url.pathname === '/react-dom.development.js') {
			res.writeHead(200, {
				'Content-Type': 'application/javascript',
			})
			res.end(await readFile('./' + url.pathname, 'utf8'))
			return
		} else if (url.searchParams.has('jsx')) {
			url.searchParams.delete('jsx')
			await sendJSX(res, <Router url={url} />)
		} else {
			await sendHTML(res, <Router url={url} />)
		}
	} catch (err) {
		console.error(err)
		res.statusCode = err.statusCode ?? 500
		res.end()
	}
})

function Router({ url }) {
	let page
	if (url.pathname === '/') {
		page = <BlogIndexPage />
	} else {
		const postSlug = sanitizeFilename(url.pathname.slice(1))
		page = <Post slug={postSlug} />
	}
	return <BlogLayout>{page}</BlogLayout>
}

function throwNotFound(cause) {
	const notFound = new Error('not found', { cause })
	notFound.statusCode = 404
	throw notFound
}

async function BlogIndexPage() {
	const postFiles = await readdir('./posts')
	const postSlugs = postFiles.map((file) =>
		file.slice(0, file.lastIndexOf('.'))
	)

	return (
		<section>
			<h1>Welcome to blog</h1>
			<div>
				{postSlugs.map((slug, index) => (
					<Post key={slug} slug={slug} />
				))}
			</div>
		</section>
	)
}

async function Post({ slug }) {
	let content
	try {
		content = await readFile('./posts/' + slug + '.txt', 'utf8')
	} catch (err) {
		throwNotFound(err)
	}

	return (
		<section>
			<h2>
				<a href={'/' + slug}>{slug}</a>
			</h2>
			<article>{content}</article>
		</section>
	)
}

function BlogLayout({ children }) {
	const author = 'Jae Doe'
	return <html><body>hello {author}</body></html>
	// return (
	// 	<html>
	// 	<head>
	// 		<title>My Blog</title>
	// 	</head>
	// 	<body>
	// 	<nav>
	// 		<a href="/">Home</a>
	// 		<hr />
	// 		<input type="text" placeholder="Search" />
	// 		<hr />
	// 	</nav>
	// 	<main>{children}</main>
	// 	<Footer author={author} />
	// 	</body>
	// 	</html>
	// )
}

function Footer({ author }) {
	return (
		<footer>
			<hr />
			<p>
				<i>
					(c) {author}, {new Date().getFullYear()}
				</i>
			</p>
		</footer>
	)
}

async function renderJSXToClientJSX(jsx) {
	if (
		typeof jsx === 'string' ||
		typeof jsx === 'number' ||
		typeof jsx === 'boolean' ||
		jsx == null
	) {
		return jsx
	} else if (Array.isArray(jsx)) {
		return Promise.all(jsx.map((child) => renderJSXToClientJSX(child)))
	} else if (typeof jsx === 'object') {
		if (jsx.$$typeof === Symbol.for('react.element')) {
			if (typeof jsx.type === 'string') {
				return {
					...jsx,
					props: await renderJSXToClientJSX(jsx.props),
				}
			} else if (typeof jsx.type === 'function') {
				const Component = jsx.type
				const props = jsx.props
				const returnedJsx = await Component(props)
				return await renderJSXToClientJSX(returnedJsx)
			} else {
				throw new Error('Not implemented')
			}
		} else {
			return Object.fromEntries(
				await Promise.all(
					Object.entries(jsx).map(async ([key, value]) => [
						key,
						await renderJSXToClientJSX(value),
					])
				)
			)
		}
	} else {
		throw new Error('Not implemented')
	}
}

async function renderJSXToHTML(jsx) {
	if (typeof jsx === 'string' || typeof jsx === 'number') {
		return escapeHtml(jsx)
	} else if (jsx == null || typeof jsx === 'boolean') {
		return ''
	} else if (Array.isArray(jsx)) {
		const childHtmls = await Promise.all(
			jsx.map((child) => renderJSXToHTML(child))
		)
		let html = ''
		let wasTextNode = false
		let isTextNode = false
		for (let i = 0; i < jsx.length; i++) {
			isTextNode = typeof jsx[i] === 'string' || typeof jsx[i] === 'number'
			if (wasTextNode && isTextNode) {
				html += '<!-- -->'
			}
			html += childHtmls[i]
			wasTextNode = isTextNode
		}
		return childHtmls.join('')
	} else if (typeof jsx === 'object') {
		if (jsx.$$typeof === Symbol.for('react.element')) {
			if (typeof jsx.type === 'string') {
				let html = '<' + jsx.type
				for (const propName in jsx.props) {
					if (
						jsx.props.hasOwnProperty(propName) &&
						propName !== 'children'
					) {
						html += ' '
						html += propName
						html += '='
						html += '"'
						html += escapeHtml(jsx.props[propName])
						html += '"'
					}
				}
				html += '>'
				html += await renderJSXToHTML(jsx.props.children)
				html += '</' + jsx.type + '>'
				return html
			} else if (typeof jsx.type === 'function') {
				const Component = jsx.type
				const props = jsx.props
				const returnedJsx = await Component(props)
				return await renderJSXToHTML(returnedJsx)
			}
		} else {
			log('unknown object', jsx, typeof jsx)
			throw new Error('unknown object')
		}
	} else {
		log('jsx not implemented', jsx, typeof jsx)
		throw new Error('not implemented')
	}
}

const log = (...args) => console.log(...args)

async function sendJSX(res, jsx) {
	const clientJSX = await renderJSXToClientJSX(jsx)
	const clientJSXString = JSON.stringify(clientJSX, stringifyJSX)
	res.setHeader('Content-Type', 'application/json')
	res.end(clientJSXString)
}

function stringifyJSX(key, value) {
	if (value === Symbol.for('react.element')) {
		return '$RE'
	} else if (typeof value === 'string' && value.startsWith('$')) {
		return '$' + value
	} else {
		return value
	}
}

async function sendHTML(res, jsx) {
	const html = await renderJSXToHTML(jsx)
	const clientJSX = await renderJSXToClientJSX(jsx)

	const pos = html.indexOf('</body>')

	let result = html.slice(0, pos)
	// result += '<script src="./react-dom.development.js"></script>'
	result += `<script type="importmap">
	  {
	    "imports": {
	      "react": "https://esm.sh/react@canary",
	      "react-dom/client": "https://esm.sh/react-dom@canary/client"
	    }
	  }
	</script>`

	const clientJSXString = JSON.stringify(clientJSX, stringifyJSX)

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

server.listen(3000, () => {
	console.log('Server listening on http://localhost:3000/')
})
