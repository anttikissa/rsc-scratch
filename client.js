import { hydrateRoot } from 'react-dom/client'

const root = hydrateRoot(document, getInitialClientJSX())

function getInitialClientJSX() {
	// TODO
}

async function fetchClientJSX(pathname) {
	const response = await fetch(pathname + '?jsx')
	const clientJSXString = await response.text()
	return JSON.parse(clientJSXString, parseJSX)
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

function log(...args) {
	console.log(...args)
}

let currentPathname = window.location.pathname

async function navigate(pathname) {
	currentPathname = pathname

	const clientJSX = await fetchClientJSX(pathname)

	if (pathname === currentPathname) {
		root.render(clientJSX)
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
