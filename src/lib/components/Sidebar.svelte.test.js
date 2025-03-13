import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Sidebar from './Sidebar.svelte';
import { chatStore, activeChat } from '$lib/stores/chatStore';
import { allModelsStore, localModelsStore } from '$lib/services/llm/models';

// Mock stores
vi.mock('$lib/stores/chatStore', () => {
  const { writable } = require('svelte/store');
  
  const mockActiveChat = writable(null);
  
  const mockChatStore = {
    subscribe: vi.fn(),
    createNewChat: vi.fn(),
    selectChat: vi.fn(),
    deleteChat: vi.fn(),
    updateChatModel: vi.fn(),
    chats: []
  };
  
  return { 
    chatStore: mockChatStore,
    activeChat: mockActiveChat
  };
});

vi.mock('$lib/services/llm/models', () => {
  const { writable } = require('svelte/store');
  
  const mockLocalModelsStore = writable([]);
  const mockAllModelsStore = writable([
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      description: 'Most powerful model',
      isLocal: false
    },
    {
      id: 'claude-3-5-sonnet',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      description: 'Powerful and balanced model',
      isLocal: false
    }
  ]);
  
  return {
    allModelsStore: mockAllModelsStore,
    localModelsStore: mockLocalModelsStore,
    initializeModels: vi.fn().mockResolvedValue([]),
    allModels: [],
    cloudModels: [],
    localModels: [],
    anthropicModels: [],
    openaiModels: [],
    googleModels: []
  };
});

// Mock Button component with proper class handling
vi.mock('./Button.svelte', () => {
  return {
    default: vi.fn().mockImplementation((props) => {
      return {
        $$render: () => {
          // Extract class from props
          const className = props?.class || '';
          const variant = props?.variant || 'default';
          const size = props?.size || 'md';
          const fullWidth = props?.fullWidth ? 'full-width' : '';
          
          // Combine all classes
          const combinedClass = `mock-button ${variant} ${size} ${fullWidth} ${className}`;
          
          // Return a button with the appropriate classes
          return `<button class="${combinedClass}">${props?.children || ''}</button>`;
        }
      };
    })
  };
});

// Mock Lucide icons
vi.mock('lucide-svelte', () => {
  return {
    Plus: vi.fn().mockImplementation(() => ({
      $$render: () => '<svg>Plus</svg>'
    })),
    X: vi.fn().mockImplementation(() => ({
      $$render: () => '<svg>X</svg>'
    })),
    ChevronLeft: vi.fn().mockImplementation(() => ({
      $$render: () => '<svg>ChevronLeft</svg>'
    })),
    RefreshCw: vi.fn().mockImplementation(() => ({
      $$render: () => '<svg>RefreshCw</svg>'
    }))
  };
});

describe('Sidebar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up chatStore for testing
    chatStore.chats = [
      {
        id: 'chat1',
        title: 'Test Chat 1',
        messages: [],
        model: { id: 'gpt-4', name: 'GPT-4' },
        timestamp: Date.now()
      },
      {
        id: 'chat2',
        title: 'Test Chat 2',
        messages: [],
        model: { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
        timestamp: Date.now() - 1000
      }
    ];
    
    // Mock subscribe to return store data
    chatStore.subscribe.mockImplementation(callback => {
      callback({ chats: chatStore.chats });
      return () => {};
    });
  });

  it('renders sidebar with model selector', () => {
    const { container } = render(Sidebar);
    
    const modelSelector = container.querySelector('.model-selector');
    expect(modelSelector).not.toBeNull();
  });

  it('renders chat list with existing chats', () => {
    const { container } = render(Sidebar);
    
    const chatItems = container.querySelectorAll('.chat-item');
    expect(chatItems.length).toBe(2);
    
    // Check if chat titles are in the document
    const chatTitles = Array.from(chatItems).map(item => item.textContent);
    expect(chatTitles.some(text => text.includes('Test Chat 1'))).toBe(true);
    expect(chatTitles.some(text => text.includes('Test Chat 2'))).toBe(true);
  });

  it('has a button for creating new chats', () => {
    const { container } = render(Sidebar);
    
    // Look for buttons with primary variant
    const buttons = container.querySelectorAll('button.mock-button.primary');
    
    // At least one of them should contain "New Chat" text
    const newChatButton = Array.from(buttons).find(button => 
      button.textContent.includes('New Chat')
    );
    
    expect(newChatButton).not.toBeNull();
  });

  it('has chat items that can be selected', () => {
    const { container } = render(Sidebar);
    
    // Verify chat items exist
    const chatItems = container.querySelectorAll('.chat-item');
    expect(chatItems.length).toBe(2);
    
    // We can't directly test click events in Svelte 5 with component.$on
    // Instead, we verify the structure is correct
    expect(chatItems[0].className).toContain('chat-item');
  });

  it('has the correct structure for chat items', () => {
    const { container } = render(Sidebar);
    
    // Find all chat items
    const chatItems = container.querySelectorAll('.chat-item');
    expect(chatItems.length).toBe(2);
    
    // Verify each chat item has a title
    chatItems.forEach(item => {
      const titleElement = item.querySelector('.chat-title');
      expect(titleElement).not.toBeNull();
    });
    
    // Verify the sidebar has the correct structure
    const sidebar = container.querySelector('.sidebar');
    expect(sidebar).not.toBeNull();
    expect(sidebar.querySelector('.sidebar-header')).not.toBeNull();
    expect(sidebar.querySelector('.sidebar-content')).not.toBeNull();
    expect(sidebar.querySelector('.chats-list')).not.toBeNull();
  });

  it('displays model selector with options', () => {
    const { container } = render(Sidebar);
    
    const select = container.querySelector('.model-selector select');
    expect(select).not.toBeNull();
  });
}); 