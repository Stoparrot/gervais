// @ts-check
const { test: base, expect } = require('@playwright/test');

/**
 * Extended test fixture with custom utilities for Gervais app testing
 */
exports.test = base.extend({
  // Custom fixture to navigate to the app and ensure it's loaded
  appPage: async ({ page }, use) => {
    await page.goto('/');
    // Wait for the app to be fully loaded - looking for the sidebar or main content
    await page.waitForSelector('aside, main');
    await use(page);
  },
});

exports.expect = expect; 