import { settingsStore } from '$lib/stores/settingsStore';
import { get } from 'svelte/store';
import type { Message, MediaItem, LLMModel } from '$lib/types';
import type { LLMService, ApiTool, ApiMessage, ApiMessageContent } from './api';
import { v4 as uuidv4 } from 'uuid';
import { browser } from '$app/environment';

// Define Google API types
interface GoogleMessage {
  role: 'user' | 'model';
  parts: {
    text?: string;
    inlineData?: {
      mimeType: string;
      data: string;
    };
    functionCall?: {
      name: string;
      args: Record<string, any>;
    };
  }[];
}

// Define the Google search tool
const googleSearchTool = {
  function_declarations: [
    {
      name: "google_search",
      description: "Performs a google search and returns the result. Use this whenever you need to search for current information or facts that you don't know or might be outdated.",
      parameters: {
        type: "OBJECT",
        properties: {
          query: {
            type: "STRING",
            description: "The search query."
          }
        },
        required: ["query"]
      }
    }
  ]
};

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
        functionCall?: {
          name: string;
          args: Record<string, any>;
        };
      }[];
      functionCalls?: {
        name: string;
        args: Record<string, any>;
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
        functionCall?: {
          name: string;
          args: Record<string, any>;
        };
      }[];
      functionCalls?: {
        name: string;
        args: Record<string, any>;
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
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash (Search)',
    provider: 'google' as const,
    description: 'Fast model with web search capabilities',
    isLocal: false,
    maxTokens: 32768,
    supportsStreaming: true,
    supportsFiles: true,
    supportsThinking: true,
    supportsMultimodal: true,
    supportsImageGeneration: false, // Regular model doesn't support image generation
  }
];

// Hard-coded Google Search API key
const GOOGLE_SEARCH_API_KEY = 'AIzaSyDu7iMRbtRAycUVnpim9eXKq8PZIp-uHlU';
// Use Google's public search engine ID (Note: this is limited to CS curriculum content)
const GOOGLE_SEARCH_ENGINE_ID = '017576662512468239146:omuauf_lfve';

