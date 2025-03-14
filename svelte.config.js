import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			// default options
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			precompress: false,
			strict: true
		}),
		// Add base path for GitHub Pages deployment
		paths: {
			base: process.env.GITHUB_PAGES === 'true' ? '/gervais' : ''
		}
	}
};

export default config; 