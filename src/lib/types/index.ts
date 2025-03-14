// Message Types
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  chatId?: string;
  media?: MediaItem[];
  toolCalls?: ToolCall[];
  toolCallResults?: ToolCallResult[];
  thinking?: string;
}

// Chat Types
export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model: LLMModel;
}

// LLM Types
export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'ollama';

export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProvider;
  description?: string;
  isLocal: boolean;
  maxTokens?: number;
  supportsThinking?: boolean;
  supportsTools?: boolean;
  supportsFiles?: boolean;
  supportsStreaming?: boolean;
  supportsMultimodal?: boolean;
  supportsImageGeneration?: boolean;
}

// Tool Types
export interface Tool {
  type: string;
  name: string;
  description: string;
  icon: string;
}

export interface ToolCall {
  id: string;
  type: string;
  name: string;
  args: Record<string, any>;
}

export interface ToolCallResult {
  callId: string;
  result: any;
}

// Media Types
export type MediaType = 'image' | 'audio' | 'video' | 'document' | 'text' | 'other';

export interface MediaItem {
  id: string;
  type: MediaType;
  name: string;
  messageId?: string;
  url?: string;
  data?: Blob | string;
  preview?: string;
  size?: number;
  timestamp: number;
  fileId?: string;
}

// Settings Types
export interface Settings {
  id?: string;
  theme: 'light' | 'dark' | 'system';
  apiKeys: ApiKeys;
  videoCaptureDuration: number;
  videoCaptureFps: number;
  saveChatsToLocalStorage: boolean;
  preserveKeyFormat?: boolean;
}

export interface ApiKeys {
  anthropic?: string;
  openai?: string;
  google?: string;
  ollamaHost?: string;
} 