import Dexie from 'dexie';
import type { Chat, Message, MediaItem, LLMModel, Settings } from '$lib/types';
import { browser } from '$app/environment';
import { defaultModel } from '$lib/services/llm/models';

export class GervaisDB extends Dexie {
  // Tables
  chats!: Dexie.Table<Chat, string>; // string = type of primary key
  messages!: Dexie.Table<Message, string>;
  mediaItems!: Dexie.Table<MediaItem, string>;
  settings!: Dexie.Table<Settings, string>;

  constructor() {
    super('gervaisDB');
    
    // Define database schema
    this.version(1).stores({
      chats: 'id, title, updatedAt, createdAt',
      messages: 'id, chatId, role, timestamp',
      mediaItems: 'id, messageId, type, timestamp',
      settings: 'id'
    });
    
    // Apply mappings (used to handle complex objects like LLMModel in Chat)
    this.chats.mapToClass(ChatClass);
  }
  
  // Initialize the database with default values if necessary
  async initialize() {
    // Check if there's existing data in localStorage to migrate
    if (browser) {
      try {
        // First check if we already have settings in IndexedDB
        const existingSettings = await this.settings.get('user-settings');
        if (existingSettings) {
          console.log('Found existing settings in IndexedDB:', existingSettings);
          return;
        }
        
        // If no settings in IndexedDB, check localStorage
        const storedSettings = localStorage.getItem('settings');
        if (storedSettings) {
          try {
            const parsedSettings = JSON.parse(storedSettings) as Settings;
            // Use a consistent ID for settings
            await this.settings.put({...parsedSettings, id: 'user-settings'});
            console.log('Settings migrated from localStorage to IndexedDB:', parsedSettings);
          } catch (e) {
            console.error('Failed to migrate settings:', e);
          }
        } else {
          // Create default settings if none exist
          const defaultSettings: Settings = {
            id: 'user-settings',
            apiKeys: {
              anthropic: '',
              openai: '',
              google: '',
              ollamaHost: 'http://localhost:11434',
              localHost: 'http://localhost:8000'
            },
            theme: 'system',
            videoCaptureDuration: 5,
            videoCaptureFps: 1,
            saveChatsToLocalStorage: false,
          };
          await this.settings.put(defaultSettings);
          console.log('Created default settings in IndexedDB:', defaultSettings);
        }
      } catch (error) {
        console.error('Error initializing settings:', error);
      }
      
      // Migrate chats if they exist
      const storedChats = localStorage.getItem('chats');
      if (storedChats) {
        try {
          const parsedChats = JSON.parse(storedChats) as Chat[];
          
          // Begin transaction for migrating all chats and their messages
          await this.transaction('rw', this.chats, this.messages, this.mediaItems, async () => {
            for (const chat of parsedChats) {
              // Remove messages from chat object before storing
              const messages = [...chat.messages];
              const chatToStore = {...chat};
              
              // Store the chat without messages array
              delete (chatToStore as any).messages;
              await this.chats.put(chatToStore);
              
              // Store each message separately
              for (const message of messages) {
                // Extract media items from the message
                const mediaItems = message.media || [];
                
                // Create a copy of the message without media array
                const messageToStore = {...message, chatId: chat.id};
                delete (messageToStore as any).media;
                
                // Store the message
                await this.messages.put(messageToStore);
                
                // Store each media item
                for (const media of mediaItems) {
                  await this.mediaItems.put({...media, messageId: message.id});
                }
              }
            }
            
            console.log('Chats migrated from localStorage to IndexedDB');
          });
        } catch (e) {
          console.error('Failed to migrate chats:', e);
        }
      }
    }
  }
  
  // ======= Chat Operations =======
  
  // Get all chats, ordered by most recent first
  async getAllChats(): Promise<Chat[]> {
    const chats = await this.chats.orderBy('updatedAt').reverse().toArray();
    
    // Return chats with empty message arrays
    return chats.map(chat => ({
      ...chat,
      messages: []
    }));
  }
  
  // Get a single chat with its messages
  async getChat(chatId: string): Promise<Chat | null> {
    // Get the chat
    const chat = await this.chats.get(chatId);
    if (!chat) return null;
    
    // Get messages for this chat
    const messages = await this.messages
      .where('chatId')
      .equals(chatId)
      .sortBy('timestamp');
    
    // Load media for each message
    for (const message of messages) {
      const media = await this.mediaItems
        .where('messageId')
        .equals(message.id)
        .toArray();
      
      if (media.length > 0) {
        message.media = media;
      }
    }
    
    // Create a complete chat object with messages
    return {
      ...chat,
      messages
    };
  }
  
  // Create a new chat
  async createChat(model: LLMModel = defaultModel): Promise<Chat> {
    const newChat: Chat = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model: model,
    };
    
    // Store chat without messages (they'll be stored separately)
    const chatToStore = {...newChat};
    delete (chatToStore as any).messages;
    