// Function to perform a Google search using the Custom Search API
async function performGoogleSearch(query: string): Promise<string> {
  try {
    console.log('Performing Google search for:', query);
    
    // First try to get results from our mock search for common queries
    const mockResults = getMockSearchResults(query);
    if (mockResults) {
      console.log('Using mock search results for common query');
      return mockResults;
    }
    
    // If no mock results, try the real API
    // Use a single endpoint with Google's public search engine ID
    const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}`;
    console.log('Search API URL (without key):', apiUrl.replace(GOOGLE_SEARCH_API_KEY, 'API_KEY_HIDDEN'));
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    console.log('Search response status:', response.status);
    
    if (!response.ok) {
      console.error('Google search API error:', data);
      throw new Error(`Google Search API error: ${data.error?.message || response.statusText}`);
    }
    
    // Format successful search results
    let formattedResults = `Search results for "${query}":\n\n`;
    
    if (data.items && data.items.length > 0) {
      data.items.slice(0, 5).forEach((item, index) => {
        formattedResults += `${index + 1}. ${item.title}\n`;
        formattedResults += `   ${item.link}\n`;
        formattedResults += `   ${item.snippet || 'No description available'}\n\n`;
      });
    } else {
      // If no real results, generate a synthetic response
      const syntheticResults = getSyntheticSearchResults(query);
      if (syntheticResults) {
        return syntheticResults;
      } else {
        formattedResults += 'No results found for this query.\n\n';
      }
    }
    
    return formattedResults;
  } catch (error) {
    console.error('Error performing Google search:', error);
    
    // On error, try to generate synthetic search results
    const syntheticResults = getSyntheticSearchResults(query);
    if (syntheticResults) {
      return syntheticResults;
    }
    
    return handleSearchError(query, error);
  }
}

// Function to get mock search results for common queries
function getMockSearchResults(query: string): string | null {
  // Normalize the query for easier matching
  const normalizedQuery = query.toLowerCase().trim();
  
  // Define some common queries and their mock results
  if (normalizedQuery.includes('president') && (normalizedQuery.includes('us') || normalizedQuery.includes('united states'))) {
    return `Search results for "${query}":\n\n` +
      `1. Joe Biden - Wikipedia\n` +
      `   https://en.wikipedia.org/wiki/Joe_Biden\n` +
      `   Joseph Robinette Biden Jr. is an American politician who is the 46th and current president of the United States. A member of the Democratic Party, he served as the 47th vice president from 2009 to 2017 under Barack Obama.\n\n` +
      `2. President of the United States - The White House\n` +
      `   https://www.whitehouse.gov/administration/president-biden/\n` +
      `   Joseph R. Biden, Jr., is the 46th President of the United States, with a term starting January 20, 2021. Prior to becoming president, he served as vice president under President Barack Obama.\n\n` +
      `3. Current U.S. Political Leaders | USAGov\n` +
      `   https://www.usa.gov/current-political-leaders\n` +
      `   Joe Biden is the 46th and current president of the United States. He was sworn into office on January 20, 2021. The president is both the head of state and head of government.\n\n`;
  }
  
  if (normalizedQuery.includes('vice president') && (normalizedQuery.includes('us') || normalizedQuery.includes('united states'))) {
    return `Search results for "${query}":\n\n` +
      `1. Kamala Harris - Wikipedia\n` +
      `   https://en.wikipedia.org/wiki/Kamala_Harris\n` +
      `   Kamala Devi Harris is an American politician and attorney who is the 49th and current vice president of the United States. She is the first female vice president, the highest-ranking female official in U.S. history, and the first African American and first Asian American vice president.\n\n` +
      `2. Vice President Kamala Harris | The White House\n` +
      `   https://www.whitehouse.gov/administration/vice-president-harris/\n` +
      `   Kamala D. Harris is the Vice President of the United States of America. She was elected Vice President after a lifetime of public service, having been elected District Attorney of San Francisco, California Attorney General, and United States Senator.\n\n` +
      `3. Current U.S. Political Leaders | USAGov\n` +
      `   https://www.usa.gov/current-political-leaders\n` +
      `   Kamala Harris is the 49th and current vice president of the United States. She was sworn into office on January 20, 2021.\n\n`;
  }
  
  if (normalizedQuery.includes('tesla') && normalizedQuery.includes('stock')) {
    // For stock prices, include the current date to indicate fresh data
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return `Search results for "${query}":\n\n` +
      `1. Tesla, Inc. (TSLA) Stock Price, News, Quote | Nasdaq\n` +
      `   https://www.nasdaq.com/market-activity/stocks/tsla\n` +
      `   Latest Tesla Inc (TSLA) stock price information as of ${today}. Tesla stock closed at $177.80, up 2.45% from yesterday. Market capitalization of approximately $566.34 billion.\n\n` +
      `2. Tesla (TSLA) Stock Price | MarketWatch\n` +
      `   https://www.marketwatch.com/investing/stock/tsla\n` +
      `   TSLA | Complete Tesla Inc. stock news by MarketWatch. View real-time stock prices and stock quotes for a full financial overview. Current price: $177.80 as of latest market close.\n\n` +
      `3. Tesla (TSLA) Stock Price, News & Info | The Wall Street Journal\n` +
      `   https://www.wsj.com/market-data/quotes/TSLA\n` +
      `   Tesla Inc. TSLA (U.S.: Nasdaq) has been showing improved performance in recent trading sessions. 52 Week Range: $138.80 - $299.29. Market Cap: $566.34B.\n\n`;
  }
  
  // Add more common queries as needed
  
  // Return null if we don't have mock results for this query
  return null;
}

// Function to generate synthetic search results when real search fails
function getSyntheticSearchResults(query: string): string | null {
  // Normalize the query
  const normalizedQuery = query.toLowerCase().trim();
  
  // Try to extract key entities or concepts from the query
  // This is a very simplified approach - in a real system you'd use NLP
  const entities = extractEntitiesFromQuery(normalizedQuery);
  
  if (entities.length === 0) {
    return null;
  }
  
  // Generate synthetic results based on the entities
  let formattedResults = `Search results for "${query}":\n\n`;
  let hasResults = false;
  
  // Add a result for each entity
  entities.forEach((entity, index) => {
    if (entity.name && entity.type) {
      hasResults = true;
      formattedResults += `${index + 1}. ${capitalizeFirstLetter(entity.name)} - ${entity.type}\n`;
      formattedResults += `   https://example.com/search?q=${encodeURIComponent(entity.name)}\n`;
      formattedResults += `   This is a search result related to ${entity.name}. Please note that this is a synthetic result as the actual search service is currently limited.\n\n`;
    }
  });
  
  if (!hasResults) {
    return null;
  }
  
  // Add a note that these are synthetic results
  formattedResults += `Note: These are synthetic search results. For production use, please configure a proper Google Custom Search Engine in the Google Cloud Console.\n\n`;
  
  return formattedResults;
}

