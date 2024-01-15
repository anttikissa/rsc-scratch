function log(...args) {
	console.log(...args)
}

let currentPathname = window.location.pathname

async function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}

async function navigate(pathname) {
	currentPathname = pathname
	const response = await fetch(pathname)
	const html = await response.text()

	if (pathname === currentPathname) {
		const bodyStartIndex = html.indexOf('<body>') + 6
		const bodyEndIndex = html.indexOf('</body>')
		const bodyHTML = html.slice(bodyStartIndex, bodyEndIndex)

		document.body.innerHTML = bodyHTML
	} else {
		console.log('!!! do not navigate', pathname)
	}
}

window.addEventListener(
	'click',
	(e) => {
		if (e.target.tagName !== 'A') {
			return
		}
		if (e.metaKey || e.ctrlKey || e.shirtKey || e.altKey) {
			return
		}

		const href = e.target.getAttribute('href')
		if (!href.startsWith('/')) {
			return
		}

		e.preventDefault()
		window.history.pushState(null, null, href)
		navigate(href).then(() => {})
	},
	true
)

window.addEventListener('popstate', () => {
	navigate(window.location.pathname).then(() => {})
})

log('script')
