<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import SendIcon from 'lucide-svelte/icons/send';
  import MicIcon from 'lucide-svelte/icons/mic';
  import CameraIcon from 'lucide-svelte/icons/camera';
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
    if (event.key === 'Enter' && !event.shiftKey) {
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
  
  <div class="input-container">
    <textarea
      bind:this={inputElement}
      bind:value
      {placeholder}
      {disabled}
      on:keydown={handleKeydown}
      rows="1"
    ></textarea>
    
    <div class="actions">
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
          <CameraIcon size={18} />
        </div>
      </Button>
      
      <Button
        variant="icon"
        size="sm"
        disabled={disabled || (!value.trim() && mediaItems.length === 0)}
        on:click={handleSubmit}
        aria-label="Send message"
      >
        <SendIcon size={18} />
      </Button>
    </div>
  </div>
  
  <div class="tools-bar">
    {#each Object.entries(tools) as [tool, enabled]}
      <button
        type="button"
        class="tool-button"
        class:enabled
        on:click={() => toggleTool(tool)}
        aria-label="Toggle {tool}"
      >
        {tool}
      </button>
    {/each}
  </div>
</div>

<style lang="scss">
  .message-input-container {
    position: relative;
    border-radius: 8px;
    background-color: var(--input-bg);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    margin-bottom: var(--sab, 0px); /* Add margin to account for iOS bottom bar */
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .tools-bar {
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
    overflow-x: auto;
    flex-wrap: wrap;
    
    &:empty {
      display: none;
    }
    
    .tool-button {
      padding: 4px 8px;
      border-radius: 4px;
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
      width: 80px;
      height: 80px;
      border-radius: 4px;
      overflow: hidden;
      
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
        padding: 4px;
        font-size: 0.7rem;
        text-align: center;
        word-break: break-word;
      }
      
      .remove-media {
        position: absolute;
        top: 2px;
        right: 2px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: rgba(0, 0, 0, 0.6);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
      }
    }
  }
  
  .input-container {
    display: flex;
    padding: 8px 12px;
    align-items: flex-end;
    gap: 8px;
    
    textarea {
      flex: 1;
      resize: none;
      border: none;
      outline: none;
      background: transparent;
      min-height: 24px;
      max-height: 200px;
      padding: 0;
      font-family: inherit;
      font-size: 1rem;
      color: var(--text-color);
      
      &:disabled {
        opacity: 0.7;
      }
      
      @media (max-width: 768px) {
        font-size: 1.0625rem; /* Slightly larger on mobile */
        min-height: 27px;
      }
    }
    
    .actions {
      display: flex;
      gap: 4px;
      align-items: center;
      
      :global(.active) {
        color: var(--accent-color);
      }
      
      @media (max-width: 768px) {
        gap: 6px; /* Slightly larger gap on mobile */
        
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
  }
</style> 