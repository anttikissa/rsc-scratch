import { createServer } from 'http'
import { readFile } from 'fs/promises'
import escapeHtml from 'escape-html'

const server = createServer(async (req, res) => {
	const author = 'Jae Doe'
	const postContent = await readFile('./posts/hello-world.txt', 'utf-8')

	sendHTML(
		res,
		<html>
			<head>
				<title>My Blog</title>
			</head>
			<body>
				<nav>
					<a href="/">Home</a>
					<hr />
				</nav>
				<article>{escapeHtml(postContent)}</article>
				<footer>
					<hr />
					<p>
						<i>
							(c) {escapeHtml(author)}, {new Date().getFullYear()}
						</i>
					</p>
				</footer>
			</body>
		</html>
	)
})

function renderJSXToHTML(jsx) {
	if (typeof jsx === 'string' || typeof jsx === 'number') {
		return escapeHtml(jsx)
	} else if (jsx == null || typeof jsx === 'boolean') {
		return ''
	} else if (Array.isArray(jsx)) {
		return jsx.map(renderJSXToHTML).join('')
	} else if (typeof jsx === 'object') {
		if (jsx.$$typeof === Symbol.for('react.element')) {
			let html = '<' + jsx.type
			for (const propName in jsx.props) {
				if (
					jsx.props.hasOwnProperty(propName) &&
					propName !== 'children'
				) {
					html += ' '
					html += propName
					html += '='
					html += escapeHtml(jsx.props[propName])
				}
			}
			html += '>'
			html += renderJSXToHTML(jsx.props.children)
			html += '</' + jsx.type + '>'
			return html
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
