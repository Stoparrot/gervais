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
		// Add base path for GitHub Pages
		paths: {
			base: process.env.NODE_ENV === 'production' ? '/gervais' : ''
		}
	}
};

export default config; 