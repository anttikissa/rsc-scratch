import { createServer } from 'http'
import { readFile } from 'fs/promises'
import escapeHtml from 'escape-html'

const server = createServer(async (req, res) => {
	const author = 'Jae Doe'
	const postContent = await readFile('./posts/hello-world.txt', 'utf-8')

	sendHTML(res, <BlogPostPage author={author} postContent={postContent} />)
})

function BlogPostPage({ postContent, author }) {
	return (
		<html>
			<head>
				<title>My Blog</title>
			</head>
			<body>
				<h1 className="foo bar zot">Testing</h1>
				<nav>
					<a href="/">Home</a>
					<hr />
				</nav>
				<article>{postContent}</article>
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
