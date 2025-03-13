import { render } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Settings from './Settings.svelte';
import { settingsStore } from '$lib/stores/settingsStore';

// Mock the settingsStore
vi.mock('$lib/stores/settingsStore', () => {
  const mockSettings = {
    theme: 'light',
    apiKeys: {
      anthropic: '',
      openai: '',
      google: '',
      ollamaHost: 'http://localhost:11434',
      localHost: 'http://localhost:8000'
    },
    videoCaptureDuration: 5,
    videoCaptureFps: 1,
    saveChatsToLocalStorage: false,
    preserveKeyFormat: false
  };
  
  const mockStore = {
    subscribe: vi.fn((callback) => {
      callback(mockSettings);
      return () => {};
    }),
    updateApiKeys: vi.fn().mockResolvedValue(undefined),
    updateSettings: vi.fn().mockResolvedValue(undefined)
  };
  
  return {
    settingsStore: mockStore
  };
});

// Mock Button component
vi.mock('./Button.svelte', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      return {
        $$render: () => {
          return '<button class="mock-button">Mock Button</button>';
        }
      };
    })
  };
});

// Mock XIcon component
vi.mock('lucide-svelte/icons/x', () => {
  return {
    default: vi.fn().mockImplementation(() => {
      return {
        $$render: () => {
          return '<svg class="mock-icon">X</svg>';
        }
      };
    })
  };
});

describe('Settings Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings panel when isOpen is true', () => {
    const { container } = render(Settings, { isOpen: true });
    
    const settingsOverlay = container.querySelector('.settings-overlay');
    expect(settingsOverlay).not.toBeNull();
  });

  it('does not render settings panel when isOpen is false', () => {
    const { container } = render(Settings, { isOpen: false });
    
    const settingsOverlay = container.querySelector('.settings-overlay');
    expect(settingsOverlay).toBeNull();
  });

  it('renders API key input fields', () => {
    const { container } = render(Settings, { isOpen: true });
    
    // Check for the presence of API key inputs
    const anthropicInput = container.querySelector('#anthropic-key');
    const openaiInput = container.querySelector('#openai-key');
    const googleInput = container.querySelector('#google-key');
    const ollamaHostInput = container.querySelector('#ollama-host');
    
    expect(anthropicInput).not.toBeNull();
    expect(openaiInput).not.toBeNull();
    expect(googleInput).not.toBeNull();
    expect(ollamaHostInput).not.toBeNull();
  });

  it('initializes with values from the store', () => {
    const { container } = render(Settings, { isOpen: true });
    
    // Check if the Ollama host has the default value from the store
    const ollamaHostInput = container.querySelector('#ollama-host');
    expect(ollamaHostInput.value).toBe('http://localhost:11434');
  });
}); 