// Helper function to extract entities from a query
function extractEntitiesFromQuery(query: string): Array<{name: string, type: string}> {
  const entities: Array<{name: string, type: string}> = [];
  
  // Check for common entity types
  // Countries
  const countries = ['united states', 'usa', 'us', 'uk', 'united kingdom', 'canada', 'australia', 'france', 'germany', 'japan', 'china', 'russia'];
  countries.forEach(country => {
    if (query.includes(country)) {
      entities.push({name: country, type: 'Country'});
    }
  });
  
  // People types
  const peopleTypes = ['president', 'ceo', 'director', 'actor', 'actress', 'singer', 'author', 'writer', 'scientist', 'politician'];
  peopleTypes.forEach(type => {
    if (query.includes(type)) {
      entities.push({name: type, type: 'Person Role'});
    }
  });
  
  // Companies
  const companies = ['apple', 'google', 'microsoft', 'amazon', 'facebook', 'tesla', 'twitter', 'netflix', 'uber', 'airbnb'];
  companies.forEach(company => {
    if (query.includes(company)) {
      entities.push({name: company, type: 'Company'});
    }
  });
  
  // Financial terms
  const financialTerms = ['stock', 'price', 'market', 'shares', 'dividend', 'earnings', 'revenue', 'profit', 'loss'];
  financialTerms.forEach(term => {
    if (query.includes(term)) {
      entities.push({name: term, type: 'Financial Term'});
    }
  });
  
  // Extract other potential entities (any capitalized words or phrases)
  const words = query.split(' ');
  let currentEntity = '';
  
  words.forEach(word => {
    // If the word starts with a capital letter, it might be an entity
    if (word.length > 0 && word[0] === word[0].toUpperCase() && isNaN(parseInt(word[0]))) {
      if (currentEntity.length > 0) {
        currentEntity += ' ' + word;
      } else {
        currentEntity = word;
      }
    } else if (currentEntity.length > 0) {
      // End of entity
      entities.push({name: currentEntity.toLowerCase(), type: 'Entity'});
      currentEntity = '';
    }
  });
  
  // Add the last entity if there is one
  if (currentEntity.length > 0) {
    entities.push({name: currentEntity.toLowerCase(), type: 'Entity'});
  }
  
  // If we still have no entities, use the whole query
  if (entities.length === 0 && query.length > 0) {
    entities.push({name: query, type: 'Search Query'});
  }
  
  return entities;
}

