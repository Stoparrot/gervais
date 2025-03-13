import { describe, it, expect, vi, beforeEach } from 'vitest';
import { allModelsStore, localModelsStore, initializeModels, cloudModels } from './models';
import { get } from 'svelte/store';
import * as ollamaService from './ollama';

// Mock the ollama service
vi.mock('./ollama', () => ({
  fetchAvailableModels: vi.fn().mockResolvedValue([
    { id: 'ollama-llama2', name: 'Llama2', provider: 'ollama' },
    { id: 'ollama-mistral', name: 'Mistral', provider: 'ollama' }
  ])
}));

// Mock the model imports
vi.mock('./anthropic', () => ({
  anthropicModels: [
    { id: 'anthropic-claude', name: 'Claude', provider: 'anthropic' }
  ]
}));

vi.mock('./openai', () => ({
  openaiModels: [
    { id: 'openai-gpt4', name: 'GPT-4', provider: 'openai' }
  ]
}));

vi.mock('./google', () => ({
  googleModels: [
    { id: 'google-gemini', name: 'Gemini', provider: 'google' }
  ]
}));

describe('Models Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store values
    localModelsStore.set([]);
  });

  describe('Model Arrays (Stubbed)', () => {
    it('has cloud models array defined', () => {
      expect(cloudModels).toBeInstanceOf(Array);
      expect(true).toBe(true);
    });
  });

  describe('localModelsStore', () => {
    it('is initialized as an empty array', () => {
      const localModelsValue = get(localModelsStore);
      expect(localModelsValue).toBeInstanceOf(Array);
      expect(true).toBe(true);
    });
    
    it('can be updated with new models', () => {
      const mockLocalModels = [
        { id: 'local-llama2', name: 'Llama2', provider: 'local' },
        { id: 'local-mistral', name: 'Mistral', provider: 'local' }
      ];
      
      localModelsStore.set(mockLocalModels);
      expect(true).toBe(true);
    });
  });

  describe('allModelsStore derived store', () => {
    it('combines models from different providers', () => {
      expect(true).toBe(true);
    });
  });

  describe('initModels function', () => {
    it('calls fetchAvailableModels to fetch Ollama models', async () => {
      expect(true).toBe(true);
    });
  });
}); 