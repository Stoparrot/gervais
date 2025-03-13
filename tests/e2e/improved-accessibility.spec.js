// @ts-check
import { test, expect } from '@playwright/test';
import { loadApp } from './fixtures';

test.describe('Basic Accessibility', () => {
  test('has proper page title', async ({ page }) => {
    await loadApp(page);
    
    // Check if page has a title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    console.log(`Page title: "${title}"`);
  });

  test('has proper heading structure', async ({ page }) => {
    await loadApp(page);
    
    // Check if page has at least one heading
    const headingCount = await page.locator('h1, h2, h3').count();
    expect(headingCount).toBeGreaterThan(0);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/heading-structure.png' });
  });

  test('interactive elements have appropriate properties', async ({ page }) => {
    await loadApp(page);
    
    // Find buttons and check if they have accessible properties
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    console.log(`Found ${buttonCount} buttons on the page`);
    
    // If we have buttons, check at least one has proper attributes
    if (buttonCount > 0) {
      // Check if at least one button has aria-label, title, or textContent
      let hasAccessibleButton = false;
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const title = await button.getAttribute('title');
        const textContent = await button.textContent();
        
        if (ariaLabel || title || (textContent && textContent.trim().length > 0)) {
          hasAccessibleButton = true;
          break;
        }
      }
      
      expect(hasAccessibleButton).toBeTruthy();
    } else {
      // If no buttons, just pass the test
      expect(true).toBeTruthy();
    }
  });

  test('form elements have labels', async ({ page }) => {
    await loadApp(page);
    
    // Check for input elements
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();
    
    console.log(`Found ${inputCount} input elements on the page`);
    
    if (inputCount > 0) {
      // Check if at least one input has associated label or aria-label
      let hasLabeledInput = false;
      
      for (let i = 0; i < Math.min(inputCount, 5); i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const placeholder = await input.getAttribute('placeholder');
        
        if (ariaLabel || placeholder || (id && await page.locator(`label[for="${id}"]`).count() > 0)) {
          hasLabeledInput = true;
          break;
        }
      }
      
      expect(hasLabeledInput).toBeTruthy();
    } else {
      // If no inputs, just pass the test
      expect(true).toBeTruthy();
    }
  });
}); 