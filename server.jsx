import { createServer } from 'http'
import { readFile, readdir } from 'fs/promises'
import escapeHtml from 'escape-html'
import sanitizeFilename from 'sanitize-filename'

const server = createServer(async (req, res) => {
	try {
		const url = new URL(req.url, `http://${req.headers.host}`)
		const page = <Router url={url} />
		sendHTML(res, page)
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

function BlogLayout({ children }) {
	const author = 'Jae Doe'
	return (
		<html>
			<head>
				<title>My Blog</title>
			</head>
			<body>
				<nav>
					<a href="/">Home</a>
					<hr />
					<input type="text" placeholder="Search" />
					<hr />
				</nav>
				<main>{children}</main>
				<Footer author={author} />
			</body>
		</html>
	)
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

async function renderJSXToHTML(jsx) {
	if (typeof jsx === 'string' || typeof jsx === 'number') {
		return escapeHtml(jsx)
	} else if (jsx == null || typeof jsx === 'boolean') {
		return ''
	} else if (Array.isArray(jsx)) {
		const childHtmls = await Promise.all(
			jsx.map((child) => renderJSXToHTML(child))
		)
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

async function sendHTML(res, html) {
	let output = await renderJSXToHTML(html)

	res.writeHead(200, {
		'Content-Type': 'text/html',
	})
	res.end(output)
}

server.listen(3000, () => {
	console.log('Server listening on http://localhost:3000/')
})
