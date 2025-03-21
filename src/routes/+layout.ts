import { browser } from '$app/environment';
import { db } from '$lib/services/db';
import { chatStore } from '$lib/stores/chatStore';
import { settingsStore } from '$lib/stores/settingsStore';
import { get } from 'svelte/store';

// Function to verify API keys are loaded
async function verifyApiKeys() {
  if (!browser) return;
  
  try {
    // Get current settings
    const settings = get(settingsStore);
    
    // Check if OpenAI API key exists
    if (settings?.apiKeys?.openai) {
      console.log('OpenAI API key is available at startup');
      console.log(`Key length: ${settings.apiKeys.openai.length}, starts with: ${settings.apiKeys.openai.substring(0, 4)}...`);
    } else {
      console.warn('OpenAI API key is not available at startup');
    }
  } catch (error) {
    console.error('Error verifying API keys:', error);
  }
}

export const load = async () => {
  // Initialize the database if we're in the browser
  if (browser) {
    try {
      // Initialize the database first
      await db.initialize();
      console.log('IndexedDB initialized');
      
      // Initialize settings store first (required by other stores)
      await settingsStore.init();
      console.log('Settings store initialized');
      
      // Verify API keys are loaded
      const settings = get(settingsStore);
      console.log('Current settings state:', settings);
      
      // Check if we have Google API key in settings
      if (!settings.apiKeys?.google && browser && window.localStorage) {
        try {
          // First, try to get from localStorage backup
          const backupSettingsJson = localStorage.getItem('gervais-api-backup');
          if (backupSettingsJson) {
            const backupSettings = JSON.parse(backupSettingsJson);
            if (backupSettings?.apiKeys?.google) {
              console.log('Found Google API key in localStorage backup, restoring it');
              await settingsStore.updateApiKeys({
                google: backupSettings.apiKeys.google
              });
              console.log('Restored Google API key from backup');
            }
          }
          
          // If still no Google API key, set the default fallback key
          if (!get(settingsStore).apiKeys?.google) {
            console.log('No Google API key found, setting default fallback key');
            await settingsStore.updateApiKeys({
              google: 'AIzaSyCRI2T6ONhGuUAwjdoCzR6jAJXIs_ZCTHI'
            });
            console.log('Set default Google API key');
          }
        } catch (backupError) {
          console.error('Error checking for API key backup:', backupError);
          
          // Still set the default key if there was an error
          await settingsStore.updateApiKeys({
            google: 'AIzaSyCRI2T6ONhGuUAwjdoCzR6jAJXIs_ZCTHI'
          });
          console.log('Set default Google API key after error');
        }
      }
      
      // Then initialize chat store which may depend on settings
      await chatStore.init();
      console.log('Chat store initialized');
    } catch (error) {
      console.error('Error initializing application:', error);
      
      // If IndexedDB fails, we should still try to make the app usable
      // This is a fallback to prevent the app from being completely broken
      if (!error.toString().includes('IndexedDB is not supported')) {
        // Only show this message if it's not a browser support issue
        alert('Failed to initialize database. Some features may not work properly.');
      }
    }
  }
  
  return {};
};

// This ensures SSR doesn't wait for the database to initialize
export const ssr = false;
export const prerender = false; 