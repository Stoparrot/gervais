<script lang="ts">
  import Markdown from '$lib/components/Markdown.svelte';
  import { markdownSample } from '$lib/samples/markdown-sample';
  import { onMount } from 'svelte';
  import { settingsStore } from '$lib/stores/settingsStore';
  
  type ThemeType = 'light' | 'dark' | 'system';
  
  onMount(() => {
    const buttons = document.querySelectorAll('.theme-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const themeAttr = btn.getAttribute('data-theme');
        if (themeAttr && (themeAttr === 'light' || themeAttr === 'dark' || themeAttr === 'system')) {
          const theme = themeAttr as ThemeType;
          settingsStore.updateSettings({ theme });
        }
      });
    });
  });
</script>

<div class="container">
  <h1>Markdown Syntax Highlighting Test</h1>
  <div class="theme-toggle">
    <button class="theme-btn" data-theme="light">Light Theme</button>
    <button class="theme-btn" data-theme="dark">Dark Theme</button>
    <button class="theme-btn" data-theme="system">System Theme</button>
  </div>
  <div class="markdown-container">
    <Markdown content={markdownSample} />
  </div>
</div>

<style lang="scss">
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  h1 {
    margin-bottom: 1.5rem;
    text-align: center;
  }
  
  .theme-toggle {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .theme-btn {
    padding: 0.5rem 1rem;
    background-color: var(--accent-color);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    
    &:hover {
      opacity: 0.9;
    }
  }
  
  .markdown-container {
    background-color: var(--input-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
</style> 