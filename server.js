import { createServer } from 'http'
import { readFile } from 'fs/promises'
import escapeHtml from 'escape-html'

const server = createServer(async (req, res) => {
	const author = 'Jae Doe'
	const postContent = await readFile('./posts/hello-world.txt', 'utf-8')

	sendHTML(
		res,
		`
		<html>
			<head>
			<title>My Blog</title>
			</head>
			<body>
				<nav>
					<a href="/">Home</a>
					<hr/>
				</nav>
				<article>
					${escapeHtml(postContent)}
				</article>
				<footer>
					<hr>
					<p><i>(c) ${escapeHtml(author)}, ${new Date().getFullYear()}</i></p>
				</footer>
			</body>
		</html>`
	)
})

function sendHTML(res, html) {
	res.writeHead(200, {
		'Content-Type': 'text/html',
		'Content-Length': html.length,
	})
	res.end(html)
}

server.listen(3000, () => {
	console.log('Server listening on http://localhost:3000/')
})
