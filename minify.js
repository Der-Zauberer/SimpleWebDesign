//ts-check
// Use 'node minify.js', update version of the npm package and deploy with 'npm publish' (my require 'npm login')
//

const fs = require('node:fs/promises')
const path = require('node:path')

const ROOT_DIR = __dirname
const JS_SOURCE_PATH = path.join(ROOT_DIR, 'resources', 'script.js')
const CSS_SOURCE_PATH = path.join(ROOT_DIR, 'resources', 'style.css')
const JS_OUTPUT_PATH = path.join(ROOT_DIR, 'downloads', 'npm', 'swd.min.js')
const CSS_OUTPUT_PATH = path.join(ROOT_DIR, 'downloads', 'npm', 'swd.min.css')
const JS_MINIFIER_URL = 'https://www.toptal.com/developers/javascript-minifier/api/raw'
const CSS_MINIFIER_URL = 'https://www.toptal.com/developers/cssminifier/api/raw'

/**
 * Send raw asset contents to a Toptal minifier endpoint.
 *
 * @param {string} endpointUrl The minifier API endpoint.
 * @param {string} source The source code to minify.
 * @returns {Promise<string>} The minified source returned by the API.
 */
function minifySource(endpointUrl, source) {
	const requestBody = new URLSearchParams({ input: source }).toString()

	return fetch(endpointUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: requestBody,
	}).then(async response => {
        const body = await response.text()
		if (!response.ok) throw new Error(`Minifier request failed with status ${response.status}: ${body}`)
		return body
    })
}

/**
 * Read a file, minify it, and write the result to the target path.
 *
 * @param {string} sourcePath Absolute path to the source file.
 * @param {string} outputPath Absolute path to the output file.
 * @param {string} endpointUrl The minifier API endpoint.
 * @returns {Promise<void>}
 */
async function minifyFile(sourcePath, outputPath, endpointUrl) {
	const source = await fs.readFile(sourcePath, 'utf8')
	const minified = await minifySource(endpointUrl, source)

	await fs.mkdir(path.dirname(outputPath), { recursive: true })
	await fs.writeFile(outputPath, minified, 'utf8')
}

/**
 * Minify the public JavaScript and CSS assets.
 *
 * @returns {Promise<void>}
 */
async function main() {
	await minifyFile(JS_SOURCE_PATH, JS_OUTPUT_PATH, JS_MINIFIER_URL)
	await minifyFile(CSS_SOURCE_PATH, CSS_OUTPUT_PATH, CSS_MINIFIER_URL)

	console.log(`Wrote ${JS_OUTPUT_PATH}`)
	console.log(`Wrote ${CSS_OUTPUT_PATH}`)
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error)
	process.exitCode = 1
})