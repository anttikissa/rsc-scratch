import { createServer } from 'http'
import { readdir, readFile } from 'fs/promises'
import sanitizeFilename from 'sanitize-filename'

function log(...args) {
	return console.log(new Date().toISOString().replace('T', ' ').replace('Z', ''), ...args)
}

createServer(async (req, res) => {
	try {
		const url = new URL(req.url, `http://${req.headers.host}`)
		await sendJSX(res, <Router url={url} />)
	} catch (err) {
		console.error(err)
		res.statusCode = err.statusCode ?? 500
		res.end()
	}
}).listen(8081)

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

log('RSC server')
