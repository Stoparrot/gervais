import { settingsStore } from '$lib/stores/settingsStore';
import type { Message, LLMModel, MediaItem } from '$lib/types';
import { get } from 'svelte/store';
import { GoogleService } from './google';

// Base interface for API requests
export interface ApiRequest {
  model: string;
  messages: ApiMessage[];
  stream?: boolean;
  tools?: ApiTool[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

// API message format
export interface ApiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ApiMessageContent[];
}

// Content types for API messages
export interface ApiMessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

// Tool interface
export interface ApiTool {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

// Base interface for LLM service providers
export interface LLMService {
  sendMessage(
    messages: Message[],
    model: LLMModel,
    options: {
      stream?: boolean;
      tools?: ApiTool[];
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<ReadableStream<Uint8Array> | string>;
  
  formatMessages(messages: Message[]): ApiMessage[];
  
  processMedia?(
    media: MediaItem[]
  ): Promise<ApiMessageContent[]>;
}

// OpenAI compatible service (for OpenAI, Ollama, and other compatible APIs)
export class OpenAIService implements LLMService {
  private apiKey: string | null = null;
  private baseUrl: string = 'https://api.openai.com/v1';
  
  constructor(baseUrl?: string) {
    if (baseUrl) {
      this.baseUrl = baseUrl;
    }
    
    // Get API key from settings store
    const settings = get(settingsStore);
    this.apiKey = settings.apiKeys.openai || null;
    
    // Subscribe to settings store to get updated API key
    settingsStore.subscribe(settings => {
      this.apiKey = settings.apiKeys.openai || null;
    });
  }
  
  async sendMessage(
    messages: Message[],
    model: LLMModel,
    options: {
      stream?: boolean;
      tools?: ApiTool[];
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<ReadableStream<Uint8Array> | string> {
    if (!this.apiKey && !model.isLocal) {
      throw new Error('OpenAI API key is required');
    }
    
    const apiMessages = this.formatMessages(messages);
    
    const request: ApiRequest = {
      model: model.id,
      messages: apiMessages,
      stream: options.stream,
      tools: options.tools,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens,
    };
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error calling OpenAI API');
    }
    
    if (options.stream) {
      return response.body as ReadableStream<Uint8Array>;
    } else {
      const data = await response.json();
      return data.choices[0].message.content;
    }
  }
  
  formatMessages(messages: Message[]): ApiMessage[] {
    return messages.map(msg => {
      if (msg.media && msg.media.length > 0) {
        // Format messages with media
        const content: ApiMessageContent[] = [
          { type: 'text', text: msg.content },
          // Add media content items - to be implemented
        ];
        
        return {
          role: msg.role as 'user' | 'assistant' | 'system',
          content,
        };
      } else {
        // Simple text message
        return {
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        };
      }
    });
  }
  
  async processMedia(media: MediaItem[]): Promise<ApiMessageContent[]> {
    // Process media items to format for API
    const contentItems: ApiMessageContent[] = [];
    
    for (const item of media) {
      if (item.type === 'image' && item.url) {
        contentItems.push({
          type: 'image_url',
          image_url: {
            url: item.url,
          },
        });
      }
      // Add more media type processing as needed
    }
    
    return contentItems;
  }
}

// Anthropic Claude service
export class AnthropicService implements LLMService {
  private apiKey: string | null = null;
  private baseUrl: string = 'https://api.anthropic.com/v1';
  
  constructor() {
    // Get API key from settings store
    const settings = get(settingsStore);
    this.apiKey = settings.apiKeys.anthropic || null;
    
    // Subscribe to settings store to get updated API key
    settingsStore.subscribe(settings => {
      this.apiKey = settings.apiKeys.anthropic || null;
    });
  }
  
  async sendMessage(
    messages: Message[],
    model: LLMModel,
    options: {
      stream?: boolean;
      tools?: ApiTool[];
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<ReadableStream<Uint8Array> | string> {
    if (!this.apiKey) {
      throw new Error('Anthropic API key is required');
    }
    
    const apiMessages = this.formatMessages(messages);
    
    // Anthropic API has a different format than OpenAI, we need to adapt
    const request = {
      model: model.id,
      messages: apiMessages,
     // stream: options.stream,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 4096,
     // system: this.extractSystemMessage(messages),
    };
    
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error calling Anthropic API');
    }
    
    if (options.stream) {
      return response.body as ReadableStream<Uint8Array>;
    } else {
      const data = await response.json();
      return data.content[0].text;
    }
  }
  
  formatMessages(messages: Message[]): ApiMessage[] {
    // Filter out system messages as they are handled separately in Anthropic API
    return messages
      .filter(msg => msg.role !== 'system')
      .map(msg => {
        if (msg.media && msg.media.length > 0) {
          // Format messages with media
          const content: ApiMessageContent[] = [
            { type: 'text', text: msg.content },
            // Add media content items - to be implemented
          ];
          
          return {
            role: msg.role as 'user' | 'assistant',
            content,
          };
        } else {
          // Simple text message
          return {
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          };
        }
      });
  }
  
  extractSystemMessage(messages: Message[]): string {
    // Find the system message if it exists
    const systemMessage = messages.find(msg => msg.role === 'system');
    return systemMessage?.content || '';
  }
  
  async processMedia(media: MediaItem[]): Promise<ApiMessageContent[]> {
    // Process media items to format for API
    const contentItems: ApiMessageContent[] = [];
    
    for (const item of media) {
      if (item.type === 'image' && item.url) {
        contentItems.push({
          type: 'image_url',
          image_url: {
            url: item.url,
          },
        });
      }
      // Add more media type processing as needed
    }
    
    return contentItems;
  }
}

// Get LLM service based on provider
export function getLLMService(provider: 'openai' | 'anthropic' | 'google' | 'ollama' | 'local'): LLMService {
  switch (provider) {
    case 'openai':
      return new OpenAIService();
    case 'anthropic':
      return new AnthropicService();
    case 'google':
      return new GoogleService();
    case 'ollama':
      // Ollama uses OpenAI-compatible API
      const settings = get(settingsStore);
      return new OpenAIService(settings.apiKeys.ollamaHost || 'http://localhost:11434/v1');
    case 'local':
      // Local OpenAI-compatible API
      const localSettings = get(settingsStore);
      return new OpenAIService(localSettings.apiKeys.localHost || 'http://localhost:8000/v1');
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
} 