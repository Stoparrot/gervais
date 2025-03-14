<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import SendIcon from 'lucide-svelte/icons/send';
  import MicIcon from 'lucide-svelte/icons/mic';
  import VideoIcon from 'lucide-svelte/icons/video';
  import GlobeIcon from 'lucide-svelte/icons/globe';
  import Paperclip from 'lucide-svelte/icons/paperclip';
  import Button from './Button.svelte';
  import type { MediaItem } from '$lib/types';
  import { activeChat } from '$lib/stores/chatStore';
  
  export let value = '';
  export let placeholder = 'Send a message...';
  export let disabled = false;
  export let isRecording = false;
  export let isCapturingVideo = false;
  export let mediaItems: MediaItem[] = [];
  export let tools: { [key: string]: boolean } = {};
  
  const dispatch = createEventDispatcher<{
    submit: { content: string; media: MediaItem[]; tools: { [key: string]: boolean } };
    startAudioCapture: void;
    stopAudioCapture: void;
    startVideoCapture: void;
    stopVideoCapture: void;
    uploadFile: File[];
    toggleTool: { tool: string; enabled: boolean };
  }>();
  
  let inputElement: HTMLTextAreaElement;
  let isMobile = false;
  
  onMount(() => {
    // Check if on mobile device
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  });
  
  function checkMobile() {
    isMobile = window.innerWidth < 768;
  }
  
  // Auto-resize the textarea based on content
  function autoResize() {
    if (inputElement) {
      inputElement.style.height = 'auto';
      inputElement.style.height = `${Math.min(inputElement.scrollHeight, 200)}px`;
    }
  }
  
  // Handle form submission
  function handleSubmit() {
    if (disabled || (!value.trim() && mediaItems.length === 0)) return;
    
    dispatch('submit', {
      content: value.trim(),
      media: mediaItems,
      tools,
    });
    
    // Reset the input
    value = '';
    if (inputElement) {
      inputElement.style.height = 'auto';
    }
  }
  
  // Handle keyboard events
  function handleKeydown(event: KeyboardEvent) {
    // Always allow Return key to add a new line, never send the message with Enter key on mobile
    if (event.key === 'Enter' && !event.shiftKey && !isMobile) {
      event.preventDefault();
      handleSubmit();
    }
  }
  
  // Toggle audio recording
  function toggleAudioRecording() {
    if (isRecording) {
      dispatch('stopAudioCapture');
    } else {
      dispatch('startAudioCapture');
    }
  }
  
  // Toggle video capture
  function toggleVideoCapture() {
    if (isCapturingVideo) {
      dispatch('stopVideoCapture');
    } else {
      dispatch('startVideoCapture');
    }
  }
  
  // Handle file upload
  function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      dispatch('uploadFile', files);
      // Reset input
      input.value = '';
    }
  }
  
  // Handle tool toggle
  function toggleTool(tool: string) {
    const newState = !tools[tool];
    dispatch('toggleTool', { tool, enabled: newState });
  }
  
  // Update textarea height when value changes
  $: if (inputElement) {
    autoResize();
  }
</script>