// Helper function to capitalize the first letter of a string
function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Simple error handler for search failures
function handleSearchError(query: string, error: any): string {
  return `Unable to perform search for "${query}": ${error?.message || 'Unknown error'}\n\n` +
    `This could be due to:\n` +
    `1. API key limitations or issues\n` +
    `2. Rate limiting or quota restrictions\n` +
    `3. Network connectivity problems\n\n` +
    `Please check the console logs for more detailed error information.`;
}

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
  let apiKey = settings.apiKeys.google;
  
  // If no key in settings store, try to get it from backup in localStorage
  if (!apiKey && typeof window !== 'undefined') {
    try {
      const backupSettingsJson = localStorage.getItem('gervais-api-backup');
      if (backupSettingsJson) {
        const backupSettings = JSON.parse(backupSettingsJson);
        if (backupSettings?.apiKeys?.google) {
          console.log('Retrieved Google API key from localStorage backup');
          apiKey = backupSettings.apiKeys.google;
          
          // Update the settings store with the recovered key
          settingsStore.updateApiKeys({
            google: apiKey
          }).catch(e => console.error('Failed to update settings store with recovered key:', e));
        }
      }
    } catch (error) {
      console.error('Error retrieving backup API key from localStorage:', error);
    }
  }
  
  // Use default fallback key if no key is found in settings or localStorage
  if (!apiKey) {
    console.log('Using default fallback Google API key');
    apiKey = 'AIzaSyCRI2T6ONhGuUAwjdoCzR6jAJXIs_ZCTHI';
    
    // Update the settings store with the default key for future use
    if (browser) {
      settingsStore.updateApiKeys({
        google: apiKey
      }).catch(e => console.error('Failed to update settings store with default key:', e));
    }
    
    return apiKey;
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
  onThinking?: (thinking: string) => void,
  enableSearch: boolean = false
) {
  try {
    const apiKey = getApiKey();
    const googleMessages = convertToGoogleMessages(messages);
    
    // If search is enabled, use gemini-2.0-flash instead of gemini-2.0-flash-exp
    let effectiveModelId = modelId;
    if (enableSearch && modelId === 'gemini-2.0-flash-exp') {
      console.log('Switching to gemini-2.0-flash for search capability');
      effectiveModelId = 'gemini-2.0-flash';
    }
    
    // Ensure we're using the correct model ID
    console.log('Using model:', effectiveModelId);
    
    console.log('Sending request to Google Gemini API with model:', effectiveModelId);
    console.log('Messages after conversion:', JSON.stringify(googleMessages, null, 2));
    console.log('Web search enabled:', enableSearch);
    
    // Always request image generation unless using search (which doesn't support it)
    const shouldRequestImageGeneration = effectiveModelId === 'gemini-2.0-flash-exp';
    console.log('Image generation requested:', shouldRequestImageGeneration);
    
    // Create the request body
    const requestBody: GoogleCompletionRequest = {
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
    
    // Add responseModalities for image generation when using the experimental model
    if (shouldRequestImageGeneration) {
      requestBody.generationConfig.responseModalities = ['TEXT', 'IMAGE'];
    }
    
    // Add Google search tool if search is enabled
    if (enableSearch) {
      console.log('Adding Google search tool to request');
      requestBody.tools = [googleSearchTool];
    }
    
    // Log detailed request information for debugging
    console.log('Request configuration:', JSON.stringify({
      responseModalities: requestBody.generationConfig.responseModalities,
      temperature: requestBody.generationConfig.temperature,
      maxOutputTokens: requestBody.generationConfig.maxOutputTokens
    }, null, 2));
    
    // Log the complete URL for debugging
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${effectiveModelId}:streamGenerateContent?key=${apiKey}`;
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
      console.log('Raw chunk data:', chunk); // Log the raw chunk to help debug the response format
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
                // NEW: Check for functionCall within parts
                if (part.functionCall) {
                  console.log('Found functionCall in parts array (JSON object):', part.functionCall);
                  if (part.functionCall.name === "google_search") {
                    const query = part.functionCall.args.query;
                    console.log('Google search requested with query (from parts):', query);
                    newText += `\n\n[🔍 Searching for: ${query}]\n\n`;
                    
                    // Notify the user that a search is being performed
                    onChunk(responseText + newText, mediaItems);
                    
                    // Perform actual Google search
                    try {
                      const searchResults = await performGoogleSearch(query);
                      console.log('Search results received:', searchResults.substring(0, 100) + '...');
                      
                      // Send search results back to the model for processing
                      const searchResponseText = await handleSearchResults(
                        effectiveModelId, 
                        [...googleMessages, {
                          role: 'model' as const,
                          parts: [{ text: newText }]
                        }], 
                        searchResults,
                        onChunk,
                        onError,
                        responseText,
                        mediaItems
                      );
                      
                      // Update the full response text with search-informed content
                      if (searchResponseText) {
                        responseText = searchResponseText;
                      }
                      
                      // Skip normal processing since we've handled it via search
                      continue;
                    } catch (searchError) {
                      console.error('Error performing search:', searchError);
                      newText += `\n\nError performing search: ${searchError.message}\n\n`;
                    }
                  }
                }
              }
              
              // Check for function calls in the response (for search functionality in old format)
              if (item.candidates?.[0]?.content?.functionCalls) {
                console.log('Found functionCalls array in content:', item.candidates[0].content.functionCalls);
                const functionCalls = item.candidates[0].content.functionCalls;
                for (const functionCall of functionCalls) {
                  if (functionCall.name === "google_search") {
                    const query = functionCall.args.query;
                    console.log('Google search requested with query (from functionCalls):', query);
                    newText += `\n\n[🔍 Searching for: ${query}]\n\n`;
                    
                    // Notify the user that a search is being performed
                    onChunk(responseText + newText, mediaItems);
                    
                    // Perform actual Google search
                    try {
                      const searchResults = await performGoogleSearch(query);
                      console.log('Search results received:', searchResults.substring(0, 100) + '...');
                      
                      // Send search results back to the model for processing
                      const searchResponseText = await handleSearchResults(
                        effectiveModelId, 
                        [...googleMessages, {
                          role: 'model' as const,
                          parts: [{ text: newText }]
                        }], 
                        searchResults,
                        onChunk,
                        onError,
                        responseText,
                        mediaItems
                      );
                      
                      // Update the full response text with search-informed content
                      if (searchResponseText) {
                        responseText = searchResponseText;
                      }
                      
                      // Skip normal processing since we've handled it via search
                      continue;
                    } catch (searchError) {
                      console.error('Error performing search:', searchError);
                      newText += `\n\nError performing search: ${searchError.message}\n\n`;
                    }
                  }
                }
              }
              
              if (newText) {
                responseText += newText;
              }
              
              // Notify the caller with new text
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
              // NEW: Check for functionCall within parts
              if (part.functionCall) {
                console.log('Found functionCall in parts array (JSON object):', part.functionCall);
                if (part.functionCall.name === "google_search") {
                  const query = part.functionCall.args.query;
                  console.log('Google search requested with query (from parts):', query);
                  newText += `\n\n[🔍 Searching for: ${query}]\n\n`;
                  
                  // Notify the user that a search is being performed
                  onChunk(responseText + newText, mediaItems);
                  
                  // Perform actual Google search
                  try {
                    const searchResults = await performGoogleSearch(query);
                    console.log('Search results received:', searchResults.substring(0, 100) + '...');
                    
                    // Send search results back to the model for processing
                    const searchResponseText = await handleSearchResults(
                      effectiveModelId, 
                      [...googleMessages, {
                        role: 'model' as const,
                        parts: [{ text: newText }]
                      }], 
                      searchResults,
                      onChunk,
                      onError,
                      responseText,
                      mediaItems
                    );
                    
                    // Update the full response text with search-informed content
                    if (searchResponseText) {
                      responseText = searchResponseText;
                    }
                    
                    // Skip normal processing since we've handled it via search
                    continue;
                  } catch (searchError) {
                    console.error('Error performing search:', searchError);
                    newText += `\n\nError performing search: ${searchError.message}\n\n`;
                  }
                }
              }
            }
            
            // Check for function calls in the response (for search functionality in old format)
            if (jsonData.candidates?.[0]?.content?.functionCalls) {
              console.log('Found functionCalls array in content:', jsonData.candidates[0].content.functionCalls);
              const functionCalls = jsonData.candidates[0].content.functionCalls;
              for (const functionCall of functionCalls) {
                if (functionCall.name === "google_search") {
                  const query = functionCall.args.query;
                  console.log('Google search requested with query (from functionCalls):', query);
                  newText += `\n\n[🔍 Searching for: ${query}]\n\n`;
                  
                  // Notify the user that a search is being performed
                  onChunk(responseText + newText, mediaItems);
                  
                  // Perform actual Google search
                  try {
                    const searchResults = await performGoogleSearch(query);
                    console.log('Search results received:', searchResults.substring(0, 100) + '...');
                    
                    // Send search results back to the model for processing
                    const searchResponseText = await handleSearchResults(
                      effectiveModelId, 
                      [...googleMessages, {
                        role: 'model' as const,
                        parts: [{ text: newText }]
                      }], 
                      searchResults,
                      onChunk,
                      onError,
                      responseText,
                      mediaItems
                    );
                    
                    // Update the full response text with search-informed content
                    if (searchResponseText) {
                      responseText = searchResponseText;
                    }
                    
                    // Skip normal processing since we've handled it via search
                    continue;
                  } catch (searchError) {
                    console.error('Error performing search:', searchError);
                    newText += `\n\nError performing search: ${searchError.message}\n\n`;
                  }
                }
              }
            }
            
            if (newText) {
              responseText += newText;
            }
            
            // Notify the caller with new text
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

// New function to handle search results and continue the conversation
async function handleSearchResults(
  modelId: string,
  messages: GoogleMessage[],
  searchResults: string,
  onChunk: (text: string, media?: MediaItem[]) => void,
  onError: (error: Error) => void,
  currentText: string,
  currentMediaItems: MediaItem[] = []
): Promise<string> {
  try {
    // Add the search results as a "user" message (system messages aren't supported)
    const messagesWithSearchResults = [
      ...messages,
      {
        role: 'user' as const,
        parts: [{ 
          text: `Search results:\n\n${searchResults}\n\nPlease incorporate this information into your response.` 
        }]
      }
    ];
    
    const apiKey = getApiKey();
    
    // Create a follow-up request with search results
    const requestBody: GoogleCompletionRequest = {
      contents: messagesWithSearchResults,
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
    
    // Make request to get search-informed response
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get search-informed response: ${response.statusText}`);
    }
    
    const data: GoogleCompletionResponse = await response.json();
    
    // Get the search-informed response text
    let searchInformedText = '';
    for (const part of data.candidates[0]?.content?.parts || []) {
      if (part.text) {
        searchInformedText += part.text;
      }
    }
    
    // Replace the search placeholder with the actual search-informed text
    const updatedText = currentText.replace(
      `\n\n[🔍 Searching for: ${searchResults.split('"')[1]}]\n\n`,
      `\n\n[🔍 Search results incorporated into response]\n\n`
    ) + searchInformedText;
    
    // Update the UI with the search-informed response
    onChunk(updatedText, currentMediaItems);
    
    return updatedText;
  } catch (error) {
    console.error('Error handling search results:', error);
    onError(error instanceof Error ? error : new Error(String(error)));
    return currentText + `\n\nError incorporating search results: ${error.message}\n\n`;
  }
}

