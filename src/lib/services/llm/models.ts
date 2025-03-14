import type { LLMModel } from '$lib/types';
import { anthropicModels } from './anthropic';
import { openaiModels } from './openai';
import { googleModels } from './google';
import { fetchAvailableModels } from './ollama';
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// Group cloud models (these are static)
export const cloudModels: LLMModel[] = [
  ...anthropicModels,
  ...openaiModels,
  ...googleModels,
];

// Create a store for local models (initially empty, will be populated asynchronously)
export const localModelsStore = writable<LLMModel[]>([]);

// Combine all models in a derived store
export const allModelsStore = derived(
  localModelsStore,
  ($localModels) => [...cloudModels, ...$localModels]
);

// For backwards compatibility - non-reactive arrays
export let localModels: LLMModel[] = [];
export let allModels: LLMModel[] = [...cloudModels];

// Default model to use
export const defaultModel: LLMModel = googleModels[0]; // Gemini 2.0 Flash

// Initialize models
export async function initializeModels() {
  if (!browser) return;
  
  try {
    // Fetch Ollama models
    const ollamaModels = await fetchAvailableModels();
    
    // Update the store and the array
    localModels = ollamaModels;
    localModelsStore.set(ollamaModels);
    
    // Update allModels array for backwards compatibility
    allModels = [...cloudModels, ...ollamaModels];
    
    return ollamaModels;
  } catch (error) {
    console.error('Failed to initialize models:', error);
    return [];
  }
} 