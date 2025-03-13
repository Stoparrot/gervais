<script lang="ts">
  import { onMount } from 'svelte';
  import { v4 as uuidv4 } from 'uuid';
  import { chatStore, activeChat } from '$lib/stores/chatStore';
  import { settingsStore } from '$lib/stores/settingsStore';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import ChatMessage from '$lib/components/ChatMessage.svelte';
  import MessageInput from '$lib/components/MessageInput.svelte';
  import Button from '$lib/components/Button.svelte';
  import Settings from '$lib/components/Settings.svelte';
  import MenuIcon from 'lucide-svelte/icons/menu';
  import SettingsIcon from 'lucide-svelte/icons/settings';
  import Paperclip from 'lucide-svelte/icons/paperclip';
  import ImageIcon from 'lucide-svelte/icons/image';
  import type { MediaItem } from '$lib/types';
  import * as openaiService from '$lib/services/llm/openai';
  import * as anthropicService from '$lib/services/llm/anthropic';
  import * as ollamaService from '$lib/services/llm/ollama';
  import * as googleService from '$lib/services/llm/google';
  
  let isMobile = false;
  let sidebarExpanded = true;
  let messageContent = '';
  let isLoading = false;
  let isStreaming = false;
  let mediaItems: MediaItem[] = [];
  let tools = { search: false };
  let messagesContainer: HTMLDivElement;
  let isSettingsOpen = false;
  
  // Detect mobile screens
  function updateIsMobile() {
    isMobile = window.innerWidth < 768;
    if (isMobile) {
      sidebarExpanded = false;
    } else {
      sidebarExpanded = true;
    }
  }
  
  onMount(() => {
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    
    return () => {
      window.removeEventListener('resize', updateIsMobile);
    };
  });
  
  // Toggle sidebar on mobile
  function toggleSidebar() {
    sidebarExpanded = !sidebarExpanded;
  }
  
  // Handle new message submission
  async function handleSubmit({ detail }: CustomEvent<{ 
    content: string; 
    media: MediaItem[];
    tools: { [key: string]: boolean };
  }>) {
    if (!$activeChat) return;
    
    // Check if API keys are set for the selected model
    const provider = $activeChat.model.provider;
    console.log('Current settings store state:', $settingsStore);
    
    if (provider === 'openai' && !$settingsStore.apiKeys?.openai) {
      console.warn('OpenAI API key not set, opening settings dialog');
      isSettingsOpen = true;
      alert('Please set your OpenAI API key in Settings to use this model.');
      return;
    } else if (provider === 'anthropic' && !$settingsStore.apiKeys?.anthropic) {
      console.warn('Anthropic API key not set, opening settings dialog');
      isSettingsOpen = true;
      alert('Please set your Anthropic API key in Settings to use this model.');
      return;
    } else if (provider === 'google' && !$settingsStore.apiKeys?.google) {
      console.warn('Google API key not set, opening settings dialog');
      isSettingsOpen = true;
      alert('Please set your Google API key in Settings to use this model.');
      return;
    }
    // Ollama is local and doesn't need API keys, so we don't check for provider === 'ollama'
    
    const { content, media, tools: activeTools } = detail;
    
    console.log('Media items in submission:', media);
    
    // Create user message
    const userMessageId = await chatStore.addMessage($activeChat.id, {
      role: 'user',
      content,
      media,
    });
    
    // Reset input state
    messageContent = '';
    mediaItems = [];
    
    // Scroll to bottom
    setTimeout(() => {
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
    
    // Create assistant message (placeholder for streaming)
    const assistantMessageId = await chatStore.addMessage($activeChat.id, {
      role: 'assistant',
      content: '',
    });
    
    // Set loading state
    isLoading = true;
    isStreaming = true;
    
    try {
      // Get all messages for context including the user message with media
      const messages = $activeChat.messages.slice(0, -1); // Exclude empty assistant message
      console.log('Sending messages to LLM with media:', messages);
      
      // Check which provider we're using
      const modelId = $activeChat.model.id;
      
      if (provider === 'anthropic') {
        // Use Anthropic API
        await anthropicService.streamCompletion(
          modelId,
          messages,
          // On chunk handler
          (text) => {
            chatStore.updateMessage($activeChat.id, assistantMessageId, {
              content: text,
            });
          },
          // On complete handler
          () => {
            isLoading = false;
            isStreaming = false;
            
            // Scroll to bottom again after response is complete
            setTimeout(() => {
              if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
              }
            }, 100);
          },
          // On error handler
          (error) => {
            console.error('Error generating response:', error);
            chatStore.updateMessage($activeChat.id, assistantMessageId, {
              content: `Error generating response: – ${error.message}`,
            });
            isLoading = false;
            isStreaming = false;
          },
          // On thinking handler (Claude specific)
          (thinking) => {
            chatStore.updateMessage($activeChat.id, assistantMessageId, {
              thinking,
            });
          }
        );
      } 
      else if (provider === 'openai') {
        // Use OpenAI API
        if (isStreaming) {
          await openaiService.streamCompletion(
            modelId,
            messages,
            // On chunk handler
            (chunk) => {
              chatStore.updateMessage($activeChat.id, assistantMessageId, {
                content: chunk,
              });
            },
            // On complete handler
            () => {
              isLoading = false;
              isStreaming = false;
              
              // Scroll to bottom again after response is complete
              setTimeout(() => {
                if (messagesContainer) {
                  messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
              }, 100);
            },
            // On error handler
            (error) => {
              console.error('Error generating response from OpenAI:', error);
              const errorMessage = error.message || 'An unknown error occurred';
              
              // Show full error details instead of assuming it's an API key issue
              chatStore.updateMessage($activeChat.id, assistantMessageId, {
                content: `Error: ${errorMessage}`,
              });
              isLoading = false;
              isStreaming = false;
            }
          );
        } else {
          // Non-streaming completion
          try {
            const response = await openaiService.completion(modelId, messages);
            chatStore.updateMessage($activeChat.id, assistantMessageId, {
              content: response,
            });
            isLoading = false;
          } catch (error) {
            console.error('Error generating non-streaming response from OpenAI:', error);
            const errorMessage = error.message || 'An unknown error occurred';
            
            // Show full error details
            chatStore.updateMessage($activeChat.id, assistantMessageId, {
              content: `Error: ${errorMessage}`,
            });
            isLoading = false;
            throw error; // Rethrow to exit the function
          }
        }
      }
      else if (provider === 'google') {
        // Use Google API
        await googleService.streamCompletion(
          modelId,
          messages,
          // On chunk handler - updated to handle both text and media
          (text, media) => {
            chatStore.updateMessage($activeChat.id, assistantMessageId, {
              content: text,
              media: media, // Add received media items to the message
            });
          },
          // On complete handler
          () => {
            isLoading = false;
            isStreaming = false;
            
            // Scroll to bottom again after response is complete
            setTimeout(() => {
              if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
              }
            }, 100);
          },
          // On error handler
          (error) => {
            console.error('Error generating response from Google:', error);
            const errorMessage = error.message || 'An unknown error occurred';
            
            // Show full error details
            chatStore.updateMessage($activeChat.id, assistantMessageId, {
              content: `Error: ${errorMessage}`,
            });
            isLoading = false;
            isStreaming = false;
          },
          // On thinking handler (Google specific)
          (thinking) => {
            chatStore.updateMessage($activeChat.id, assistantMessageId, {
              thinking,
            });
          }
        );
      }
      else if (provider === 'ollama') {
        // Use Ollama API for local models
        try {
          await ollamaService.streamCompletion(
            modelId,
            messages,
            // On chunk handler
            (chunk) => {
              chatStore.updateMessage($activeChat.id, assistantMessageId, {
                content: chunk,
              });
            },
            // On complete handler
            () => {
              isLoading = false;
              isStreaming = false;
              
              // Scroll to bottom again after response is complete
              setTimeout(() => {
                if (messagesContainer) {
                  messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }
              }, 100);
            },
            // On error handler
            (error) => {
              console.error('Error generating response from Ollama:', error);
              const errorMessage = error.message || 'An unknown error occurred';
              
              // Show full error details
              chatStore.updateMessage($activeChat.id, assistantMessageId, {
                content: `Error connecting to Ollama: ${errorMessage}. Make sure Ollama is running locally.`,
              });
              isLoading = false;
              isStreaming = false;
            }
          );
        } catch (error) {
          console.error('Error generating response from Ollama:', error);
          throw error; // Rethrow to let the main error handler deal with it
        }
      }
      else {
        // Fallback to dummy response for other providers
        let response = '';
        const words = 'This is a placeholder response. Please set up your API keys in Settings to use actual LLM services.'.split(' ');
        
        for (const word of words) {
          await new Promise(resolve => setTimeout(resolve, 50));
          response += word + ' ';
          
          // Update the message with the partial response
          chatStore.updateMessage($activeChat.id, assistantMessageId, {
            content: response.trim(),
          });
        }
        
        isLoading = false;
        isStreaming = false;
      }
    } catch (error) {
      console.error('Error generating response:', error);
      // Only update message if it hasn't already been updated by the specific error handlers
      if (isLoading) {
        const errorMessage = error.message || 'An unknown error occurred';
        chatStore.updateMessage($activeChat.id, assistantMessageId, {
          content: `Error: ${errorMessage}`,
        });
        isLoading = false;
        isStreaming = false;
      }
    }
  }
  
  // Handle file upload
  function handleFileUpload(files: File[]) {
    // Process each file
    files.forEach(async (file) => {
      const id = uuidv4();
      const name = file.name;
      const size = file.size;
      let type: 'image' | 'audio' | 'video' | 'document' | 'text' | 'other' = 'other';
      let preview: string | undefined;
      let fileId: string | undefined;
      
      console.log(`Processing file: ${name}, type: ${file.type}, size: ${size} bytes`);
      
      // Function to determine if a file is a document based on MIME type or extension
      const isDocument = (file: File) => {
        // Check by MIME type first
        if (
          file.type.includes('pdf') ||
          file.type.includes('word') ||
          file.type.includes('excel') ||
          file.type.includes('spreadsheet') ||
          file.type.includes('presentation') ||
          file.type.includes('officedocument') ||
          file.type.includes('application/rtf') ||
          file.type.includes('text/rtf')
        ) {
          return true;
        }
        
        // Fallback to extension check if MIME type is generic or empty
        if (!file.type || file.type === 'application/octet-stream') {
          const ext = name.split('.').pop()?.toLowerCase();
          return ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'rtf', 'odt', 'ods', 'odp', 'csv'].includes(ext || '');
        }
        
        return false;
      };
      
      // Determine file type
      if (file.type.startsWith('image/')) {
        type = 'image';
        // Create a data URL for the image that can be sent to LLMs
        try {
          preview = await fileToDataURL(file);
          console.log(`Created data URL for image ${name} (length: ${preview.length} chars)`);
        } catch (error) {
          console.error(`Failed to create data URL for ${name}:`, error);
        }
      } else if (file.type.startsWith('audio/')) {
        type = 'audio';
      } else if (file.type.startsWith('video/')) {
        type = 'video';
      } else if (file.type.startsWith('text/')) {
        type = 'text';
      } else if (isDocument(file)) {
        type = 'document';
        
        // For OpenAI models, try to upload the document to their API
        if ($activeChat && $activeChat.model.provider === 'openai') {
          try {
            fileId = await openaiService.uploadFile(file);
            console.log(`Document ${name} uploaded to OpenAI with ID: ${fileId}`);
          } catch (error) {
            console.error(`Failed to upload document to OpenAI: ${error.message}`);
            alert(`Failed to upload document to OpenAI: ${error.message}`);
          }
        }
        
        // Still create a data URL preview for UI display
        try {
          preview = await fileToDataURL(file);
          console.log(`Created data URL for document ${name}, mime type: ${file.type}`);
          console.log(`Document data URL length: ${preview.length} chars`);
          
          // Check file size for warning if it's large
          if (size > 5 * 1024 * 1024) { // 5MB
            console.warn(`Warning: Large document (${(size / (1024 * 1024)).toFixed(2)}MB) may cause issues with API limits`);
          }
        } catch (error) {
          console.error(`Failed to create data URL for ${name}:`, error);
        }
      }
      
      // Create MediaItem
      const mediaItem: MediaItem = {
        id,
        type,
        name,
        preview,
        size,
        timestamp: Date.now(),
        fileId // Store the OpenAI file ID if available
      };
      
      console.log(`Adding media item: ${type} ${name}`);
      
      // Add to media items
      mediaItems = [
        ...mediaItems,
        mediaItem
      ];
    });
  }
  
  // Convert file to dataURL
  async function fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        reject(error);
      };
      reader.readAsDataURL(file);
    });
  }
  
  // Toggle tools
  function handleToggleTool({ detail }: CustomEvent<{ tool: string; enabled: boolean }>) {
    const { tool, enabled } = detail;
    tools = { ...tools, [tool]: enabled };
  }
  
  // Audio capture
  function handleStartAudioCapture() {
    // TODO: Implement audio capture
    console.log('Start audio capture');
  }
  
  function handleStopAudioCapture() {
    // TODO: Implement audio capture
    console.log('Stop audio capture');
  }
  
  // Video capture
  function handleStartVideoCapture() {
    // TODO: Implement video capture
    console.log('Start video capture');
  }
  
  function handleStopVideoCapture() {
    // TODO: Implement video capture
    console.log('Stop video capture');
  }
