import { settingsStore } from '$lib/stores/settingsStore';
import { get } from 'svelte/store';
import type { Message, MediaItem, LLMModel } from '$lib/types';
import type { LLMService, ApiTool, ApiMessage, ApiMessageContent } from './api';
import { v4 as uuidv4 } from 'uuid';

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
    // Add response modalities for image generation
    responseModalities?: string[];
  };
  safetySettings?: {
    category: string;
    threshold: string;
  }[];
  tools?: any[];
  stream?: boolean;
}

interface GoogleCompletionResponse {
  candidates: {
    content: {
      parts: {
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }[];
    };
    finishReason: string;
  }[];
}

interface GoogleStreamChunk {
  candidates: {
    content: {
      parts: {
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
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
    supportsMultimodal: true, // For accepting images as input
    supportsImageGeneration: true, // Also supports generating images
  }
];

// Convert file data URL to base64
function dataURLToBase64(dataURL: string): string {
  return dataURL.split(',')[1];
}

// Convert base64 to data URL
function base64ToDataURL(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`;
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

// Create a MediaItem from Google's inlineData response
function createMediaItemFromInlineData(inlineData: { mimeType: string; data: string }): MediaItem | null {
  // Check if the data is empty or invalid
  if (!inlineData.data || inlineData.data.trim() === '') {
    console.warn('Empty or invalid base64 data received from Google Gemini API');
    return null;
  }
  
  const mediaType = inlineData.mimeType.startsWith('image/') ? 'image' : 'document';
  const preview = base64ToDataURL(inlineData.data, inlineData.mimeType);
  
  return {
    id: uuidv4(),
    type: mediaType,
    name: `${mediaType}_${new Date().getTime()}`,
    preview,
    timestamp: Date.now(),
    size: inlineData.data.length * 0.75, // Approximate size in bytes from base64
  };
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

// Helper function to extract detailed error message from API response
function extractErrorDetails(error: any): string {
  // Check if it's a structured error response from Google API
  if (error?.error) {
    const googleError = error.error;
    let detailedMessage = googleError.message || 'Unknown Google API error';
    
    // Add error code if available
    if (googleError.code) {
      detailedMessage = `[${googleError.code}] ${detailedMessage}`;
    }
    
    // Add field violations if available
    if (googleError.details && googleError.details.length > 0) {
      const violations = googleError.details
        .filter(detail => detail['@type'] && detail['@type'].includes('BadRequest'))
        .flatMap(detail => detail.fieldViolations || [])
        .map(violation => `- ${violation.field}: ${violation.description}`)
        .join('\n');
      
      if (violations) {
        detailedMessage += '\n\nDetails:\n' + violations;
      }
    }
    
    return detailedMessage;
  }
  
  // If it's a standard error object
  if (error instanceof Error) {
    return error.message;
  }
  
  // Fallback
  return String(error);
}

// Streaming completion API with multimodal support
export async function streamCompletion(
  modelId: string,
  messages: Message[],
  onChunk: (text: string, media?: MediaItem[]) => void,
  onComplete: () => void,
  onError: (error: Error) => void,
  onThinking?: (thinking: string) => void
) {
  try {
    const apiKey = getApiKey();
    const googleMessages = convertToGoogleMessages(messages);
    
    // Ensure we're using the correct model ID
    console.log('Using model:', modelId);
    if (modelId !== 'gemini-2.0-flash-exp') {
      console.warn('Warning: Expected to use gemini-2.0-flash-exp but got:', modelId);
    }
    
    console.log('Sending request to Google Gemini API with model:', modelId);
    console.log('Messages after conversion:', JSON.stringify(googleMessages, null, 2));
    
    // Check if we should request image generation based on the prompt
    const shouldRequestImageGeneration = messages.some(msg => {
      const content = msg.content.toLowerCase();
      return (
        msg.role === 'user' && (
          content.includes('generate an image') ||
          content.includes('create an image') ||
          content.includes('draw') ||
          content.includes('picture of') ||
          content.includes('image of')
        )
      );
    });
    
    // Create the request body
    const requestBody = {
      contents: googleMessages,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseModalities: shouldRequestImageGeneration ? ['TEXT', 'IMAGE'] : ['TEXT'],
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
    
    // Log the complete URL for debugging
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey}`;
    console.log('API URL (without key):', apiUrl.replace(apiKey, 'API_KEY_HIDDEN'));
    
    // Use the streamGenerateContent endpoint which specifically handles streaming
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // If JSON parsing fails, use status text
        throw new Error(`Google API error: ${response.statusText || response.status}`);
      }
      
      const detailedError = extractErrorDetails(errorData);
      
      // Provide helpful message for specific error cases
      if (shouldRequestImageGeneration && detailedError.includes('responseModalities')) {
        throw new Error(`Failed to generate image: The model doesn't support the requested image generation features.\n\nAPI Error: ${detailedError}`);
      } else if (detailedError.includes('rate limit')) {
        throw new Error(`Rate limit exceeded: Please try again later or reduce the frequency of requests.\n\nAPI Error: ${detailedError}`);
      } else {
        throw new Error(`Google API error: ${detailedError}`);
      }
    }
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Failed to get response reader');
    
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let responseText = '';
    let mediaItems: MediaItem[] = [];
    
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
            
