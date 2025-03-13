// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
	testDir: './tests/e2e',
	timeout: 30 * 1000,
	expect: {
		timeout: 5000
	},
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',
	use: {
		baseURL: 'http://localhost:5173',
		actionTimeout: 0,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] },
		},
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] },
		},
		{
			name: 'mobile-chrome',
			use: { ...devices['Pixel 5'] },
		},
		{
			name: 'mobile-safari',
			use: { ...devices['iPhone 12'] },
		},
	],
	webServer: {
		command: 'npm run dev',
		port: 5173,
		reuseExistingServer: !process.env.CI,
	},
});