</script>

<div class="chat-container">
  <Sidebar
    {isMobile}
    isExpanded={sidebarExpanded}
    on:toggleSidebar={({ detail }) => (sidebarExpanded = detail)}
  />
  
  {#if isMobile && sidebarExpanded}
    <div 
      class="sidebar-backdrop" 
      on:click={() => (sidebarExpanded = false)}
      on:keydown={(e) => e.key === 'Escape' && (sidebarExpanded = false)}
      role="button"
      tabindex="0"
      aria-label="Close sidebar"
    ></div>
  {/if}
  
  <main class="chat-main">
    <header class="chat-header">
      {#if isMobile}
        <Button
          variant="icon"
          on:click={toggleSidebar}
          aria-label="Open menu"
        >
          <MenuIcon size={20} />
        </Button>
      {/if}
      
      <h1 class="chat-title">
        {$activeChat?.title || 'New Chat'}
      </h1>
      
      <Button
        variant="icon"
        on:click={() => isSettingsOpen = true}
        aria-label="Open settings"
      >
        <SettingsIcon size={20} />
      </Button>
    </header>
    
    <div class="chat-messages" bind:this={messagesContainer}>
      {#if $activeChat && $activeChat.messages.length > 0}
        {#each $activeChat.messages as message, i}
          <ChatMessage
            {message}
            isStreaming={isStreaming && i === $activeChat.messages.length - 1 && message.role === 'assistant'}
            scrollToBottom={i === $activeChat.messages.length - 1}
          />
        {/each}
      {:else}
        <div class="empty-state">
          <h2>Start a new conversation</h2>
          <p>Send a message to start chatting with the AI assistant.</p>
          <div class="feature-highlights">
            <div class="feature">
              <Paperclip size={16} />
              <span>Attach files for analysis</span>
            </div>
            <div class="feature">
              <ImageIcon size={16} />
              <span>Vision support for images</span>
            </div>
          </div>
        </div>
      {/if}
    </div>
    
    <div class="input-container">
      <MessageInput
        bind:value={messageContent}
        bind:mediaItems
        {tools}
        disabled={isLoading}
        placeholder="Send a message..."
        on:submit={handleSubmit}
        on:uploadFile={(e) => handleFileUpload(e.detail)}
        on:toggleTool={handleToggleTool}
        on:startAudioCapture={handleStartAudioCapture}
        on:stopAudioCapture={handleStopAudioCapture}
        on:startVideoCapture={handleStartVideoCapture}
        on:stopVideoCapture={handleStopVideoCapture}
      />
    </div>
  </main>
</div>

<Settings isOpen={isSettingsOpen} on:close={() => isSettingsOpen = false} />

<style lang="scss">
  .chat-container {
    display: flex;
    height: 100vh;
    width: 100%;
    overflow: hidden;
  }
  
  .sidebar-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 90;
  }
  
  .chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .chat-header {
    display: flex;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    gap: 1rem;
  }
  
  .chat-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    
    @media (min-width: 768px) {
      padding: 2rem;
    }
  }
  
  .input-container {
    padding: 1rem;
    border-top: 1px solid var(--border-color);
    padding-bottom: calc(1rem + var(--sab));
    position: relative;
    z-index: 10;
    background-color: var(--bg-color);
    
    @media (min-width: 768px) {
      padding: 1.5rem 2rem;
      padding-bottom: calc(1.5rem + var(--sab));
    }
  }
  
  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    opacity: 0.7;
    padding: 2rem;
    
    h2 {
      margin: 0 0 0.5rem;
      font-size: 1.5rem;
      font-weight: 500;
    }
    
    p {
      margin: 0 0 1.5rem;
      font-size: 1rem;
      max-width: 500px;
    }
    
    .feature-highlights {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 1rem;
      
      .feature {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
      }
    }
  }
</style>
