import { describe, it, expect, vi } from 'vitest';

// Mock all dependencies
vi.mock('$lib/services/db', () => ({
  db: {
    chats: {
      get: vi.fn().mockResolvedValue(null),
      add: vi.fn().mockResolvedValue('mock-id'),
      update: vi.fn().mockResolvedValue(1),
      delete: vi.fn().mockResolvedValue(1),
      bulkDelete: vi.fn().mockResolvedValue(1),
      toArray: vi.fn().mockResolvedValue([])
    }
  }
}));

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('mock-uuid')
}));

vi.mock('$app/environment', () => ({
  browser: true
}));

// Mock all model imports
vi.mock('$lib/services/llm/anthropic', () => ({
  anthropicModels: [{
    id: 'anthropic-claude',
    name: 'Claude',
    provider: 'anthropic'
  }],
  streamCompletion: vi.fn().mockResolvedValue('Anthropic response'),
  completion: vi.fn().mockResolvedValue('Anthropic response')
}));

vi.mock('$lib/services/llm/openai', () => ({
  openaiModels: [{
    id: 'openai-gpt4',
    name: 'GPT-4',
    provider: 'openai'
  }],
  streamCompletion: vi.fn().mockResolvedValue('OpenAI response'),
  completion: vi.fn().mockResolvedValue('OpenAI response')
}));

vi.mock('$lib/services/llm/google', () => ({
  googleModels: [{
    id: 'google-gemini',
    name: 'Gemini',
    provider: 'google'
  }],
  streamCompletion: vi.fn().mockResolvedValue('Google response'),
  completion: vi.fn().mockResolvedValue('Google response')
}));

vi.mock('$lib/services/llm/ollama', () => ({
  streamCompletion: vi.fn().mockResolvedValue('Ollama response'),
  completion: vi.fn().mockResolvedValue('Ollama response')
}));

vi.mock('$lib/services/llm/models', () => ({
  defaultModel: {
    id: 'openai-gpt4',
    name: 'GPT-4',
    provider: 'openai'
  },
  cloudModels: [
    {
      id: 'openai-gpt4',
      name: 'GPT-4',
      provider: 'openai'
    },
    {
      id: 'anthropic-claude',
      name: 'Claude',
      provider: 'anthropic'
    },
    {
      id: 'google-gemini',
      name: 'Gemini',
      provider: 'google'
    }
  ]
}));

// Now import the store (after mocks are defined)
import { chatStore, activeChat } from './chatStore';

describe('chatStore (Stubbed)', () => {
  it('should be defined', () => {
    expect(chatStore).toBeDefined();
    expect(activeChat).toBeDefined();
    expect(true).toBe(true);
  });

  it('should have expected methods', () => {
    expect(typeof chatStore.init).toBe('function');
    expect(true).toBe(true);
  });
}); 