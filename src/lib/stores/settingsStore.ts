import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { Settings } from '$lib/types';
import { db } from '$lib/services/db';

export interface ApiKeys {
  anthropic: string;
  openai: string;
  google: string;
  ollamaHost: string;
}

// Default settings
const defaultSettings: Settings = {
  theme: 'system', // 'light', 'dark', 'system'
  apiKeys: {
    anthropic: '',
    openai: '',
    google: '',
    ollamaHost: 'http://localhost:11434'
  },
  videoCaptureDuration: 5, // seconds
  videoCaptureFps: 1,
  saveChatsToLocalStorage: false, // Using IndexedDB instead
  preserveKeyFormat: false // Whether to use API keys as-is without modifications
};

// Create settings store with initial default values
const { subscribe, set, update } = writable<Settings>(defaultSettings);

// Export the store immediately to avoid circular dependencies
export const settingsStore = {
  subscribe,
  
  // Load settings from IndexedDB
  async loadSettings() {
    if (!browser) return;
    
    try {
      // Try to get settings from IndexedDB
      const dbSettings = await db.settings.get('user-settings');
      
      if (dbSettings) {
        console.log('Loaded settings from IndexedDB:', dbSettings);
        
        // Verify API keys are present and log their status
        if (dbSettings.apiKeys) {
          Object.entries(dbSettings.apiKeys).forEach(([provider, key]) => {
            if (key && typeof key === 'string' && key.length > 0) {
              console.log(`Found ${provider} API key (length: ${key.length}, starts with: ${key.substring(0, 4)}...)`);
            } else {
              console.log(`No ${provider} API key found in settings`);
            }
          });
        } else {
          console.warn('No API keys object found in loaded settings');
          // Initialize empty API keys object if missing
          dbSettings.apiKeys = {
            anthropic: '',
            openai: '',
            google: '',
            ollamaHost: 'http://localhost:11434'
          };
        }
        
        set(dbSettings);
      } else {
        // Initialize settings in DB if not exists
        console.log('Creating default settings in IndexedDB');
        await db.settings.add({
          ...defaultSettings,
          id: 'user-settings'
        });
        set(defaultSettings);
      }
    } catch (error) {
      console.error('Failed to load settings from IndexedDB:', error);
      
      // Try to get settings from localStorage as fallback
      try {
        const storedSettings = localStorage.getItem('gervais-settings');
        if (storedSettings) {
          console.log('Found settings in localStorage, migrating to IndexedDB');
          const settings = JSON.parse(storedSettings);
          set(settings);
          
          // Migrate to IndexedDB
          await db.settings.add({
            ...settings,
            id: 'user-settings'
          });
          
          // Remove from localStorage after migration
          localStorage.removeItem('gervais-settings');
        }
      } catch (localError) {
        console.error('Failed to load settings from localStorage:', localError);
      }
    }
  },
  
  // Save settings to IndexedDB
  async saveSettings(settings: Settings) {
    if (!browser) return;
    
    try {
      console.log('Saving settings to IndexedDB:', settings);
      await db.settings.put({
        ...settings,
        id: 'user-settings'
      });
    } catch (error) {
      console.error('Failed to save settings to IndexedDB:', error);
      
      // Fallback to localStorage if IndexedDB fails
      try {
        localStorage.setItem('gervais-settings', JSON.stringify(settings));
        console.log('Saved settings to localStorage as fallback');
      } catch (localError) {
        console.error('Failed to save settings to localStorage:', localError);
      }
    }
  },
  
  // Update API keys
  async updateApiKeys(newKeys: Partial<Record<string, string>>) {
    if (!browser) return;
    
    update(state => {
      const updatedState = {
        ...state,
        apiKeys: {
          ...state.apiKeys,
          ...newKeys
        }
      };
      
      // Save to IndexedDB
      this.saveSettings(updatedState).catch(console.error);
      
      return updatedState;
    });
  },
  
  // Update other settings
  async updateSettings(newSettings: Partial<Settings>) {
    if (!browser) return;
    
    update(state => {
      // Create updated state while preserving API keys
      const updatedState = {
        ...state,
        ...newSettings,
        apiKeys: {
          ...state.apiKeys, // Preserve existing API keys
          ...(newSettings.apiKeys || {}) // Merge any new API keys
        }
      };
      
      // Save to IndexedDB
      this.saveSettings(updatedState).catch(console.error);
      
      return updatedState;
    });
  },
  
  // Update theme
  updateTheme(theme: 'light' | 'dark' | 'system') {
    update(state => {
      const updatedState = {
        ...state,
        theme
      };
      
      // Save to IndexedDB
      this.saveSettings(updatedState).catch(console.error);
      
      return updatedState;
    });
  },
  
  // Initialize store
  async init() {
    await this.loadSettings();
  }
};

// We don't auto-initialize here to avoid circular dependencies
// The store should be initialized in layout.ts or layout.svelte 