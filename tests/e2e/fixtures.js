// @ts-check
import { test as base, expect } from '@playwright/test';

/**
 * Extended test fixture with custom utilities for Gervais app testing
 */
export const test = base;

/**
 * Loads the app and waits for essential elements to be visible
 * @param {import('@playwright/test').Page} page 
 */
export async function loadApp(page) {
  // Navigate to the app
  await page.goto('/');
  
  // Wait for the page to finish loading
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for any content to appear - use a very general selector that should match anything
  await page.waitForSelector('body *', { 
    state: 'visible',
    timeout: 10000 
  });
  
  // Allow a small delay for any animations or async rendering
  await page.waitForTimeout(500);
}

export { expect }; 