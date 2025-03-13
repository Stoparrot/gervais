import { settingsStore } from '$lib/stores/settingsStore';
import { get } from 'svelte/store';
import type { Message, MediaItem } from '$lib/types';
import Anthropic from '@anthropic-ai/sdk';

// Define Anthropic API types
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContent[];
}

interface AnthropicContent {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

interface AnthropicCompletionRequest {
  model: string;
  messages: AnthropicMessage[];
  stream: boolean;
  max_tokens?: number;
  temperature?: number;
  system?: string;
}

interface AnthropicCompletionResponse {
  id: string;
  type: string;
  content: {
    type: string;
    text: string;
  }[];
}

interface AnthropicStreamChunk {
  type: string;
  delta?: {
    type: string;
    text: string;
  };
  stop_reason?: string;
}

// Anthropic models
export const anthropicModels = [
  {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet',
    provider: 'anthropic' as const,
    description: 'Latest and most capable model',
    isLocal: false,
    maxTokens: 200000,
    supportsStreaming: true,
    supportsFiles: true,
    supportsThinking: true,
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic' as const,
    description: 'Fastest model for quick responses',
    isLocal: false,
    maxTokens: 100000,
    supportsStreaming: true,
    supportsFiles: true,
    supportsThinking: false,
  }
];

// Convert file data URL to base64
function dataURLToBase64(dataURL: string): string {
  // Extract base64 data from Data URL
  return dataURL.split(',')[1];
}

// Get media type from data URL
function getMediaTypeFromDataURL(dataURL: string): string {
  // Extract MIME type from Data URL
  const match = dataURL.match(/^data:([^;]+);base64,/);
  return match ? match[1] : 'application/octet-stream';
}

// Convert Gervais Messages to Anthropic format
function convertToAnthropicMessages(messages: Message[]): { messages: AnthropicMessage[], systemPrompt?: string } {
  // Extract any system message to use as system prompt
  const systemMessages = messages.filter(msg => msg.role === 'system');
  const systemPrompt = systemMessages.length > 0 
    ? systemMessages.map(msg => msg.content).join('\n\n')
    : undefined;
  
  // Only include user and assistant messages
  const conversationMessages = messages.filter(msg => msg.role === 'user' || msg.role === 'assistant');
  
  // Convert messages to Anthropic format
  const anthropicMessages = conversationMessages.map(message => {
    // For messages without media, return simple text format
    if (!message.media || message.media.length === 0) {
      return {
        role: message.role as 'user' | 'assistant',
        content: message.content
      };
    }
    
    // For messages with media, create content array
    const contentArray: AnthropicContent[] = [];
    
    // Add text content if any
    if (message.content.trim()) {
      contentArray.push({
        type: 'text',
        text: message.content
      });
    }
    
    // Add media as image content
    message.media.forEach(media => {
      if (media.type === 'image' && media.preview) {
        contentArray.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: getMediaTypeFromDataURL(media.preview),
            data: dataURLToBase64(media.preview)
          }
        });
      }
    });
    
    return {
      role: message.role as 'user' | 'assistant',
      content: contentArray
    };
  });
  
  return {
    messages: anthropicMessages,
    systemPrompt
  };
}

// Get API key from settings
function getApiKey(): string {
  const settings = get(settingsStore);
  const apiKey = settings.apiKeys.anthropic;
  
  if (!apiKey) {
    throw new Error('Anthropic API key not found. Please add your API key in Settings.');
  }
  
  return apiKey;
}

