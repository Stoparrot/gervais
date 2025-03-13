<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { settingsStore } from '$lib/stores/settingsStore';
  import Button from './Button.svelte';
  import XIcon from 'lucide-svelte/icons/x';
  
  export let isOpen = false;
  
  const dispatch = createEventDispatcher();
  
  let apiKeys = {
    anthropic: '',
    openai: '',
    google: '',
    ollamaHost: 'http://localhost:11434',
    localHost: 'http://localhost:8000'
  };
  
  let saveInProgress = false;
  let saveSuccess = false;
  let errorMessage = '';
  
  onMount(() => {
    // Load existing API keys
    console.log('Settings component mounted, current settingsStore value:', $settingsStore);
    const storedKeys = $settingsStore.apiKeys || {};
    console.log('Stored API keys from settings store:', storedKeys);
    
    // Populate fields with stored values (if any)
    apiKeys = {
      anthropic: storedKeys.anthropic || '',
      openai: storedKeys.openai || '',
      google: storedKeys.google || '',
      ollamaHost: storedKeys.ollamaHost || 'http://localhost:11434',
      localHost: storedKeys.localHost || 'http://localhost:8000'
    };
    
    console.log('Initialized API key form with:', apiKeys);
  });
  
  function close() {
    dispatch('close');
  }
  
  async function saveApiKeys() {
    saveInProgress = true;
    saveSuccess = false;
    errorMessage = '';
    
    try {
      console.log('Saving API keys to settingsStore:', apiKeys);
      
      // Debug check for key format before saving
      if (apiKeys.openai) {
        console.log('EXACT OPENAI KEY BEING SAVED: ', apiKeys.openai);
        console.log(`OpenAI key before saving: length=${apiKeys.openai.length}, starts with=${apiKeys.openai.substring(0, 4)}`);
        const charCodes = [...apiKeys.openai.substring(0, 10)].map(c => c.charCodeAt(0));
        console.log(`First 10 character codes: ${charCodes.join(', ')}`);
      }
      
      // Save all values, including empty ones
      await settingsStore.updateApiKeys({
        anthropic: apiKeys.anthropic,
        openai: apiKeys.openai,
        google: apiKeys.google,
        ollamaHost: apiKeys.ollamaHost || 'http://localhost:11434',
        localHost: apiKeys.localHost || 'http://localhost:8000'
      });
      
      // Verify the keys were saved
      console.log('API keys saved. Current settingsStore value:', $settingsStore);
      
      // Debug check for key format after saving
      if ($settingsStore.apiKeys?.openai) {
        console.log('EXACT OPENAI KEY AFTER SAVING: ', $settingsStore.apiKeys.openai);
        console.log(`OpenAI key after saving: length=${$settingsStore.apiKeys.openai.length}, starts with=${$settingsStore.apiKeys.openai.substring(0, 4)}`);
        const savedCharCodes = [...$settingsStore.apiKeys.openai.substring(0, 10)].map(c => c.charCodeAt(0));
        console.log(`First 10 character codes after saving: ${savedCharCodes.join(', ')}`);
      }
      
      saveSuccess = true;
      console.log('API keys saved successfully');
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        saveSuccess = false;
      }, 3000);
    } catch (error) {
      console.error('Failed to save API keys:', error);
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      saveInProgress = false;
    }
  }
</script>

{#if isOpen}
  <div 
    class="settings-overlay" 
    on:click|self={close} 
    on:keydown={(e) => e.key === 'Escape' && close()}
    role="dialog" 
    aria-modal="true"
    tabindex="-1"
  >
    <div class="settings-modal">
      <div class="settings-header">
        <h2>Settings</h2>
        <Button variant="icon" on:click={close} aria-label="Close settings">
          <XIcon size={20} />
        </Button>
      </div>
      
      <div class="settings-content">
        <section>
          <h3>API Keys</h3>
          <p class="description">
            Add your API keys to use different LLM providers. Keys are stored locally in your browser and never sent out anywhere.
          </p>
          
          <div class="api-keys-form">
            <div class="form-group">
              <label for="anthropic-key">Anthropic API Key</label>
              <input
                id="anthropic-key"
                type="password"
                bind:value={apiKeys.anthropic}
                placeholder="Enter Anthropic API key"
                autocomplete="off"
              />
            </div>
            
            <div class="form-group">
              <label for="openai-key">OpenAI API Key</label>
              <input
                id="openai-key"
                type="password"
                bind:value={apiKeys.openai}
                placeholder="Enter OpenAI API key"
                autocomplete="off"
              />
            </div>
            
            <div class="form-group">
              <label for="google-key">Google AI API Key</label>
              <input
                id="google-key"
                type="password"
                bind:value={apiKeys.google}
                placeholder="Enter Google AI API key"
                autocomplete="off"
              />
            </div>
            
            <div class="form-group">
              <label for="ollama-host">Ollama Host</label>
              <input
                id="ollama-host"
                type="text"
                bind:value={apiKeys.ollamaHost}
                placeholder="http://localhost:11434"
                autocomplete="off"
              />
              <small>Example: http://localhost:11434</small>
            </div>
            
            <div class="form-group">
              <label for="local-host">Local LLM Host</label>
              <input
                id="local-host"
                type="text"
                bind:value={apiKeys.localHost}
                placeholder="http://localhost:8000"
                autocomplete="off"
              />
              <small>URL for your self-hosted LLM server</small>
            </div>
          </div>
          
          <div class="form-actions">
            <Button 
              variant="primary" 
              on:click={saveApiKeys} 
              disabled={saveInProgress}
            >
              {saveInProgress ? 'Saving...' : 'Save API Keys'}
            </Button>
            
            {#if saveSuccess}
              <span class="success-message">API keys saved successfully!</span>
            {/if}
            
            {#if errorMessage}
              <span class="error-message">{errorMessage}</span>
            {/if}
          </div>
        </section>
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .settings-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  
  .settings-modal {
    background-color: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    color: var(--text-color);
  }
  
  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
    
    h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }
  }
  
  .settings-content {
    padding: 1.5rem;
    overflow-y: auto;
    
    section {
      margin-bottom: 2rem;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      h3 {
        margin: 0 0 0.75rem;
        font-size: 1.125rem;
        font-weight: 600;
      }
    }
  }
  
  .description {
    margin: 0 0 1.5rem;
    font-size: 0.9rem;
    color: var(--text-muted);
  }
  
  .api-keys-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    
    label {
      font-size: 0.9rem;
      font-weight: 500;
    }
    
    input {
      padding: 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background-color: var(--input-background, var(--input-bg));
      color: var(--text-color);
      font-size: 0.9rem;
      transition: border-color 0.2s, box-shadow 0.2s;
      
      &:focus {
        border-color: var(--accent-color);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 30%, transparent);
        outline: none;
      }
    }
    
    small {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
    }
  }
  
  .form-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .success-message {
    color: var(--success-color, #48bb78);
    font-size: 0.9rem;
    font-weight: 500;
  }
  
  .error-message {
    color: var(--error-color, #e53e3e);
    font-size: 0.9rem;
    font-weight: 500;
  }
</style> 