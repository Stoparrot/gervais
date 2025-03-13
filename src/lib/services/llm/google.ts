import { settingsStore } from '$lib/stores/settingsStore';
import { get } from 'svelte/store';
import type { Message, MediaItem, LLMModel } from '$lib/types';
import type { LLMService, ApiTool, ApiMessage, ApiMessageContent } from './api';

// Define Google API types
interface GoogleMessage {
  role: 'user' | 'model';
  parts: {
    text?: string;
    inlineData?: {
      mimeType: string;
      data: string;
    };
  }[];
}

interface GoogleCompletionRequest {
  contents: GoogleMessage[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
  safetySettings?: {
    category: string;
    threshold: string;
  }[];
  stream?: boolean;
}

interface GoogleCompletionResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
    finishReason: string;
  }[];
}

interface GoogleStreamChunk {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
    finishReason?: string;
  }[];
}

// Google models
export const googleModels = [
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash',
    provider: 'google' as const,
    description: 'Fast and efficient model with enhanced thinking capabilities',
    isLocal: false,
    maxTokens: 32768,
    supportsStreaming: true,
    supportsFiles: true,
    supportsThinking: true,
  }
];

// Convert file data URL to base64
function dataURLToBase64(dataURL: string): string {
  return dataURL.split(',')[1];
}

// Get media type from data URL
function getMediaTypeFromDataURL(dataURL: string): string {
  const match = dataURL.match(/^data:([^;]+);base64,/);
  return match ? match[1] : 'application/octet-stream';
}

// Convert Gervais Messages to Google format
function convertToGoogleMessages(messages: Message[]): GoogleMessage[] {
  // Filter for only valid messages with content
  return messages
    .map(message => {
      const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [];
      
      // Add text content if any
      if (message.content.trim()) {
        parts.push({ text: message.content });
      }
      
      // Add media as inline data
      if (message.media && message.media.length > 0) {
        message.media.forEach(media => {
          if (media.type === 'image' && media.preview) {
            parts.push({
              inlineData: {
                mimeType: getMediaTypeFromDataURL(media.preview),
                data: dataURLToBase64(media.preview)
              }
            });
          }
        });
      }
      
      // Only return messages that have non-empty parts
      if (parts.length > 0) {
        return {
          role: message.role === 'assistant' ? 'model' : 'user',
          parts
        };
      }
      
      // Return null for messages with empty parts, will be filtered out below
      return null;
    })
    .filter((message): message is GoogleMessage => message !== null);
}

// Validate API key
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey);
    return response.ok;
  } catch (error) {
    console.error('Error validating Google API key:', error);
    return false;
  }
}

