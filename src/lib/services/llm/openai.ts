import { settingsStore } from '$lib/stores/settingsStore';
import { get } from 'svelte/store';
import type { Message, MediaItem } from '$lib/types';

// Define OpenAI API types
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | OpenAIContent[];
}

interface OpenAIContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

interface OpenAICompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  stream: boolean;
  temperature?: number;
  max_tokens?: number;
}

interface OpenAICompletionResponse {
  id: string;
  choices: {
    message: OpenAIMessage;
    finish_reason: string;
  }[];
}

interface OpenAIStreamChunk {
  choices: {
    delta: Partial<OpenAIMessage>;
    finish_reason: string | null;
  }[];
}

// OpenAI models
export const openaiModels = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai' as const,
    description: 'Most capable model for a wide range of tasks',
    isLocal: false,
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFiles: true,
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai' as const,
    description: 'Improved version of GPT-4',
    isLocal: false,
    maxTokens: 4096,
    supportsStreaming: true,
    supportsFiles: true,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai' as const,
    description: 'Fast and efficient for most tasks',
    isLocal: false,
    maxTokens: 4096,
    supportsStreaming: true,
    supportsFiles: true,
  }
];

// Convert Gervais Message format to OpenAI format
function convertToOpenAIMessages(messages: Message[]): OpenAIMessage[] {
  return messages.map(message => {
    // For messages without media, return simple format
    if (!message.media || message.media.length === 0) {
      return {
        role: message.role,
        content: message.content
      };
    }
    
    // For messages with media, create content array
    const contentArray: OpenAIContent[] = [];
    
    // Add text content if any
    if (message.content.trim()) {
      contentArray.push({
        type: 'text',
        text: message.content
      });
    }
    
    // Add media as image_url or file content
    message.media.forEach(media => {
      console.log(`Processing media item for OpenAI: ${media.type} ${media.name}`);
      
      if (media.type === 'image' && media.preview) {
        // For images, use standard image handling
        contentArray.push({
          type: 'image_url',
          image_url: {
            url: media.preview,
            detail: 'auto'
          }
        });
        console.log(`Added image to OpenAI message: ${media.name}`);
      }
      else if (media.type === 'document') {
        // Handle documents with file upload ID
        if (media.fileId) {
          // If we have a fileId, reference it directly
          contentArray.push({
            type: 'text',
            text: `I've analyzed the document: ${media.name}. The file has been processed.`
          });
          console.log(`Referenced uploaded document in message: ${media.name} (file ID: ${media.fileId})`);
        } 
        else if (media.preview) {
          try {
            // Get the document MIME type from the data URL
            const mimeMatch = media.preview.match(/^data:([^;]+);base64,/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
            
            console.log(`Processing document: ${media.name}, MIME type: ${mimeType}`);
            
            // Check if it's an actual image type mistakenly classified as document
            if (mimeType.startsWith('image/')) {
              contentArray.push({
                type: 'image_url',
                image_url: {
                  url: media.preview,
                  detail: 'high'
                }
              });
              console.log(`Added document with image MIME type to OpenAI message: ${media.name}`);
            } else {
              // For documents, add a warning text instead of trying to send the document
              console.warn(`Document type ${mimeType} not supported via chat API: ${media.name}`);
              contentArray.push({
                type: 'text',
                text: `[Note: I attempted to analyze your document "${media.name}" but couldn't process it directly in the chat. For better document support, please try uploading it again.]`
              });
            }
          } catch (error) {
            console.error(`Error processing document ${media.name}:`, error);
            contentArray.push({
              type: 'text',
              text: `[Error: Could not process document "${media.name}" due to technical error]`
            });
          }
        }
        else {
          console.log(`Document ${media.name} has no preview or fileId, cannot send to OpenAI`);
        }
      }
      else {
        console.log(`Unsupported media type: ${media.type} for ${media.name}`);
      }
    });
    
    if (contentArray.length === 0) {
      // If we couldn't process any media, return just the text content
      return {
        role: message.role,
        content: message.content || "I've attached some files, but they couldn't be processed."
      };
    }
    
    return {
      role: message.role,
      content: contentArray
    };
  });
}

// Get API key from settings
function getApiKey(): string {
  try {
    const settings = get(settingsStore);
    console.log('Retrieving OpenAI API key from settings store');
    
    if (!settings || !settings.apiKeys) {
      console.error('Settings or apiKeys object is undefined:', settings);
      throw new Error('OpenAI API key not found. Settings store may not be initialized properly.');
    }
    
    const apiKey = settings.apiKeys.openai;
    
    // Log key details for debugging (safely)
    if (!apiKey) {
      console.error('OpenAI API key is empty or undefined');
      throw new Error('OpenAI API key not found. Please add your API key in Settings.');
    }
    
    // Print the full API key for debugging
    console.log('FULL API KEY FROM SETTINGS: ', apiKey);
    
    // Validate OpenAI API key format
    if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
      console.error('Invalid OpenAI API key format');
      throw new Error('Invalid OpenAI API key format. Keys should start with "sk-" and be at least 20 characters long.');
    }
    
    // Log key length and first few characters to help debug obfuscation issues
    console.log(`Retrieved OpenAI API key (length: ${apiKey.length}, starts with: ${apiKey.substring(0, 4)}...)`);
    
    return apiKey;
  } catch (error) {
    console.error('Error retrieving OpenAI API key:', error);
    throw error;
  }
}

