<script lang="ts">
  import { onMount } from 'svelte';
  import type { Message, MediaItem } from '$lib/types';
  import Markdown from './Markdown.svelte';
  
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

  function openImagePreview(imageUrl: string) {
    // Open image in a new tab for now
    // In a future enhancement, this could be a modal overlay
    window.open(imageUrl, '_blank');
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
                  openImagePreview(media.preview);
                }}
                on:keydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!media.preview) return;
                    openImagePreview(media.preview);
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
                      {:else}
                        <span class="document-status success">Document processed</span>
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
      
      &:focus {
        outline: 2px solid var(--accent-color);
        outline-offset: 2px;
      }
      
      img {
        max-width: 100%;
        border-radius: 8px;
      }
    }
    
    audio, video {
      max-width: 100%;
      border-radius: 8px;
    }
    
    .document-file {
      background-color: var(--highlight-bg);
      padding: 0.5rem;
      border-radius: 4px;
      font-size: 0.85rem;
      display: flex;
      flex-direction: column;
      cursor: pointer;
      
      &:focus {
        outline: 2px solid var(--accent-color);
        outline-offset: 2px;
      }
      
      .file-name {
        font-weight: 500;
        word-break: break-all;
      }
      
      .file-size {
        font-size: 0.75rem;
        opacity: 0.7;
      }
    }
  }
  
  .thinking {
    margin-top: 1rem;
    border-top: 1px dashed var(--border-color);
    
    summary {
      margin-top: 0.5rem;
      cursor: pointer;
      color: var(--accent-color);
      font-size: 0.85rem;
      
      &:focus {
        outline: none;
      }
    }
    
    .thinking-content {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background-color: var(--highlight-bg);
      border-radius: 8px;
      font-size: 0.9rem;
    }
  }
  
  .typing-indicator {
    display: inline-flex;
    align-items: center;
    margin-top: 0.5rem;
    
    span {
      display: inline-block;
      width: 6px;
      height: 6px;
      background-color: var(--accent-color);
      border-radius: 50%;
      margin: 0 2px;
      animation: typing 1.4s infinite ease-in-out both;
      
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
    0%, 100% {
      transform: scale(0.75);
      opacity: 0.5;
    }
    
    50% {
      transform: scale(1);
      opacity: 1;
    }
  }
  
  .file-icon {
    font-size: 1.5rem;
    margin-right: 10px;
  }
  
  .file-info {
    display: flex;
    flex-direction: column;
  }
  
  .file-status {
    margin-top: 5px;
    font-size: 0.8rem;
  }
  
  .document-status {
    padding: 2px 5px;
    border-radius: 4px;
  }
  
  .document-status.success {
    background-color: rgba(25, 135, 84, 0.1);
    color: var(--success-color, #198754);
  }
  
  .document-status.error {
    background-color: rgba(220, 53, 69, 0.1);
    color: var(--error-color, #dc3545);
  }
  
  .document-status.info {
    background-color: rgba(13, 110, 253, 0.1);
    color: var(--info-color, #0d6efd);
  }
</style> 