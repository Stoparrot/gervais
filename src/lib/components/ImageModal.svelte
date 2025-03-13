<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  
  export let imageUrl: string;
  export let altText: string = 'Image preview';
  export let isOpen: boolean = false;
  
  const dispatch = createEventDispatcher();
  
  function closeModal() {
    dispatch('close');
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }
  
  // Trap focus inside modal when open
  onMount(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeydown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

{#if isOpen}
  <div class="modal-backdrop" on:click={closeModal} role="presentation">
    <div class="modal-content" on:click|stopPropagation>
      <button class="close-button" on:click={closeModal} aria-label="Close image preview">
        ×
      </button>
      <div class="image-container">
        <img src={imageUrl} alt={altText} />
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(3px);
  }
  
  .modal-content {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    background-color: var(--bg-color);
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    
    .close-button {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background-color: var(--highlight-bg);
      border: none;
      color: var(--text-color);
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10;
      
      &:hover {
        background-color: var(--highlight-hover);
      }
      
      &:focus {
        outline: 2px solid var(--accent-color);
        outline-offset: 2px;
      }
    }
  }
  
  .image-container {
    padding: 20px;
    
    img {
      max-width: 100%;
      max-height: calc(90vh - 40px);
      display: block;
      margin: 0 auto;
    }
  }
</style> 