// Add a function to get API key with retry mechanism
async function getApiKeyWithRetry(maxRetries = 3, delayMs = 500): Promise<string> {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return getApiKey();
    } catch (error) {
      console.warn(`Failed to get API key (attempt ${retries + 1}/${maxRetries}):`, error);
      
      if (retries === maxRetries - 1) {
        throw error; // Last retry failed, propagate the error
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs));
      retries++;
    }
  }
  
  throw new Error('Failed to retrieve API key after multiple attempts');
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
    // Get API key with retry mechanism
    const apiKey = await getApiKeyWithRetry();
    
    // WARNING: For debugging only - printing full API key
    console.log('SECURITY WARNING: Printing full API key for debugging: ', apiKey);
    console.log('EXACT KEY SENT TO OPENAI: ', apiKey);
    
    // Add enhanced key inspection for debugging
    console.log(`Key format check: length=${apiKey.length}, starts with=${apiKey.substring(0, 4)}, contains "sk-"=${apiKey.includes('sk-')}`);
    
    // For better debugging, check the character codes in the first few characters
    const charCodes = [...apiKey.substring(0, 10)].map(c => c.charCodeAt(0));
    console.log(`First 10 character codes: ${charCodes.join(', ')}`);
    
    // Ensure the key is properly formatted for the Authorization header
    // OpenAI expects the raw key without any encoding/transformation
    const authHeader = `Bearer ${apiKey.trim()}`;
    console.log(`Authorization header format: Bearer ${apiKey.trim()}`);
    
    const openaiMessages = convertToOpenAIMessages(messages);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        model: modelId,
        messages: openaiMessages,
        stream: true,
        temperature: 0.7,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenAI API error (${response.status}): ${response.statusText}`;
      
      try {
        // Try to parse error as JSON
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          if (response.status === 401) {
            errorMessage = 'Authentication error with OpenAI. Please check your API key in Settings.';
          } else if (errorJson.error.message) {
            errorMessage = `OpenAI API error: ${errorJson.error.message}`;
          }
        }
      } catch (e) {
        // If error isn't valid JSON, use the text
        if (response.status === 401) {
          errorMessage = 'Authentication error with OpenAI. Please check your API key in Settings.';
        } else if (errorText) {
          errorMessage = `OpenAI API error: ${errorText}`;
        }
      }
      
      throw new Error(errorMessage);
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
          const chunk: OpenAIStreamChunk = JSON.parse(jsonStr);
          
          // Get content delta if available
          const contentDelta = chunk.choices[0]?.delta?.content;
          if (contentDelta) {
            responseText += contentDelta;
            onChunk(responseText);
          }
          
          // Check if generation is complete
          if (chunk.choices[0]?.finish_reason) {
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
    console.error('OpenAI stream completion error:', error);
    onError(error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

// Regular completion API
export async function completion(modelId: string, messages: Message[]): Promise<string> {
  try {
    // Get API key with retry mechanism
    const apiKey = await getApiKeyWithRetry();
    
    // Log that we're processing messages for non-streaming completion
    console.log(`Processing ${messages.length} messages for OpenAI non-streaming completion`);
    
    // Check if any messages have media
    const hasMedia = messages.some(msg => msg.media && msg.media.length > 0);
    if (hasMedia) {
      console.log("Messages contain media - ensuring proper conversion");
    }
    
    // Ensure the key is properly formatted for the Authorization header
    const authHeader = `Bearer ${apiKey.trim()}`;
    
    const openaiMessages = convertToOpenAIMessages(messages);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        model: modelId,
        messages: openaiMessages,
        stream: false,
        temperature: 0.7,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenAI API error (${response.status}): ${response.statusText}`;
      
      try {
        // Try to parse error as JSON
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          if (response.status === 401) {
            errorMessage = 'Authentication error with OpenAI. Please check your API key in Settings.';
          } else if (errorJson.error.message) {
            errorMessage = `OpenAI API error: ${errorJson.error.message}`;
          }
        }
      } catch (e) {
        // If error isn't valid JSON, use the text
        if (response.status === 401) {
          errorMessage = 'Authentication error with OpenAI. Please check your API key in Settings.';
        } else if (errorText) {
          errorMessage = `OpenAI API error: ${errorText}`;
        }
      }
      
      throw new Error(errorMessage);
    }
    
    const data: OpenAICompletionResponse = await response.json();
    
    // Handle different response formats
    const content = data.choices[0]?.message?.content;
    if (typeof content === 'string') {
      return content;
    } else if (Array.isArray(content)) {
      // Extract text parts from content array
      return content
        .filter(item => item.type === 'text' && item.text)
        .map(item => item.text)
        .join('\n\n');
    }
    
    return '';
  } catch (error) {
    console.error('OpenAI completion error:', error);
    throw error;
  }
}