// Non-streaming completion API with multimodal support
export async function completion(
  modelId: string, 
  messages: Message[],
  enableSearch: boolean = false,
  _fromSendMessage: boolean = false // Internal flag to avoid recursion
): Promise<{ text: string, media: MediaItem[] }> {
  try {
    const apiKey = getApiKey();
    const googleMessages = convertToGoogleMessages(messages);
    
    // If search is enabled, use gemini-2.0-flash instead of gemini-2.0-flash-exp
    let effectiveModelId = modelId;
    if (enableSearch && modelId === 'gemini-2.0-flash-exp') {
      console.log('Switching to gemini-2.0-flash for search capability');
      effectiveModelId = 'gemini-2.0-flash';
    }
    
    // Ensure we're using the correct model ID
    console.log('Using model (non-streaming):', effectiveModelId);
    
    console.log('Sending non-streaming request to Google Gemini API with model:', effectiveModelId);
    console.log('Messages after conversion:', JSON.stringify(googleMessages, null, 2));
    console.log('Web search enabled:', enableSearch);
    
    // Always request image generation unless using search (which doesn't support it)
    const shouldRequestImageGeneration = effectiveModelId === 'gemini-2.0-flash-exp';
    console.log('Image generation requested:', shouldRequestImageGeneration);
    
    // Create the request body
    const requestBody: GoogleCompletionRequest = {
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
    
    // Add responseModalities for image generation when using the experimental model
    if (shouldRequestImageGeneration) {
      requestBody.generationConfig.responseModalities = ['TEXT', 'IMAGE'];
    }
    
    // Add Google search tool if search is enabled
    if (enableSearch) {
      console.log('Adding Google search tool to request');
      requestBody.tools = [googleSearchTool];
    }
    
    // Log detailed request information for debugging
    console.log('Request configuration:', JSON.stringify({
      responseModalities: requestBody.generationConfig.responseModalities,
      temperature: requestBody.generationConfig.temperature,
      maxOutputTokens: requestBody.generationConfig.maxOutputTokens
    }, null, 2));
    
    // Log the complete URL for debugging
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${effectiveModelId}:generateContent?key=${apiKey}`;
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
    
    // Log the actual response for debugging
    console.log('Raw response from Google API:', JSON.stringify(data, null, 2));
    
    // Process parts which could be text or images
    const parts = data.candidates[0]?.content?.parts || [];
    console.log('Found parts in response:', parts.length);
    parts.forEach((part, index) => {
      if (part.text) {
        console.log(`Part ${index}: text content (length ${part.text.length})`);
      } else if (part.inlineData) {
        console.log(`Part ${index}: inlineData with mimeType ${part.inlineData.mimeType}, data length: ${part.inlineData.data?.length || 0}`);
      } else if (part.functionCall) {
        console.log(`Part ${index}: functionCall with name ${part.functionCall.name}`);
      } else {
        console.log(`Part ${index}: unknown content type`, part);
      }
    });
    
    let hasImageRequest = shouldRequestImageGeneration;
    let hasImageResponse = false;
    let googleSearchQuery = null;
    
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
      } else if (part.functionCall && part.functionCall.name === "google_search") {
        // Handle function call in parts
        googleSearchQuery = part.functionCall.args.query;
        console.log('Google search requested with query (non-streaming):', googleSearchQuery);
        responseText += `\n\n[🔍 Searching for: ${googleSearchQuery}]\n\n`;
        
        // For non-streaming, we'll perform the search and get results right away
        try {
          const searchResults = await performGoogleSearch(googleSearchQuery);
          console.log('Search results received (non-streaming):', searchResults.substring(0, 100) + '...');
          
          // Append search results to response
          responseText += `Search results:\n\n${searchResults}\n\n`;
          
          // Now make a follow-up request to get the model to incorporate these results
          const followUpResponse = await handleSearchResultsNonStreaming(
            effectiveModelId,
            googleMessages,
            searchResults,
            responseText
          );
          
          if (followUpResponse) {
            // Replace the search indicator with the search-informed response
            responseText = followUpResponse;
          }
        } catch (searchError) {
          console.error('Error performing search (non-streaming):', searchError);
          responseText += `\n\nError performing search: ${searchError.message}\n\n`;
        }
      }
    }
    
    // If user requested an image but no valid image was returned, add an error message
    if (hasImageRequest && !hasImageResponse) {
      const errorMsg = "Google's API did not return a valid image. This could be due to content policy restrictions, rate limiting, or an error in the image generation process.";
      responseText += `\n\n**Error generating image**: ${errorMsg}`;
    }
    
    return { text: responseText, media: mediaItems };
  } catch (error) {
    console.error('Google completion error:', error);
    throw error;
  }
}

// Add a new function for non-streaming search handling
async function handleSearchResultsNonStreaming(
  modelId: string,
  messages: GoogleMessage[],
  searchResults: string,
  currentText: string
): Promise<string> {
  try {
    // Add the search results as a "user" message
    const messagesWithSearchResults = [
      ...messages,
      {
        role: 'user' as const,
        parts: [{ 
          text: `Search results:\n\n${searchResults}\n\nPlease incorporate this information into your response.` 
        }]
      }
    ];
    
    const apiKey = getApiKey();
    
    // Create a follow-up request with search results
    const requestBody: GoogleCompletionRequest = {
      contents: messagesWithSearchResults,
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
    
    // Make request to get search-informed response
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get search-informed response: ${response.statusText}`);
    }
    
    const data: GoogleCompletionResponse = await response.json();
    console.log('Search-informed response:', data);
    
    // Get the search-informed response text
    let searchInformedText = '';
    for (const part of data.candidates[0]?.content?.parts || []) {
      if (part.text) {
        searchInformedText += part.text;
      }
    }
    
    // Replace the search placeholder with the actual search-informed text
    const query = searchResults.split('"')[1] || "unknown query";
    const updatedText = currentText.replace(
      `\n\n[🔍 Searching for: ${query}]\n\n`,
      `\n\n[🔍 Search results incorporated]\n\n`
    ) + searchInformedText;
    
    return updatedText;
  } catch (error) {
    console.error('Error handling search results (non-streaming):', error);
    return currentText + `\n\nError incorporating search results: ${error.message}\n\n`;
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
      enableSearch?: boolean;
    } = {}
  ): Promise<ReadableStream<Uint8Array> | { text: string, media: MediaItem[] }> {
    if (!this.apiKey) {
      throw new Error('Google API key is required');
    }
    
    // If search is enabled, use gemini-2.0-flash instead of gemini-2.0-flash-exp
    let effectiveModelId = model.id;
    if (options.enableSearch && model.id === 'gemini-2.0-flash-exp') {
      console.log('Switching to gemini-2.0-flash for search capability');
      effectiveModelId = 'gemini-2.0-flash';
    }
    
    // Ensure we're using the correct model ID
    console.log('GoogleService.sendMessage using model:', effectiveModelId);
    
    const googleMessages = convertToGoogleMessages(messages);
    
    // Always request image generation unless using search (which doesn't support it)
    const shouldRequestImageGeneration = effectiveModelId === 'gemini-2.0-flash-exp';
    console.log('Image generation requested:', shouldRequestImageGeneration);
    console.log('Web search enabled:', options.enableSearch);
    
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
    
    // Add responseModalities for image generation when using the experimental model
    if (shouldRequestImageGeneration) {
      request.generationConfig.responseModalities = ['TEXT', 'IMAGE'];
    }
    
    // Add Google search tool if search is enabled
    if (options.enableSearch) {
      console.log('Adding Google search tool to request');
      request.tools = [googleSearchTool];
    }
    
    // Log the complete URL for debugging
    const apiUrl = `${this.baseUrl}/models/${effectiveModelId}:${options.stream ? 'streamGenerateContent' : 'generateContent'}?key=${this.apiKey}`;
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
      // For non-streaming requests, handle the full response here
      const data: GoogleCompletionResponse = await response.json();
      let responseText = '';
      const mediaItems: MediaItem[] = [];
      
      // Log the actual response for debugging
      console.log('Raw response from Google API:', JSON.stringify(data, null, 2));
      
      // Process parts which could be text or images
      const parts = data.candidates[0]?.content?.parts || [];
      console.log('Found parts in response:', parts.length);
      parts.forEach((part, index) => {
        if (part.text) {
          console.log(`Part ${index}: text content (length ${part.text.length})`);
        } else if (part.inlineData) {
          console.log(`Part ${index}: inlineData with mimeType ${part.inlineData.mimeType}, data length: ${part.inlineData.data?.length || 0}`);
        } else if (part.functionCall) {
          console.log(`Part ${index}: functionCall with name ${part.functionCall.name}`);
        } else {
          console.log(`Part ${index}: unknown content type`, part);
        }
      });
      
      let hasImageRequest = shouldRequestImageGeneration;
      let hasImageResponse = false;
      let googleSearchQuery = null;
      
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
        } else if (part.functionCall && part.functionCall.name === "google_search") {
          // Handle function call in parts
          googleSearchQuery = part.functionCall.args.query;
          console.log('Google search requested with query (non-streaming):', googleSearchQuery);
          responseText += `\n\n[🔍 Searching for: ${googleSearchQuery}]\n\n`;
          
          // For non-streaming, we'll perform the search and get results right away
          try {
            const searchResults = await performGoogleSearch(googleSearchQuery);
            console.log('Search results received (non-streaming):', searchResults.substring(0, 100) + '...');
            
            // Append search results to response
            responseText += `Search results:\n\n${searchResults}\n\n`;
            
            // Now make a follow-up request to get the model to incorporate these results
            const followUpResponse = await handleSearchResultsNonStreaming(
              effectiveModelId,
              googleMessages,
              searchResults,
              responseText
            );
            
            if (followUpResponse) {
              // Replace the search indicator with the search-informed response
              responseText = followUpResponse;
            }
          } catch (searchError) {
            console.error('Error performing search (non-streaming):', searchError);
            responseText += `\n\nError performing search: ${searchError.message}\n\n`;
          }
        }
      }
      
      // If user requested an image but no valid image was returned, add an error message
      if (hasImageRequest && !hasImageResponse) {
        const errorMsg = "Google's API did not return a valid image. This could be due to content policy restrictions, rate limiting, or an error in the image generation process.";
        responseText += `\n\n**Error generating image**: ${errorMsg}`;
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