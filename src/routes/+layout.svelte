<script lang="ts">
  import { onMount } from 'svelte';
  import { settingsStore } from '$lib/stores/settingsStore';
  import { initializeModels } from '$lib/services/llm/models';
  import '../app.scss';
  import '$lib/styles/highlight.scss';
  
  onMount(async () => {
    // Load local models on app initialization
    await initializeModels();
  });
</script>

<svelte:head>
  <title>LLM Chat App</title>
  <meta name="description" content="A versatile LLM chat interface" />
</svelte:head>

<div class="app" data-theme={$settingsStore.theme}>
  <main>
    <slot />
  </main>
</div>

<style lang="scss">
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    
    &[data-theme='dark'] {
      --bg-color: #1a1a1a;
      --text-color: #f0f0f0;
      --sidebar-bg: #0f0f0f;
      --border-color: #333;
      --input-bg: #222;
      --highlight-bg: #222;
      --highlight-color: #f0f0f0;
      --code-bg: #282c34;
      --accent-color: #7e57c2;
      --error-color: #ff5252;
      --success-color: #66bb6a;
      --user-message-bg: #333;
      --assistant-message-bg: #222;
      --tooltip-bg: #333;
      --scrollbar-thumb: #555;
      color-scheme: dark;
    }
    
    &[data-theme='light'] {
      --bg-color: #f9f9f9;
      --text-color: #333;
      --sidebar-bg: #f0f0f0;
      --border-color: #ddd;
      --input-bg: #fff;
      --highlight-bg: #f0f0f0;
      --highlight-color: #333;
      --code-bg: #f0f0f0;
      --accent-color: #6d4aff;
      --error-color: #f44336;
      --success-color: #4caf50;
      --user-message-bg: #e3f2fd;
      --assistant-message-bg: #f9f9f9;
      --tooltip-bg: #fff;
      --scrollbar-thumb: #ccc;
      color-scheme: light;
    }
    
    &[data-theme='system'] {
      @media (prefers-color-scheme: dark) {
        --bg-color: #1a1a1a;
        --text-color: #f0f0f0;
        --sidebar-bg: #0f0f0f;
        --border-color: #333;
        --input-bg: #222;
        --highlight-bg: #222;
        --highlight-color: #f0f0f0;
        --code-bg: #282c34;
        --accent-color: #7e57c2;
        --error-color: #ff5252;
        --success-color: #66bb6a;
        --user-message-bg: #333;
        --assistant-message-bg: #222;
        --tooltip-bg: #333;
        --scrollbar-thumb: #555;
        color-scheme: dark;
      }
      
      @media (prefers-color-scheme: light) {
        --bg-color: #f9f9f9;
        --text-color: #333;
        --sidebar-bg: #f0f0f0;
        --border-color: #ddd;
        --input-bg: #fff;
        --highlight-bg: #f0f0f0;
        --highlight-color: #333;
        --code-bg: #f0f0f0;
        --accent-color: #6d4aff;
        --error-color: #f44336;
        --success-color: #4caf50;
        --user-message-bg: #e3f2fd;
        --assistant-message-bg: #f9f9f9;
        --tooltip-bg: #fff;
        --scrollbar-thumb: #ccc;
        color-scheme: light;
      }
    }
  }
  
  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 100vh;
    background-color: var(--bg-color);
    color: var(--text-color);
    padding-top: var(--sat);
    padding-bottom: var(--sab);
    padding-left: var(--sal);
    padding-right: var(--sar);
    position: relative;
  }
</style> 