// Upload a file to OpenAI
export async function uploadFile(file: File): Promise<string> {
  try {
    // Get API key with retry mechanism
    const apiKey = await getApiKeyWithRetry();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', 'assistants');
    
    console.log(`Uploading file to OpenAI: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
    
    const response = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenAI API error (${response.status}): ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error && errorJson.error.message) {
          errorMessage = `OpenAI API error: ${errorJson.error.message}`;
        }
      } catch (e) {
        if (errorText) {
          errorMessage = `OpenAI API error: ${errorText}`;
        }
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log(`File uploaded successfully to OpenAI: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error('Error uploading file to OpenAI:', error);
    throw error;
  }
}

// List files uploaded to OpenAI
export async function listFiles(): Promise<any[]> {
  try {
    // Get API key with retry mechanism
    const apiKey = await getApiKeyWithRetry();
    
    const response = await fetch('https://api.openai.com/v1/files', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenAI API error (${response.status}): ${response.statusText}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error && errorJson.error.message) {
          errorMessage = `OpenAI API error: ${errorJson.error.message}`;
        }
      } catch (e) {
        if (errorText) {
          errorMessage = `OpenAI API error: ${errorText}`;
        }
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log(`Retrieved ${data.data.length} files from OpenAI`);
    return data.data;
  } catch (error) {
    console.error('Error retrieving files from OpenAI:', error);
    throw error;
  }
} 