// Get API key from settings
function getApiKey(): string {
  const settings = get(settingsStore);
  const apiKey = settings.apiKeys.google;
  
  if (!apiKey) {
    throw new Error('Google API key not found. Please add your API key in Settings.');
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
    const googleMessages = convertToGoogleMessages(messages);
    
    console.log('Sending request to Google Gemini API with model:', modelId);
    console.log('Messages after conversion:', JSON.stringify(googleMessages, null, 2));
    
    // Create the request body
    const requestBody = {
      contents: googleMessages,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    };
    
    // Use the streamGenerateContent endpoint which specifically handles streaming
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
      throw new Error(`Google API error: ${errorMessage}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Failed to get response reader');
    
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let responseText = '';
    
    console.log('Starting to read the stream...');
    
    // Process the stream data
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('Stream reading complete');
        break;
      }
      
      // Decode the chunk and add to buffer
      const chunk = decoder.decode(value, { stream: true });
      console.log('Received chunk length:', chunk.length);
      buffer += chunk;
      
      // The Gemini API returns an array of JSON objects
      // We need to accumulate enough data to parse the entire response
      let validJson = false;
      let jsonData = null;
      
      // Try to parse the buffer as complete JSON
      try {
        jsonData = JSON.parse(buffer);
        validJson = true;
        console.log('Successfully parsed complete JSON');
        
        // Clear buffer as we've successfully parsed it
        buffer = '';
      } catch (e) {
        // If we can't parse the entire buffer, try to find complete JSON objects
        console.log('Failed to parse complete buffer, looking for array content');
        
        // Try to identify if we're looking at an array of objects
        if (buffer.trim().startsWith('[')) {
          // Process array-structured data
          console.log('Buffer starts with array indicator [');
          
          try {
            // Look for the closing bracket of the array
            const lastBracketIndex = buffer.lastIndexOf(']');
            
            if (lastBracketIndex > 0) {
              // We might have a complete array
              const possibleArray = buffer.substring(0, lastBracketIndex + 1);
              try {
                jsonData = JSON.parse(possibleArray);
                validJson = true;
                console.log('Successfully parsed array portion');
                
                // Keep only the part after the parsed JSON
                buffer = buffer.substring(lastBracketIndex + 1);
              } catch (arrayError) {
                console.log('Failed to parse array portion');
              }
            }
          } catch (arrayErr) {
            console.log('Error handling array:', arrayErr);
          }
        }
      }
      
      // Process any valid JSON we found
      if (validJson && jsonData) {
        console.log('Processing valid JSON data');
        
        if (Array.isArray(jsonData)) {
          // Process each item in the array
          for (const item of jsonData) {
            if (item.error) {
              const errorMsg = `Google API error: ${item.error.message || 'Unknown error'}`;
              console.error(errorMsg);
              onError(new Error(errorMsg));
              return '';
            }
            
            if (item.candidates?.[0]?.content?.parts?.[0]?.text) {
              const text = item.candidates[0].content.parts[0].text;
              console.log('Extracted text from array item:', text);
              responseText += text;
              onChunk(responseText);
            }
            
            if (item.candidates?.[0]?.finishReason === 'STOP') {
              console.log('Received completion signal (STOP) in array');
              onComplete();
              return responseText;
            }
          }
        } else {
          // Process single JSON object
          if (jsonData.error) {
            const errorMsg = `Google API error: ${jsonData.error.message || 'Unknown error'}`;
            console.error(errorMsg);
            onError(new Error(errorMsg));
            return '';
          }
          
          if (jsonData.candidates?.[0]?.content?.parts?.[0]?.text) {
            const text = jsonData.candidates[0].content.parts[0].text;
            console.log('Extracted text from single object:', text);
            responseText += text;
            onChunk(responseText);
          }
          
          if (jsonData.candidates?.[0]?.finishReason === 'STOP') {
            console.log('Received completion signal (STOP) in single object');
            onComplete();
            return responseText;
          }
        }
      }
    }
    
    // If we get here, the stream has ended
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
    const apiKey = getApiKey();
    const googleMessages = convertToGoogleMessages(messages);
    
    console.log('Sending non-streaming request to Google Gemini API with model:', modelId);
    console.log('Messages after conversion:', JSON.stringify(googleMessages, null, 2));
    
    // Create the request body
    const requestBody = {
      contents: googleMessages,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    };
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google API error: ${error.error?.message || response.statusText}`);
    }
    
    const data: GoogleCompletionResponse = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || '';
  } catch (error) {
    console.error('Google completion error:', error);
    throw error;
  }
}

// Google service implementation
export class GoogleService implements LLMService {
  private apiKey: string | null = null;
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta';
  
  constructor() {
    // Get API key from settings store
    const settings = get(settingsStore);
    this.apiKey = settings.apiKeys.google || null;
    
    // Subscribe to settings store to get updated API key
    settingsStore.subscribe(settings => {
      this.apiKey = settings.apiKeys.google || null;
    });
  }
  
  async sendMessage(
    messages: Message[],
    model: LLMModel,
    options: {
      tools?: ApiTool[];
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<ReadableStream<Uint8Array> | string> {
    if (!this.apiKey) {
      throw new Error('Google API key is required');
    }
    
    const googleMessages = convertToGoogleMessages(messages);
    
    const request: GoogleCompletionRequest = {
      contents: googleMessages,
      generationConfig: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxTokens || 2048,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ],
    };
    
    const response = await fetch(`${this.baseUrl}/models/${model.id}:${options.stream ? 'streamGenerateContent' : 'generateContent'}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google API error: ${error.error?.message || response.statusText}`);
    }
    
    if (options.stream) {
      return response.body as ReadableStream<Uint8Array>;
    } else {
      const data: GoogleCompletionResponse = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || '';
    }
  }
  
  formatMessages(messages: Message[]): ApiMessage[] {
    // Convert messages to OpenAI format for compatibility
    return messages.map(message => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
      name: undefined,
      function_call: undefined,
    }));
  }
  
  async processMedia(media: MediaItem[]): Promise<ApiMessageContent[]> {
    // Process media items to format for Google API
    const contentItems: ApiMessageContent[] = [];
    
    for (const item of media) {
      if (item.type === 'image' && item.preview) {
        contentItems.push({
          type: 'image_url',
          image_url: {
            url: item.preview,
          },
        });
      }
      // Add more media type processing as needed
    }
    
    return contentItems;
  }
} 