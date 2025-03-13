import { writable, derived, get } from 'svelte/store';
import type { Chat, Message, LLMModel } from '$lib/types';
import { defaultModel } from '$lib/services/llm/models';
import { browser } from '$app/environment';
import { db } from '$lib/services/db';

// Initial state
const initialState = {
  chats: [] as Chat[],
  activeChat: null as string | null,
};

// Create the store
const createChatStore = () => {
  const { subscribe, set, update } = writable(initialState);

  // Load a specific chat with all messages
  const loadChatDetails = async (chatId: string) => {
    if (!browser) return;
    
    const chat = await db.getChat(chatId);
    if (!chat) return;
    
    // Update just this chat in our chats array
    update(state => {
      const updatedChats = state.chats.map(c => 
        c.id === chatId ? chat : c
      );
      return { ...state, chats: updatedChats };
    });
  };

  // Create a new chat
  const createNewChat = async (model: LLMModel = defaultModel) => {
    if (!browser) return null;
    
    // Create a new chat in the database
    const newChat = await db.createChat(model);
    
    // Update our store
    update(state => {
      return {
        chats: [newChat, ...state.chats],
        activeChat: newChat.id,
      };
    });
    
    return newChat.id;
  };

  // Load chats from database
  const loadChats = async () => {
    if (!browser) return;
    
    try {
      // Get all chats (basic info without messages)
      const chats = await db.getAllChats();
      
      update(state => ({ ...state, chats }));
      
      // Set the active chat to the most recent or create a new one
      if (chats.length > 0) {
        const activeId = chats[0].id;
        update(state => ({ ...state, activeChat: activeId }));
        
        // Load the active chat's messages
        await loadChatDetails(activeId);
      } else {
        await createNewChat();
      }
    } catch (e) {
      console.error('Failed to load chats from database', e);
      await createNewChat();
    }
  };

  // Get active chat
  const getActiveChat = (): Chat | null => {
    const state = get({ subscribe });
    if (!state.activeChat) return null;
    return state.chats.find(chat => chat.id === state.activeChat) || null;
  };

  return {
    subscribe,
    
    // Export createNewChat function
    createNewChat,
    
    // Select a chat
    selectChat: async (chatId: string) => {
      // First update the active chat ID in the store
      update(state => ({ ...state, activeChat: chatId }));
      
      // Then load all the messages for this chat
      await loadChatDetails(chatId);
    },
    
    // Delete a chat
    deleteChat: async (chatId: string) => {
      if (!browser) return;
      
      // Delete the chat from the database
      await db.deleteChat(chatId);
      
      update(state => {
        const newChats = state.chats.filter(chat => chat.id !== chatId);
        
        // If we're deleting the active chat, set a new active chat
        let newActiveChat = state.activeChat;
        if (state.activeChat === chatId) {
          newActiveChat = newChats.length > 0 ? newChats[0].id : null;
          
          // If no chats left, create a new one (will be handled in a separate async operation)
          if (!newActiveChat) {
            createNewChat().then(id => {
              update(s => ({ ...s, activeChat: id }));
              loadChatDetails(id);
            });
            return { chats: newChats, activeChat: null };
          } else {
            // Load the new active chat's messages
            loadChatDetails(newActiveChat);
          }
        }
        
        return {
          chats: newChats,
          activeChat: newActiveChat,
        };
      });
    },
    
    // Add a message to a chat
    addMessage: async (chatId: string, message: Omit<Message, 'id' | 'timestamp' | 'chatId'>) => {
      if (!browser) return null;
      
      try {
        // Verify the chat exists in our local state
        const state = get({ subscribe });
        const chat = state.chats.find(c => c.id === chatId);
        if (!chat) {
          console.error(`Cannot add message - chat ${chatId} not found in local state`);
          return null;
        }
        
        // Add the message to the database
        const messageId = await db.addMessage(chatId, message);
        
        // Get the updated chat from the database to ensure we have the latest title
        const updatedChat = await db.getChat(chatId);
        if (!updatedChat) {
          console.error(`Failed to get updated chat after adding message`);
          return null;
        }
        
        // Update our local store with the new message and title
        update(state => {
          const activeChat = state.chats.find(c => c.id === chatId);
          if (!activeChat) return state;
          
          const timestamp = Date.now();
          const newMessage: Message = { 
            ...message, 
            id: messageId, 
            timestamp,
            chatId 
          };
          
          // Clone the chat and add the new message
          const updatedChatInStore = { 
            ...activeChat,
            messages: [...(activeChat.messages || []), newMessage],
            title: updatedChat.title, // Use the title from the database
            updatedAt: timestamp
          };
          
          // Update the chat in our state
          const updatedChats = state.chats.map(c => 
            c.id === chatId ? updatedChatInStore : c
          );
          
          return { ...state, chats: updatedChats };
        });
        
        return messageId;
      } catch (error) {
        console.error('Error adding message:', error);
        return null;
      }
    },
    
    // Update a message in a chat
    updateMessage: async (chatId: string, messageId: string, updates: Partial<Message>) => {
      if (!browser) return;
      
      try {
        // First verify we have the message in our local state
        const state = get({ subscribe });
        const chat = state.chats.find(c => c.id === chatId);
        if (!chat) {
          console.error(`Cannot update message - chat ${chatId} not found in local state`);
          return;
        }
        
        const message = chat.messages.find(m => m.id === messageId);
        if (!message) {
          console.error(`Cannot update message - message ${messageId} not found in local state`);
          return;
        }
        
        // Make sure we don't send chatId in the updates
        const messageUpdates = {...updates};
        if ('chatId' in messageUpdates) {
          delete messageUpdates.chatId;
        }
        
        // Update the message in the database
        await db.updateMessage(messageId, messageUpdates);
        
        // Update our local store
        update(state => {
          const chat = state.chats.find(c => c.id === chatId);
          if (!chat) return state;
          
          const updatedChat = {
            ...chat,
            messages: chat.messages.map(msg => 
              msg.id === messageId ? { ...msg, ...messageUpdates } : msg
            ),
            updatedAt: Date.now(),
          };
          
          const updatedChats = state.chats.map(c => 
            c.id === chatId ? updatedChat : c
          );
          
          return { ...state, chats: updatedChats };
        });
      } catch (error) {
        console.error('Error updating message:', error);
      }
    },
    
    // Update chat model
    updateChatModel: async (chatId: string, model: LLMModel) => {
      if (!browser) return;
      
      // Update the chat in the database
      await db.updateChat(chatId, { model });
      
      // Update our local store
      update(state => {
        const updatedChats = state.chats.map(chat => {
          if (chat.id === chatId) {
            return { ...chat, model, updatedAt: Date.now() };
          }
          return chat;
        });
        
        return { ...state, chats: updatedChats };
      });
    },
    
    // Initialize store
    init: async () => {
      await loadChats();
    },
  };
};

// Create and export the store
export const chatStore = createChatStore();

// Derived store for the active chat
export const activeChat = derived(
  chatStore,
  $chatStore => $chatStore.chats.find(chat => chat.id === $chatStore.activeChat) || null
); 