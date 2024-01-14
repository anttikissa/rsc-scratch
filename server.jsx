import { createServer } from 'http'
import { readFile } from 'fs/promises'
import escapeHtml from 'escape-html'

const server = createServer(async (req, res) => {
	const author = 'Jae Doe'
	const postContent = [
		await readFile('./posts/hello-world.txt', 'utf-8'),
		await readFile('./posts/vacation-time.txt', 'utf-8'),
	]

	// let content = (
	// 	<BlogPostPage postSlug={'hello-world'} postContent={postContent} />
	// )

	let content = (
		<BlogLayout>
			<BlogIndexPage
				postSlugs={['hello-world', 'vacation-time']}
				postContents={postContent}
			/>
		</BlogLayout>
	)

	sendHTML(res, content)
})

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
				</nav>
				<main>{children}</main>
				<Footer author={author} />
			</body>
		</html>
	)
}

function BlogIndexPage({ postSlugs, postContents }) {
	return (
		<section>
			<h1>Welcome to blog</h1>
			<div>
				{postSlugs.map((postSlug, index) => (
					<section key={postSlug}>
						<h2>
							<a href={'/' + postSlug}>{postSlug}</a>
						</h2>
						<article>{postContents[index]}</article>
					</section>
				))}
			</div>
		</section>
	)
}

function BlogPostPage({ postSlug, postContent }) {
	return (
		<section>
			<h2>
				<a href={'/' + postSlug}>{postSlug}</a>
			</h2>
			<article>{postContent}</article>
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

function renderJSXToHTML(jsx) {
	if (typeof jsx === 'string' || typeof jsx === 'number') {
		return escapeHtml(jsx)
	} else if (jsx == null || typeof jsx === 'boolean') {
		return ''
	} else if (Array.isArray(jsx)) {
		return jsx.map(renderJSXToHTML).join('')
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
				html += renderJSXToHTML(jsx.props.children)
				html += '</' + jsx.type + '>'
				return html
			} else if (typeof jsx.type === 'function') {
				const Component = jsx.type
				const props = jsx.props
				const returnedJsx = Component(props)
				return renderJSXToHTML(returnedJsx)
			}
		} else throw new Error('unknown object')
	} else {
		log('jsx not implemented', jsx, typeof jsx)
		throw new Error('not implemented')
	}
}

const log = (...args) => console.log(...args)

function sendHTML(res, html) {
	let output = renderJSXToHTML(html)

	res.writeHead(200, {
		'Content-Type': 'text/html',
	})
	res.end(output)
}

server.listen(3000, () => {
	console.log('Server listening on http://localhost:3000/')
})