// Streaming completion API
export async function streamCompletion(
  modelId: string,
  messages: Message[],
  onChunk: (text: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void,
  onThinking?: (thinking: string) => void
) {
  try {
    const apiKey = getApiKey();
    const { messages: anthropicMessages, systemPrompt } = convertToAnthropicMessages(messages);
    
    console.log('Sending request to Anthropic API with model:', modelId);
    
    // Try using the SDK first
    try {
      console.log('Attempting to use Anthropic SDK...');
      await useAnthropicSdkStream(
        apiKey,
        modelId,
        anthropicMessages,
        systemPrompt,
        onChunk,
        onComplete,
        onError,
        onThinking
      );
      return;
    } catch (sdkError) {
      console.error('Error using Anthropic SDK, falling back to fetch:', sdkError);
      // Fall back to fetch implementation
    }
    
    // Original fetch implementation
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelId,
        messages: anthropicMessages,
        system: systemPrompt,
        dangerouslyAllowBrowser: "true",
        stream: true,
        temperature: 0.7,
        max_tokens: 4000
      }),
    });
    
    if (!response.ok) {
      let errorMessage = `Status code: ${response.status}`;
      try {
        const error = await response.json();
        errorMessage = error.error?.message || errorMessage;
      } catch (e) {
        // If JSON parsing fails, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(`Anthropic API error: ${errorMessage}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Failed to get response reader');
    
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let responseText = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process all complete lines in buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
        
        try {
          // Extract JSON part
          const jsonStr = trimmedLine.replace(/^data: /, '');
          if (jsonStr === '') continue;
          
          const chunk: AnthropicStreamChunk = JSON.parse(jsonStr);
          
          // Handle thinking if supported
          if (chunk.type === 'thinking' && onThinking && chunk.delta?.text) {
            onThinking(chunk.delta.text);
            continue;
          }
          
          // Get content delta if available
          if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
            responseText += chunk.delta.text;
            onChunk(responseText);
          }
          
          // Check if generation is complete
          if (chunk.type === 'message_stop') {
            onComplete();
            return responseText;
          }
        } catch (e) {
          console.warn('Error parsing chunk:', e);
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

// Helper function to use the Anthropic SDK for streaming
async function useAnthropicSdkStream(
  apiKey: string,
  modelId: string,
  messages: AnthropicMessage[],
  systemPrompt: string | undefined,
  onChunk: (text: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void,
  onThinking?: (thinking: string) => void
) {
  // Initialize Anthropic client
  try {
    const anthropic = new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });
    
    // Convert to simple text-only messages
    const simplifiedMessages = messages.map(msg => {
      return {
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : 
          msg.content.filter(item => item.type === 'text').map(item => item.text || '').join('\n')
      };
    });
    
    console.log('Using Anthropic SDK with model:', modelId);
    
    // Use hardcoded simple message for debugging
    const stream = await anthropic.messages.create({
      model: modelId,
      max_tokens: 1024,
      messages: [{ role: "user", content: "Hello, Claude" }],
      system: systemPrompt,
      stream: true
    });
    
    let responseText = '';
    
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && 'text' in chunk.delta) {
        responseText += chunk.delta.text;
        onChunk(responseText);
      }
      
      if (chunk.type === 'message_stop') {
        onComplete();
        return responseText;
      }
    }
    
    onComplete();
    return responseText;
  } catch (error) {
    console.error('Error using Anthropic SDK:', error);
    throw error;
  }
}

// Non-streaming completion API
export async function completion(modelId: string, messages: Message[]): Promise<string> {
  try {
    const apiKey = getApiKey();
    const { messages: anthropicMessages, systemPrompt } = convertToAnthropicMessages(messages);
    
    console.log('Sending non-streaming request to Anthropic API with model:', modelId);
    
    // Try using the SDK first
    try {
      console.log('Attempting to use Anthropic SDK for non-streaming completion...');
      return await useAnthropicSdk(apiKey, modelId, anthropicMessages, systemPrompt);
    } catch (sdkError) {
      console.error('Error using Anthropic SDK, falling back to fetch:', sdkError);
      // Fall back to fetch implementation
    }
    
    // Original fetch implementation
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelId,
        messages: anthropicMessages,
        system: systemPrompt,
        dangerouslyAllowBrowser: "true",
        stream: false,
        temperature: 0.7,
        max_tokens: 4000
      }),
    });
    
    if (!response.ok) {
      let errorMessage = `Status code: ${response.status}`;
      try {
        const error = await response.json();
        errorMessage = error.error?.message || errorMessage;
      } catch (e) {
        // If JSON parsing fails, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(`Anthropic API error: ${errorMessage}`);
    }
    
    const data: AnthropicCompletionResponse = await response.json();
    return data.content[0]?.text || '';
  } catch (error) {
    console.error('Anthropic completion error:', error);
    throw error;
  }
}

// Helper function to use the Anthropic SDK for non-streaming completion
async function useAnthropicSdk(
  apiKey: string,
  modelId: string,
  messages: AnthropicMessage[],
  systemPrompt: string | undefined
): Promise<string> {
  try {
    const anthropic = new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });
    
    // Use hardcoded simple message for debugging
    const msg = await anthropic.messages.create({
      model: modelId,
      max_tokens: 1024,
      messages: [{ role: "user", content: "Hello, Claude" }],
      system: systemPrompt
    });
    
    // Safely extract text from the first content block
    if (msg.content && msg.content.length > 0) {
      const firstBlock = msg.content[0];
      if (firstBlock.type === 'text') {
        return firstBlock.text;
      }
    }
    
    return '';
  } catch (error) {
    console.error('Error using Anthropic SDK:', error);
    throw error;
  }
} 