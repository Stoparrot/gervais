<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { chatStore, activeChat } from '$lib/stores/chatStore';
  import { allModels, cloudModels, localModels, allModelsStore, localModelsStore, initializeModels } from '$lib/services/llm/models';
  import { anthropicModels } from '$lib/services/llm/anthropic';
  import { openaiModels } from '$lib/services/llm/openai';
  import { googleModels } from '$lib/services/llm/google';
  import type { LLMModel } from '$lib/types';
  import { X, ChevronLeft, MessageSquare } from 'lucide-svelte';
  import Plus from 'lucide-svelte/icons/plus';
  import Button from './Button.svelte';
  
  export let isMobile = false;
  export let isExpanded = true;
  
  const dispatch = createEventDispatcher<{
    toggleSidebar: boolean;
  }>();
  
  let selectedModelId = $activeChat?.model.id || 'claude-3-5-sonnet';
  
  onMount(async () => {
    // Initialize local models on component mount
    await initializeModels();
  });
  
  // Update the selected model when active chat changes
  $: if ($activeChat) {
    selectedModelId = $activeChat.model.id;
  }
  
  function handleNewChat() {
    // Find the model by ID using the reactive store value
    const selectedModel = $allModelsStore.find(model => model.id === selectedModelId);
    if (selectedModel) {
      chatStore.createNewChat(selectedModel);
    }
  }
  
  function handleSelectChat(chatId: string) {
    chatStore.selectChat(chatId);
    if (isMobile) {
      dispatch('toggleSidebar', false);
    }
  }
  
  function handleDeleteChat(chatId: string, event: Event) {
    event.stopPropagation();
    chatStore.deleteChat(chatId);
  }
  
  function handleModelChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    selectedModelId = select.value;
    
    // Update the model of the active chat if there is one
    if ($activeChat) {
      const newModel = $allModelsStore.find(model => model.id === selectedModelId);
      if (newModel) {
        chatStore.updateChatModel($activeChat.id, newModel);
      }
    }
  }
  
  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  }
</script>

<aside class="sidebar" class:expanded={isExpanded}>
  <div class="sidebar-header">
    <div class="logo-container">
      <MessageSquare size={24} color="var(--accent-color)" />
      <h2>Gervais</h2>
    </div>
    
    {#if isMobile}
      <Button
        variant="icon"
        size="sm"
        class="collapse-button"
        on:click={() => dispatch('toggleSidebar', !isExpanded)}
        aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <ChevronLeft size={20} />
      </Button>
    {/if}
  </div>
  
  <div class="sidebar-content">
    <div class="model-selector">
      <select 
        value={selectedModelId} 
        on:change={handleModelChange}
        class="select-styled"
      >
        {#if $localModelsStore.length > 0}
          <optgroup label="Local Models">
            {#each $localModelsStore as model}
              <option value={model.id}>{model.name}</option>
            {/each}
          </optgroup>
        {/if}
        
        <optgroup label="OpenAI Models">
          {#each openaiModels as model}
            <option value={model.id}>{model.name}</option>
          {/each}
        </optgroup>
        
        <optgroup label="Google Models">
          {#each googleModels as model}
            <option value={model.id}>{model.name}</option>
          {/each}
        </optgroup>
        
        <optgroup label="Anthropic Models (Disabled)">
          {#each anthropicModels as model}
            <option value={model.id} disabled>{model.name}</option>
          {/each}
        </optgroup>
      </select>
    </div>
    
    <Button
      variant="primary"
      size="md"
      fullWidth
      on:click={handleNewChat}
      class="new-chat-button"
    >
      <Plus size={16} />
      <span>New Chat</span>
    </Button>
    
    <div class="chats-list">
      {#each $chatStore.chats as chat}
        <button
          type="button"
          class="chat-item"
          class:active={chat.id === $activeChat?.id}
          on:click={() => handleSelectChat(chat.id)}
        >
          <span class="chat-title">{chat.title || 'New Chat'}</span>
          <Button
            variant="icon"
            size="sm"
            on:click={(e) => handleDeleteChat(chat.id, e)}
            aria-label="Delete chat"
          >
            <X size={16} />
          </Button>
        </button>
      {/each}
    </div>
  </div>
</aside>

<style lang="scss">
  .sidebar {
    width: 300px;
    height: 100%;
    background-color: var(--bg-color);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    transition: transform 0.2s ease;
    
    @media (max-width: 768px) {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      z-index: 100;
      transform: translateX(-100%);
      width: 85%;
      max-width: 320px;
      padding-top: env(safe-area-inset-top);
      
      &.expanded {
        transform: translateX(0);
      }
    }
  }
  
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    
    .logo-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      
      h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
      }
    }
  }
  
  .sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .model-selector {
    display: flex;
    gap: 0.5rem;
    
    select.select-styled {
      flex: 1;
      padding: 0.5rem;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      background-color: var(--bg-color);
      color: var(--text-color);
      font-size: 0.875rem;
      appearance: none;
      background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
      background-repeat: no-repeat;
      background-position: right 0.5rem center;
      background-size: 1em;
      text-align: center;
      padding-left: 24px;
      padding-right: 24px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &:focus {
        outline: none;
        border-color: var(--accent-color);
      }
      
      /* Style for option groups */
      optgroup {
        font-weight: 600;
        color: var(--text-color);
        background-color: var(--bg-color);
        border-bottom: 1px solid var(--border-color);
        text-align: center;
      }
      
      option {
        text-align: center;
      }
    }
  }
  
  :global(.new-chat-button) {
    border-radius: 12px;
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.6rem 0;
    border-width: 2px;
    
    span {
      font-size: 0.875rem;
    }
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 3px 5px rgba(0, 0, 0, 0.15);
      background-color: color-mix(in srgb, var(--accent-color) 90%, white 10%);
    }
    
    &:active {
      transform: translateY(0);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
  }
  
  .chats-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow-y: auto;
  }
  
  .chat-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    background-color: var(--bg-color);
    border: none;
    width: 100%;
    text-align: left;
    font-family: inherit;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    
    &:hover {
      background-color: color-mix(in srgb, var(--text-color) 5%, transparent);
      transform: translateY(-1px);
    }
    
    &.active {
      background-color: color-mix(in srgb, var(--accent-color) 15%, transparent);
      
      .chat-title {
        color: var(--accent-color);
        font-weight: 600;
      }
    }
    
    .chat-title {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.875rem;
      font-weight: 500;
    }
  }
</style> 