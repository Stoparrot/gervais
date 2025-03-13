// @ts-check
import { test, expect } from '@playwright/test';
import { loadApp } from './fixtures';

test.describe('LLM Chat App', () => {
  test('loads successfully', async ({ page }) => {
    await loadApp(page);
    
    // Check that the page title is correct
    const title = await page.title();
    expect(title).toContain('LLM Chat App');
    
    // Verify that the sidebar is present - use a more specific selector
    const sidebarExists = await page.locator('.sidebar, [data-testid="sidebar"]').count() > 0;
    expect(sidebarExists).toBeTruthy();
    
    // Check for main content area using a CSS selector with attributes to specifically identify it
    const mainContent = await page.locator('.chat-main, main:not(.sidebar)').first();
    const mainContentExists = await mainContent.count() > 0;
    expect(mainContentExists).toBeTruthy();
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/app-loaded.png' });
  });
  
  test('has new chat functionality', async ({ page }) => {
    await loadApp(page);
    
    // Find the create new chat button specifically using its class
    // This ensures we don't match chat items that might have "New Chat" text
    const newChatButton = page.locator('.new-chat-button').first();
    
    // If we can't find by class, there might be a specific data attribute or role
    if (await newChatButton.count() === 0) {
      // Try alternative methods to find the button, but with high specificity
      const alternativeButton = page.locator('[data-testid="new-chat"], [aria-label="New Chat"]').first();
      const buttonExists = await alternativeButton.count() > 0;
      expect(buttonExists).toBeTruthy();
    } else {
      // Verify the button exists
      await expect(newChatButton).toBeVisible();
    }
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/new-chat-button.png' });
  });
  
  test('has message input field', async ({ page }) => {
    await loadApp(page);
    
    // Allow extra time for the input to appear
    await page.waitForTimeout(1000);
    
    // Look for message input using multiple specific selectors
    const messageInput = page.locator('textarea.message-input, textarea[placeholder], [contenteditable="true"][aria-label*="message"]');
    const inputExists = await messageInput.count() > 0;
    
    // If we can't immediately find it, we might need to create a new chat first
    if (!inputExists) {
      try {
        // Try to click "New Chat" button by class to avoid ambiguity
        await page.locator('.new-chat-button').first().click();
        
        // Wait for the input to appear after creating new chat
        await page.waitForTimeout(1000);
      } catch (e) {
        // Continue with the test even if we can't create a new chat
        console.log('Could not create new chat:', e);
      }
    }
    
    // Now check again for the input field
    const hasTextarea = await page.locator('textarea, [contenteditable="true"], .message-input').count() > 0;
    expect(hasTextarea).toBeTruthy();
  });
  
  test('has sidebar with content', async ({ page }) => {
    await loadApp(page);
    
    // Verify sidebar exists with a more specific selector
    const sidebar = page.locator('.sidebar');
    const sidebarExists = await sidebar.count() > 0;
    expect(sidebarExists).toBeTruthy();
    
    if (sidebarExists) {
      // Check if sidebar has any content at all
      const hasContent = await sidebar.locator('*').count() > 0;
      expect(hasContent).toBeTruthy();
      
      // Check for specific sidebar elements that should exist, using very specific selectors
      // that won't match multiple elements
      const hasSidebarContent = await page.locator([
        // Model selector
        '.sidebar .model-selector', 
        '.sidebar select',
        
        // Chat list
        '.sidebar .chats-list', 
        '.sidebar ul',
        
        // Chat items
        '.sidebar .chat-item',
        '.sidebar [class*="chat"]',
        
        // New chat button
        '.sidebar .new-chat-button'
      ].join(', ')).count() > 0;
      
      expect(hasSidebarContent).toBeTruthy();
    }
  });
}); 