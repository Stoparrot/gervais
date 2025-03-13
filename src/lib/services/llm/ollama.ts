import { settingsStore } from '$lib/stores/settingsStore';
import { get } from 'svelte/store';
import type { LLMModel, Message } from '$lib/types';

// Define Ollama API types
interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

interface OllamaCompletionRequest {
  model: string;
  prompt: string;
  stream: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

// Get API host from settings
function getOllamaHost(): string {
  const settings = get(settingsStore);
  const host = settings.apiKeys.ollamaHost || 'http://localhost:11434';
  
  // Remove trailing slash if present
  return host.endsWith('/') ? host.slice(0, -1) : host;
}

// Fetch available models from Ollama
export async function fetchAvailableModels(): Promise<LLMModel[]> {
  try {
    const host = getOllamaHost();
    const response = await fetch(`${host}/api/tags`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Ollama models: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Map Ollama model format to our LLMModel format
    return data.models.map((model: OllamaModel) => ({
      id: model.name,
      name: formatModelName(model.name),
      provider: 'ollama' as const,
      description: getModelDescription(model),
      isLocal: true,
      maxTokens: 4096, // Default, could be refined based on model information
      supportsStreaming: true,
      supportsFiles: false,
    }));
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    // Return empty array rather than crashing
    return [];
  }
}

// Format model name for display (capitalize, remove version numbers, etc.)
function formatModelName(name: string): string {
  // Remove version tags like :latest
  let displayName = name.split(':')[0];
  
  // Capitalize and clean up name
  displayName = displayName
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
    
  return displayName;
}

// Get a human-readable description for the model
function getModelDescription(model: OllamaModel): string {
  const details = model.details;
  
  if (details && details.parameter_size) {
    return `${details.family || 'Open source'} model (${details.parameter_size})`;
  }
  
  return 'Local LLM model';
}

// Convert messages to Ollama prompt format
function convertToOllamaPrompt(messages: Message[]): string {
  // Create conversation format that Ollama understands
  let prompt = '';
  
  for (const message of messages) {
    if (message.role === 'system') {
      prompt += `SYSTEM: ${message.content}\n\n`;
    } else if (message.role === 'user') {
      prompt += `USER: ${message.content}\n\n`;
    } else if (message.role === 'assistant') {
      prompt += `ASSISTANT: ${message.content}\n\n`;
    }
  }
  
  // Add final prompt marker for assistant response
  prompt += 'ASSISTANT: ';
  
  return prompt;
}

// Streaming completion API
export async function streamCompletion(
  modelId: string,
  messages: Message[],
  onChunk: (text: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
) {
  try {
    const host = getOllamaHost();
    const prompt = convertToOllamaPrompt(messages);
    
    const response = await fetch(`${host}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelId,
        prompt,
        stream: true,
        options: {
          temperature: 0.7,
        }
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${error || response.statusText}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Failed to get response reader');
    
    const decoder = new TextDecoder('utf-8');
    let responseText = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const data = JSON.parse(line);
          if (data.response) {
            responseText += data.response;
            onChunk(responseText);
          }
          
          // Check if generation is complete
          if (data.done) {
            onComplete();
            return responseText;
          }
        } catch (e) {
          console.warn('Error parsing Ollama chunk:', e);
        }
      }
    }
    
    onComplete();
    return responseText;
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

// Non-streaming completion API
export async function completion(modelId: string, messages: Message[]): Promise<string> {
  try {
    const host = getOllamaHost();
    const prompt = convertToOllamaPrompt(messages);
    
    const response = await fetch(`${host}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelId,
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
        }
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${error || response.statusText}`);
    }
    
    const data = await response.json();
    return data.response || '';
  } catch (error) {
    console.error('Ollama completion error:', error);
    throw error;
  }
} 