            if (item.candidates?.[0]?.content?.parts) {
              const parts = item.candidates[0].content.parts;
              let newText = '';
              const newMediaItems: MediaItem[] = [];
              
              // Process each part, which could be text or image
              for (const part of parts) {
                if (part.text) {
                  newText += part.text;
                } else if (part.inlineData) {
                  // Log to help debug image generation issues
                  console.log(`Received inlineData with mimeType: ${part.inlineData.mimeType}, data length: ${part.inlineData.data?.length || 0}`);
                  
                  // Handle image data
                  const mediaItem = createMediaItemFromInlineData(part.inlineData);
                  if (mediaItem) {
                    newMediaItems.push(mediaItem);
                    mediaItems.push(mediaItem);
                  } else {
                    console.warn('Failed to create media item from inlineData');
                    // Add a debug message to the text response
                    newText += `\n\n**Note**: Attempted to generate an image, but received invalid data. This might be due to content restrictions or a technical issue.`;
                  }
                }
              }
              
              if (newText) {
                responseText += newText;
              }
              
              // Notify the caller with both text and any media items
              onChunk(responseText, mediaItems);
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
          
          if (jsonData.candidates?.[0]?.content?.parts) {
            const parts = jsonData.candidates[0].content.parts;
            let newText = '';
            const newMediaItems: MediaItem[] = [];
            
            // Process each part, which could be text or image
            for (const part of parts) {
              if (part.text) {
                newText += part.text;
              } else if (part.inlineData) {
                // Log to help debug image generation issues
                console.log(`Received inlineData with mimeType: ${part.inlineData.mimeType}, data length: ${part.inlineData.data?.length || 0}`);
                
                // Handle image data
                const mediaItem = createMediaItemFromInlineData(part.inlineData);
                if (mediaItem) {
                  newMediaItems.push(mediaItem);
                  mediaItems.push(mediaItem);
                } else {
                  console.warn('Failed to create media item from inlineData');
                  // Add a debug message to the text response
                  newText += `\n\n**Note**: Attempted to generate an image, but received invalid data. This might be due to content restrictions or a technical issue.`;
                }
              }
            }
            
            if (newText) {
              responseText += newText;
            }
            
            // Notify the caller with both text and any media items
            onChunk(responseText, mediaItems);
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

// Non-streaming completion API with multimodal support
export async function completion(modelId: string, messages: Message[]): Promise<{ text: string, media: MediaItem[] }> {
  try {
    const apiKey = getApiKey();
    const googleMessages = convertToGoogleMessages(messages);
    
    // Ensure we're using the correct model ID
    console.log('Using model (non-streaming):', modelId);
    if (modelId !== 'gemini-2.0-flash-exp') {
      console.warn('Warning: Expected to use gemini-2.0-flash-exp but got:', modelId);
    }
    
    console.log('Sending non-streaming request to Google Gemini API with model:', modelId);
    console.log('Messages after conversion:', JSON.stringify(googleMessages, null, 2));
    
    // Check if we should request image generation based on the prompt
    const shouldRequestImageGeneration = messages.some(msg => {
      const content = msg.content.toLowerCase();
      return (
        msg.role === 'user' && (
          content.includes('generate an image') ||
          content.includes('create an image') ||
          content.includes('draw') ||
          content.includes('picture of') ||
          content.includes('image of')
        )
      );
    });
    
    // Create the request body
    const requestBody = {
      contents: googleMessages,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseModalities: shouldRequestImageGeneration ? ['TEXT', 'IMAGE'] : ['TEXT'],
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
    
    // Log the complete URL for debugging
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
    console.log('API URL (without key):', apiUrl.replace(apiKey, 'API_KEY_HIDDEN'));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // If JSON parsing fails, use status text
        throw new Error(`Google API error: ${response.statusText || response.status}`);
      }
      
      const detailedError = extractErrorDetails(errorData);
      
      // Provide helpful message for specific error cases
      if (shouldRequestImageGeneration && detailedError.includes('responseModalities')) {
        throw new Error(`Failed to generate image: The model doesn't support the requested image generation features.\n\nAPI Error: ${detailedError}`);
      } else if (detailedError.includes('rate limit')) {
        throw new Error(`Rate limit exceeded: Please try again later or reduce the frequency of requests.\n\nAPI Error: ${detailedError}`);
      } else {
        throw new Error(`Google API error: ${detailedError}`);
      }
    }
    
    const data: GoogleCompletionResponse = await response.json();
    let responseText = '';
    const mediaItems: MediaItem[] = [];
    
    // Process parts which could be text or images
    const parts = data.candidates[0]?.content?.parts || [];
    let hasImageRequest = shouldRequestImageGeneration;
    let hasImageResponse = false;
    
    for (const part of parts) {
      if (part.text) {
        responseText += part.text;
      } else if (part.inlineData) {
        // Handle image data
        const mediaItem = createMediaItemFromInlineData(part.inlineData);
        if (mediaItem) {
          mediaItems.push(mediaItem);
          hasImageResponse = true;
        }
      }
    }
    
    // If user requested an image but no valid image was returned, add an error message
    if (hasImageRequest && !hasImageResponse) {
      const errorMsg = "Google's API did not return a valid image. This could be due to content policy restrictions, rate limiting, or an error in the image generation process.";
      responseText += `\n\n**Error generating image**: ${errorMsg}\n\nFull API response: ${JSON.stringify(data, null, 2)}`;
    }
    
    return { text: responseText, media: mediaItems };
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
  ): Promise<ReadableStream<Uint8Array> | { text: string, media: MediaItem[] }> {
    if (!this.apiKey) {
      throw new Error('Google API key is required');
    }
    
    // Ensure we're using the correct model ID
    console.log('GoogleService.sendMessage using model:', model.id);
    if (model.id !== 'gemini-2.0-flash-exp') {
      console.warn('Warning: Expected to use gemini-2.0-flash-exp but got:', model.id);
    }
    
    const googleMessages = convertToGoogleMessages(messages);
    
    // Check if we should request image generation based on the prompt
    const shouldRequestImageGeneration = messages.some(msg => {
      const content = msg.content.toLowerCase();
      return (
        msg.role === 'user' && (
          content.includes('generate an image') ||
          content.includes('create an image') ||
          content.includes('draw') ||
          content.includes('picture of') ||
          content.includes('image of')
        )
      );
    });
    
    const request: GoogleCompletionRequest = {
      contents: googleMessages,
      generationConfig: {
        temperature: options.temperature || 0.7,
        maxOutputTokens: options.maxTokens || 2048,
        responseModalities: shouldRequestImageGeneration ? ['TEXT', 'IMAGE'] : ['TEXT'],
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
    
    // Log the complete URL for debugging
    const apiUrl = `${this.baseUrl}/models/${model.id}:${options.stream ? 'streamGenerateContent' : 'generateContent'}?key=${this.apiKey}`;
    console.log('API URL (without key):', apiUrl.replace(this.apiKey, 'API_KEY_HIDDEN'));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // If JSON parsing fails, use status text
        throw new Error(`Google API error: ${response.statusText || response.status}`);
      }
      
      const detailedError = extractErrorDetails(errorData);
      
      // Provide helpful message for specific error cases
      if (shouldRequestImageGeneration && detailedError.includes('responseModalities')) {
        throw new Error(`Failed to generate image: The model doesn't support the requested image generation features.\n\nAPI Error: ${detailedError}`);
      } else if (detailedError.includes('rate limit')) {
        throw new Error(`Rate limit exceeded: Please try again later or reduce the frequency of requests.\n\nAPI Error: ${detailedError}`);
      } else {
        throw new Error(`Google API error: ${detailedError}`);
      }
    }
    
    if (options.stream) {
      return response.body as ReadableStream<Uint8Array>;
    } else {
      const data: GoogleCompletionResponse = await response.json();
      let responseText = '';
      const mediaItems: MediaItem[] = [];
      
      // Process parts which could be text or images
      const parts = data.candidates[0]?.content?.parts || [];
      let hasImageRequest = shouldRequestImageGeneration;
      let hasImageResponse = false;
      
      for (const part of parts) {
        if (part.text) {
          responseText += part.text;
        } else if (part.inlineData) {
          // Handle image data
          const mediaItem = createMediaItemFromInlineData(part.inlineData);
          if (mediaItem) {
            mediaItems.push(mediaItem);
            hasImageResponse = true;
          }
        }
      }
      
      // If user requested an image but no valid image was returned, add an error message
      if (hasImageRequest && !hasImageResponse) {
        const errorMsg = "Google's API did not return a valid image. This could be due to content policy restrictions, rate limiting, or an error in the image generation process.";
        responseText += `\n\n**Error generating image**: ${errorMsg}\n\nFull API response: ${JSON.stringify(data, null, 2)}`;
      }
      
      return { text: responseText, media: mediaItems };
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