<div class="message-input-container">
  <div class="media-preview">
    {#each mediaItems as media}
      <div class="media-item">
        {#if media.type === 'image' && media.preview}
          <img src={media.preview} alt={media.name} />
        {:else}
          <div class="file-preview">
            <span>{media.name}</span>
          </div>
        {/if}
        <button
          type="button"
          class="remove-media"
          aria-label="Remove media"
          on:click={() => {
            mediaItems = mediaItems.filter(m => m.id !== media.id);
          }}
        >
          &times;
        </button>
      </div>
    {/each}
  </div>
  
  <div class="input-bubble">
    <div class="input-container">
      <textarea
        bind:this={inputElement}
        bind:value
        {placeholder}
        {disabled}
        on:keydown={handleKeydown}
        on:input={autoResize}
        rows="2"
      ></textarea>
    </div>
    
    <div class="actions-bar">
      <div class="left-actions">
        <input
          type="file"
          id="file-upload"
          hidden
          on:change={handleFileUpload}
          accept="image/*,audio/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,application/rtf,text/rtf,application/vnd.oasis.opendocument.text,application/vnd.oasis.opendocument.spreadsheet,application/vnd.oasis.opendocument.presentation"
          multiple
        />
        
        <Button
          variant="icon"
          size="sm"
          disabled={disabled}
          on:click={() => document.getElementById('file-upload')?.click()}
          aria-label="Upload file"
        >
          <Paperclip size={18} />
        </Button>
        
        <Button
          variant="icon"
          size="sm"
          disabled={disabled || isRecording}
          on:click={toggleAudioRecording}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <div class:active={isRecording}>
            <MicIcon size={18} />
          </div>
        </Button>
        
        <Button
          variant="icon"
          size="sm"
          disabled={disabled || isRecording}
          on:click={toggleVideoCapture}
          aria-label={isCapturingVideo ? 'Stop video capture' : 'Start video capture'}
        >
          <div class:active={isCapturingVideo}>
            <VideoIcon size={18} />
          </div>
        </Button>
        
        <Button
          variant="icon"
          size="sm"
          on:click={() => toggleTool('search')}
          aria-label="Toggle web search"
        >
          <div class:active={tools.search}>
            <GlobeIcon size={18} />
          </div>
        </Button>
      </div>
      
      <div class="right-actions">
        <Button
          variant="icon"
          size="sm"
          disabled={disabled || (!value.trim() && mediaItems.length === 0)}
          on:click={handleSubmit}
          class="send-button"
          aria-label="Send message"
        >
          <SendIcon size={18} />
        </Button>
      </div>
    </div>
  </div>
  
  <div class="tools-bar">
    {#each Object.entries(tools) as [tool, enabled]}
      {#if tool !== 'search'} <!-- Don't show search in buttons since we now have an icon -->
        <button
          type="button"
          class="tool-button"
          class:enabled
          on:click={() => toggleTool(tool)}
          aria-label="Toggle {tool}"
        >
          {tool}
        </button>
      {/if}
    {/each}
  </div>
</div>

<style lang="scss">
  .message-input-container {
    position: relative;
    margin-bottom: var(--sab, 0px); /* Add margin to account for iOS bottom bar */
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
    
    @media (max-width: 768px) {
      gap: 4px; /* Smaller gap on mobile to save space */
      padding-bottom: env(safe-area-inset-bottom, 0px); /* iOS safe area support */
    }
  }
  
  .input-bubble {
    display: flex;
    flex-direction: column;
    width: 100%;
    background-color: var(--input-bg);
    border-radius: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    padding: 8px 8px;
    
    @media (max-width: 768px) {
      border-radius: 18px; /* Slightly smaller radius on mobile */
      margin: 0 4px; /* Add some side margin on mobile */
      padding: 6px 6px; /* Smaller padding on mobile */
    }
  }
  
  .actions-bar {
    display: flex;
    padding: 4px 8px;
    justify-content: space-between;
    align-items: center;
    
    .left-actions {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    
    .right-actions {
      display: flex;
      align-items: center;
    }
    
    :global(.active) {
      color: var(--accent-color);
    }
    
    @media (max-width: 768px) {      
      :global(button) {
        width: 34px; /* Larger button size on mobile */
        height: 34px;
        
        :global(svg) {
          width: 21px; /* Larger icons on mobile */
          height: 21px;
        }
      }
    }
  }
  
  .tools-bar {
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    overflow-x: auto;
    flex-wrap: wrap;
    
    &:empty {
      display: none;
    }
    
    .tool-button {
      padding: 4px 8px;
      border-radius: 15px;
      font-size: 0.8rem;
      background-color: var(--highlight-bg);
      border: 1px solid var(--border-color);
      
      &.enabled {
        background-color: var(--accent-color);
        color: white;
        border-color: var(--accent-color);
      }
      
      @media (max-width: 768px) {
        padding: 5px 10px;
        font-size: 0.875rem;
      }
    }
  }
  
  .media-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 12px;
    
    &:empty {
      display: none;
    }
    
    .media-item {
      position: relative;
      border-radius: 6px;
      overflow: hidden;
      width: 80px;
      height: 80px;
      
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      
      .file-preview {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--highlight-bg);
        padding: 8px;
        font-size: 0.8rem;
        text-align: center;
        word-break: break-word;
        color: var(--text-color);
      }
      
      .remove-media {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: rgba(0, 0, 0, 0.6);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        line-height: 1;
        border: none;
        cursor: pointer;
        
        &:hover {
          background-color: rgba(0, 0, 0, 0.8);
        }
      }
    }
  }
  
  .input-container {
    display: flex;
    padding: 4px 8px;
    
    @media (max-width: 768px) {
      padding: 3px 6px; /* Smaller padding on mobile */
    }
    
    textarea {
      flex: 1;
      resize: none;
      border: none;
      outline: none;
      background: transparent;
      min-height: 48px; /* Increased to accommodate at least two lines */
      max-height: 200px; /* Increased to allow more expansion */
      padding: 6px;
      font-family: inherit;
      font-size: 1rem;
      color: var(--text-color);
      width: 100%;
      line-height: 1.4; /* Added to ensure proper line spacing */
      
      &:disabled {
        opacity: 0.7;
      }
      
      @media (max-width: 768px) {
        font-size: 1.0625rem; /* Slightly larger on mobile */
        min-height: 52px; /* Increased for mobile */
        padding: 4px; /* Smaller padding on mobile */
      }
    }
  }
  
  .right-actions {
    display: flex;
    align-items: center;
    
    :global(.send-button) {
      background-color: var(--accent-color-light, rgba(0, 0, 0, 0.1));
      color: var(--accent-color, #3b82f6);
      border-radius: 50%;
      transition: background-color 0.2s ease, transform 0.2s ease;
      
      &:hover:not(:disabled) {
        background-color: var(--accent-color-light-hover, rgba(0, 0, 0, 0.15));
        transform: scale(1.05);
      }
      
      &:active:not(:disabled) {
        transform: scale(0.95);
      }
      
      &:disabled {
        opacity: 0.5;
        background-color: var(--accent-color-light, rgba(0, 0, 0, 0.05));
      }
    }
  }
</style> 