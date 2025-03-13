<script lang="ts">
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let variant: 'primary' | 'secondary' | 'outline' | 'icon' | 'text' = 'primary';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let disabled = false;
  export let loading = false;
  export let fullWidth = false;
</script>

<button
  {type}
  class="button {variant} {size} {fullWidth ? 'full-width' : ''}"
  class:loading
  {disabled}
  on:click
  on:keydown
  on:keyup
  {...$$restProps}
>
  {#if loading}
    <div class="spinner"></div>
  {/if}
  <slot />
</button>

<style lang="scss">
  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-weight: 500;
    transition: all 0.2s ease;
    position: relative;
    gap: 0.5rem;
    
    &:focus-visible {
      outline: 2px solid var(--accent-color);
      outline-offset: 2px;
    }
    
    &.loading {
      pointer-events: none;
      
      > :global(*:not(.spinner)) {
        opacity: 0;
      }
    }
    
    &.full-width {
      width: 100%;
    }
    
    /* Sizes */
    &.sm {
      height: 32px;
      padding: 0 0.75rem;
      font-size: 0.875rem;
    }
    
    &.md {
      height: 40px;
      padding: 0 1rem;
      font-size: 1rem;
    }
    
    &.lg {
      height: 48px;
      padding: 0 1.5rem;
      font-size: 1.125rem;
    }
    
    /* Variants */
    &.primary {
      background-color: var(--accent-color);
      color: white;
      
      &:hover:not(:disabled) {
        filter: brightness(1.1);
      }
      
      &:active:not(:disabled) {
        filter: brightness(0.9);
      }
    }
    
    &.secondary {
      background-color: color-mix(in srgb, var(--accent-color) 15%, transparent);
      color: var(--accent-color);
      
      &:hover:not(:disabled) {
        background-color: color-mix(in srgb, var(--accent-color) 20%, transparent);
      }
      
      &:active:not(:disabled) {
        background-color: color-mix(in srgb, var(--accent-color) 25%, transparent);
      }
    }
    
    &.outline {
      background-color: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-color);
      
      &:hover:not(:disabled) {
        background-color: color-mix(in srgb, var(--text-color) 5%, transparent);
      }
      
      &:active:not(:disabled) {
        background-color: color-mix(in srgb, var(--text-color) 10%, transparent);
      }
    }
    
    &.icon {
      padding: 0;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: transparent;
      color: var(--text-color);
      
      &.sm {
        width: 32px;
        height: 32px;
      }
      
      &.lg {
        width: 48px;
        height: 48px;
      }
      
      &:hover:not(:disabled) {
        background-color: color-mix(in srgb, var(--text-color) 5%, transparent);
      }
      
      &:active:not(:disabled) {
        background-color: color-mix(in srgb, var(--text-color) 10%, transparent);
      }
    }
    
    &.text {
      background-color: transparent;
      color: var(--text-color);
      padding: 0;
      height: auto;
      
      &:hover:not(:disabled) {
        text-decoration: underline;
      }
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
  
  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: currentColor;
    animation: spin 0.8s linear infinite;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }
  
  @keyframes spin {
    to {
      transform: translate(-50%, -50%) rotate(360deg);
    }
  }
</style> 