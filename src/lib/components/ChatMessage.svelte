<script lang="ts">
  import { onMount } from 'svelte';
  import type { Message, MediaItem } from '$lib/types';
  import Markdown from './Markdown.svelte';
  import ImageModal from './ImageModal.svelte';
  
  export let message: Message;
  export let isStreaming = false;
  export let scrollToBottom = false;
  
  // Formatted timestamp
  $: formattedTime = new Date(message.timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  // Class for message container
  $: messageClass = `message ${message.role}`;
  
  // Image modal state
  let showImageModal = false;
  let modalImageUrl = '';
  let modalAltText = '';
  
  // Auto scroll to bottom when content changes and scrollToBottom is true
  let container: HTMLDivElement;
  onMount(() => {
    if (scrollToBottom && container) {
      const parentElement = container.parentElement;
      if (parentElement) {
        parentElement.scrollTop = parentElement.scrollHeight;
      }
    }
  });
  
  // Utility functions
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function openImagePreview(imageUrl: string, altText: string = 'Preview image') {
    // Instead of opening in a new tab, show the modal
    modalImageUrl = imageUrl;
    modalAltText = altText;
    showImageModal = true;
  }
  
  function closeImageModal() {
    showImageModal = false;
  }
</script>

<div class={messageClass} bind:this={container}>
  {#if message.role === 'user'}
    <div class="message-bubble">
      <div class="content">
        <p>{message.content}</p>
      </div>
      
      {#if message.media && message.media.length > 0}
        <div class="media-container">
          {#each message.media as media, i}
            {#if media.type === 'image'}
              <button
                type="button"
                class="media-preview-button"
                on:click={() => {
                  if (!media.preview) return;
                  openImagePreview(media.preview, `Image ${i + 1}`);
                }}
                on:keydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!media.preview) return;
                    openImagePreview(media.preview, `Image ${i + 1}`);
                  }
                }}
              >
                <img
                  src={media.preview}
                  alt="Image {i + 1}"
                  class="media-preview"
                />
              </button>
            {:else if media.type === 'audio'}
              <audio controls src={media.preview} class="media-preview">
                Your browser does not support the audio element.
              </audio>
            {:else if media.type === 'video'}
              <video controls src={media.preview} class="media-preview">
                <track kind="captions" src="" label="English captions" />
                Your browser does not support the video element.
              </video>
            {:else if media.type === 'document'}
              <div class="document-file" role="button" tabindex="0">
                <div class="file-icon">📄</div>
                <div class="file-info">
                  <div class="file-name">{media.name || 'Document'}</div>
                  {#if media.size}
                    <div class="file-size">{formatBytes(media.size)}</div>
                  {/if}
                  <div class="file-status">
                    {#if media.fileId}
                      <span class="document-status success">✓ Uploaded to OpenAI (ID: {media.fileId.substring(0, 8)}...)</span>
                    {:else if media.preview}
                      {#if message.role === 'user'}
                        <span class="document-status info">Document attached</span>
                      {:else if message.role === 'assistant'}
                        <span class="document-status success">Document processed</span>
                      {:else}
                        <span class="document-status info">Document</span>
                      {/if}
                    {:else}
                      <span class="document-status error">Failed to process document</span>
                    {/if}
                  </div>
                </div>
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  {:else if message.role === 'assistant'}
    <div class="content">
      <Markdown content={message.content} {scrollToBottom} />
      
      {#if message.media && message.media.length > 0}
        <div class="media-container assistant-media">
          {#each message.media as media, i}
            {#if media.type === 'image'}
              <button
                type="button"
                class="media-preview-button"
                on:click={() => {
                  if (!media.preview) return;
                  openImagePreview(media.preview, `Generated image ${i + 1}`);
                }}
                on:keydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!media.preview) return;
                    openImagePreview(media.preview, `Generated image ${i + 1}`);
                  }
                }}
              >
                <img
                  src={media.preview}
                  alt="Generated image {i + 1}"
                  class="media-preview assistant-image"
                />
                <div class="image-caption">Click to view full size</div>
              </button>
            {:else if media.type === 'audio'}
              <audio controls src={media.preview} class="media-preview">
                Your browser does not support the audio element.
              </audio>
            {:else if media.type === 'video'}
              <video controls src={media.preview} class="media-preview">
                <track kind="captions" src="" label="English captions" />
                Your browser does not support the video element.
              </video>
            {/if}
          {/each}
        </div>
      {/if}
      
      {#if message.thinking}
        <details class="thinking">
          <summary>Show thinking</summary>
          <div class="thinking-content">
            <Markdown content={message.thinking} scrollToBottom={false} />
          </div>
        </details>
      {/if}
      
      {#if isStreaming}
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      {/if}
    </div>
  {:else if message.role === 'system'}
    <div class="content system-message">
      <Markdown content={message.content} {scrollToBottom} />
    </div>
  {/if}
  
  {#if message.role === 'user'}
    <div class="timestamp">{formattedTime}</div>
  {/if}
</div>

<!-- Image Modal Component -->
<ImageModal 
  imageUrl={modalImageUrl} 
  altText={modalAltText} 
  isOpen={showImageModal} 
  on:close={closeImageModal} 
/>

<style lang="scss">
  .message {
    display: flex;
    flex-direction: column;
    margin-bottom: 1.5rem;
    position: relative;
    max-width: 85%;
    
    &.user {
      align-self: flex-end;
      
      .message-bubble {
        background-color: var(--user-message-bg);
        border-radius: 16px 16px 0 16px;
        align-self: flex-end;
        
        .content {
          padding: 0.75rem 1rem;
        }
      }
      
      .timestamp {
        align-self: flex-end;
      }
    }
    
    &.assistant {
      align-self: flex-start;
      width: 100%;
      
      .content {
        background-color: var(--assistant-message-bg);
        border-radius: 16px;
        padding: 1rem;
        width: 100%;
      }
    }
    
    &.system {
      align-self: center;
      max-width: 90%;
      
      .content {
        background-color: var(--highlight-bg);
        border-radius: 8px;
        padding: 0.5rem 1rem;
        font-style: italic;
        opacity: 0.8;
      }
    }
  }
  
  .content {
    overflow-wrap: break-word;
    
    :global(p:first-child) {
      margin-top: 0;
    }
    
    :global(p:last-child) {
      margin-bottom: 0;
    }
    
    // Improved error message styling
    :global(p:first-child:has-text("Error:")) {
      color: var(--error-color, #dc3545);
      font-weight: 500;
      background-color: rgba(220, 53, 69, 0.1);
      padding: 0.75rem;
      border-radius: 8px;
      border-left: 4px solid var(--error-color, #dc3545);
      white-space: pre-wrap;
    }
    
    // Special styling for API errors
    :global(p:first-child:has-text("Google API error")) {
      white-space: pre-wrap;
      font-family: var(--font-mono);
      font-size: 0.9rem;
    }
  }
  
  .system-message {
    font-size: 0.9rem;
    
    :global(p) {
      margin: 0.25rem 0;
    }
  }
  
  .timestamp {
    color: color-mix(in srgb, var(--text-color) 60%, transparent);
    font-size: 0.75rem;
    margin-top: 0.25rem;
  }
  
  .media-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
    
    .media-preview-button {
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      max-width: 200px;
      border-radius: 8px;
      overflow: hidden;
      position: relative;
      
      &:focus {
        outline: 2px solid var(--accent-color);
        outline-offset: 2px;
      }
      
      img {
        max-width: 100%;
        border-radius: 8px;
        transition: transform 0.2s ease;
      }
      
      .image-caption {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        font-size: 0.8rem;
        padding: 4px 8px;
        text-align: center;
        transform: translateY(100%);
        transition: transform 0.2s ease;
      }
      
      &:hover {
        img {
          transform: scale(1.03);
        }
        
        .image-caption {
          transform: translateY(0);
        }
      }
    }
    
    audio, video {
      max-width: 100%;
      border-radius: 8px;
    }
    
    .document-file {
      background-color: var(--highlight-bg);
      padding: 0.75rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      cursor: pointer;
      transition: background-color 0.2s;
      
      &:hover {
        background-color: var(--highlight-hover);
      }
      
      &:focus {
        outline: 2px solid var(--accent-color);
        outline-offset: 2px;
      }
      
      .file-icon {
        font-size: 2rem;
        margin-right: 0.75rem;
      }
      
      .file-info {
        flex: 1;
        
        .file-name {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        
        .file-size {
          font-size: 0.8rem;
          color: color-mix(in srgb, var(--text-color) 70%, transparent);
          margin-bottom: 0.25rem;
        }
        
        .document-status {
          font-size: 0.8rem;
          
          &.success {
            color: var(--success-color);
          }
          
          &.error {
            color: var(--error-color);
          }
          
          &.info {
            color: var(--info-color);
          }
        }
      }
    }
  }
  
  .assistant-media {
    margin-top: 1rem;
    
    .assistant-image {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }
  
  .thinking {
    margin-top: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    
    summary {
      padding: 0.5rem 1rem;
      cursor: pointer;
      user-select: none;
      
      &:hover {
        background-color: var(--highlight-bg);
      }
    }
    
    .thinking-content {
      padding: 1rem;
      background-color: var(--highlight-bg);
      border-top: 1px solid var(--border-color);
      font-size: 0.9rem;
      overflow-x: auto;
    }
  }
  
  .typing-indicator {
    display: flex;
    justify-content: flex-start;
    margin-top: 0.5rem;
    
    span {
      width: 8px;
      height: 8px;
      margin: 0 2px;
      background-color: var(--accent-color);
      border-radius: 50%;
      opacity: 0.6;
      animation: typing 1.5s infinite ease-in-out;
      
      &:nth-child(1) {
        animation-delay: 0s;
      }
      
      &:nth-child(2) {
        animation-delay: 0.2s;
      }
      
      &:nth-child(3) {
        animation-delay: 0.4s;
      }
    }
  }
  
  @keyframes typing {
    0%, 60%, 100% {
      transform: translateY(0);
    }
    
    30% {
      transform: translateY(-6px);
    }
  }
</style> 