    await this.chats.put(chatToStore);
    return newChat;
  }
  
  // Update chat details
  async updateChat(chatId: string, updates: Partial<Chat>): Promise<void> {
    // Don't update messages through this method
    const chatUpdates = {...updates};
    if ('messages' in chatUpdates) {
      delete chatUpdates.messages;
    }
    
    // Set updated timestamp
    chatUpdates.updatedAt = Date.now();
    
    await this.chats.update(chatId, chatUpdates);
  }
  
  // Delete a chat and its messages
  async deleteChat(chatId: string): Promise<void> {
    await this.transaction('rw', this.chats, this.messages, this.mediaItems, async () => {
      // Get all messages in this chat
      const messages = await this.messages
        .where('chatId')
        .equals(chatId)
        .toArray();
      
      // Delete all media items for these messages
      for (const message of messages) {
        await this.mediaItems
          .where('messageId')
          .equals(message.id)
          .delete();
      }
      
      // Delete all messages in this chat
      await this.messages
        .where('chatId')
        .equals(chatId)
        .delete();
      
      // Delete the chat itself
      await this.chats.delete(chatId);
    });
  }
  
  // ======= Message Operations =======
  
  // Add a message to a chat
  async addMessage(chatId: string, message: Omit<Message, 'id' | 'timestamp' | 'chatId'>): Promise<string> {
    const messageId = crypto.randomUUID();
    const timestamp = Date.now();
    
    const newMessage: Message = {
      ...message,
      id: messageId,
      chatId,
      timestamp,
    };
    
    await this.transaction('rw', this.messages, this.mediaItems, this.chats, async () => {
      // Store media items separately
      const mediaItems = newMessage.media || [];
      const messageToStore = {...newMessage};
      delete (messageToStore as any).media;
      
      // Add the message
      await this.messages.put(messageToStore);
      
      // Add media items
      for (const media of mediaItems) {
        // Ensure each media item has its own unique ID and the messageId is set
        const mediaItemToStore = {
          ...media,
          id: media.id || crypto.randomUUID(),
          messageId,
          timestamp: media.timestamp || Date.now()
        };
        await this.mediaItems.put(mediaItemToStore);
      }
      
      // Update chat title if this is the first user message
      const chat = await this.chats.get(chatId);
      if (chat && chat.title === 'New Chat' && message.role === 'user') {
        // Update chat title based on first message
        const title = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '');
        await this.chats.update(chatId, {
          title,
          updatedAt: Date.now()
        });
      } else {
        // Just update the timestamp
        await this.chats.update(chatId, { updatedAt: Date.now() });
      }
    });
    
    return messageId;
  }
  
  // Update a message
  async updateMessage(messageId: string, updates: Partial<Message>): Promise<void> {
    try {
      // First, check if the message exists
      const existingMessage = await this.messages.get(messageId);
      if (!existingMessage) {
        console.error(`Cannot update message ${messageId} - not found in database`);
        return;
      }

      // Start a transaction for atomicity
      await this.transaction('rw', this.messages, this.mediaItems, this.chats, async () => {
        // Handle media separately if present in updates
        const messageUpdates = {...updates};
        if ('media' in messageUpdates && messageUpdates.media !== undefined) {
          const mediaItems = messageUpdates.media || [];
          
          // Remove media from updates to avoid overwriting
          delete messageUpdates.media;
          
          // Replace all media items for this message
          await this.mediaItems
            .where('messageId')
            .equals(messageId)
            .delete();
          
          // Add new media items
          for (const media of mediaItems) {
            // Ensure each media item has its own unique ID and the messageId is set
            const mediaItemToStore = {
              ...media,
              id: media.id || crypto.randomUUID(),
              messageId,
              timestamp: media.timestamp || Date.now()
            };
            await this.mediaItems.put(mediaItemToStore);
          }
        }
        
        // Make sure chatId is not included in the updates
        if ('chatId' in messageUpdates) {
          delete messageUpdates.chatId;
        }
        
        // Remove any undefined values from updates
        Object.keys(messageUpdates).forEach(key => {
          if (messageUpdates[key] === undefined) {
            delete messageUpdates[key];
          }
        });
        
        // Only update if we have valid properties to update
        if (Object.keys(messageUpdates).length > 0) {
          // Update the message itself
          await this.messages.update(messageId, messageUpdates);
        }
        
        // Update the chat's timestamp
        if (existingMessage.chatId) {
          await this.chats.update(existingMessage.chatId, { updatedAt: Date.now() });
        }
      });
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }
  
  // ======= Settings Operations =======
  
  // Get settings
  async getSettings(): Promise<Settings> {
    let settings = await this.settings.get('user-settings');
    
    if (!settings) {
      // Create default settings if none exist
      const defaultSettings: Settings = {
        id: 'user-settings',
        apiKeys: {},
        theme: 'system',
        videoCaptureDuration: 5,
        videoCaptureFps: 1,
        saveChatsToLocalStorage: false,
      };
      await this.settings.put(defaultSettings);
      settings = defaultSettings;
    }
    
    return settings;
  }
  
  // Update settings
  async updateSettings(updates: Partial<Settings>): Promise<void> {
    const settings = await this.getSettings();
    await this.settings.update('user-settings', { ...settings, ...updates });
  }
  
  // Update API keys
  async updateApiKeys(newApiKeys: Partial<Settings['apiKeys']>): Promise<void> {
    const settings = await this.getSettings();
    const updatedApiKeys = { ...settings.apiKeys, ...newApiKeys };
    await this.settings.update('user-settings', { apiKeys: updatedApiKeys });
  }
}

// Class to handle nested objects in Dexie
class ChatClass implements Chat {
  id!: string;
  title!: string;
  messages!: Message[];
  createdAt!: number;
  updatedAt!: number;
  model!: LLMModel;
  
  constructor(init?: Partial<Chat>) {
    if (init) {
      Object.assign(this, init);
    }
    this.messages = this.messages || [];
  }
}

// Create and export the database instance
export const db = new GervaisDB(); 