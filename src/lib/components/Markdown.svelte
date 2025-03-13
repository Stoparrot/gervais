<script lang="ts">
  import { marked } from 'marked';
  import { onMount } from 'svelte';
  import DOMPurify from 'dompurify';
  import hljs from 'highlight.js';
  
  export let content: string;
  export let scrollToBottom = false;
  
  let element: HTMLDivElement;
  let parsedContent = '';
  
  onMount(() => {
    // Configure marked
    marked.setOptions({
      gfm: true,
      breaks: true
    });
    
    // Parse and sanitize the markdown
    parseMarkdown();
  });
  
  // Parse markdown and sanitize HTML
  function parseMarkdown() {
    if (!content) {
      parsedContent = '';
      return;
    }
    
    try {
      // Parse markdown to HTML
      const htmlContent = marked.parse(content) as string;
      
      // Sanitize HTML to prevent XSS
      parsedContent = DOMPurify.sanitize(htmlContent, {
        ADD_ATTR: ['target', 'class'],
        FORBID_TAGS: ['style', 'iframe', 'canvas', 'input', 'form', 'script'],
      });
      
      // Apply syntax highlighting after rendering
      setTimeout(() => {
        if (element) {
          const codeBlocks = element.querySelectorAll('pre code');
          codeBlocks.forEach((block) => {
            hljs.highlightElement(block as HTMLElement);
          });
        }
      }, 0);
      
      // Scroll to bottom if needed (after next tick to ensure content is rendered)
      if (scrollToBottom) {
        setTimeout(() => {
          if (element) {
            const parent = element.parentElement;
            if (parent) {
              parent.scrollTop = parent.scrollHeight;
            }
          }
        }, 0);
      }
    } catch (e) {
      console.error('Error parsing markdown:', e);
      parsedContent = `<p>Error rendering content</p>`;
    }
  }
  
  // Update parsed content when raw content changes
  $: if (content) {
    parseMarkdown();
  }
</script>

<div class="markdown-content" bind:this={element}>
  {@html parsedContent}
</div>

<style lang="scss">
  .markdown-content {
    width: 100%;
    line-height: 1.6;
    overflow-wrap: break-word;
    
    :global(h1) {
      font-size: 1.75rem;
      margin: 1.5rem 0 1rem;
      font-weight: 600;
    }
    
    :global(h2) {
      font-size: 1.5rem;
      margin: 1.4rem 0 0.8rem;
      font-weight: 600;
    }
    
    :global(h3) {
      font-size: 1.25rem;
      margin: 1.2rem 0 0.6rem;
      font-weight: 600;
    }
    
    :global(h4) {
      font-size: 1.1rem;
      margin: 1rem 0 0.5rem;
      font-weight: 600;
    }
    
    :global(p) {
      margin: 0.8rem 0;
    }
    
    :global(ul, ol) {
      margin: 0.8rem 0;
      padding-left: 1.5rem;
    }
    
    :global(li) {
      margin: 0.3rem 0;
    }
    
    :global(a) {
      color: var(--accent-color);
      text-decoration: none;
      
      &:hover {
        text-decoration: underline;
      }
    }
    
    :global(blockquote) {
      border-left: 4px solid var(--border-color);
      margin: 1rem 0;
      padding: 0.5rem 0 0.5rem 1rem;
      color: color-mix(in srgb, var(--text-color) 80%, transparent);
    }
    
    :global(img) {
      max-width: 100%;
      border-radius: 4px;
    }
    
    :global(table) {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
      
      :global(th), :global(td) {
        border: 1px solid var(--border-color);
        padding: 0.5rem;
        text-align: left;
      }
      
      :global(th) {
        background-color: var(--highlight-bg);
      }
    }
    
    :global(hr) {
      border: none;
      border-top: 1px solid var(--border-color);
      margin: 1.5rem 0;
    }
    
    :global(pre) {
      background-color: var(--code-bg);
      padding: 1rem;
      border-radius: 6px;
      overflow-x: auto;
      margin: 1rem 0;
    }
    
    :global(code) {
      font-family: 'Fira Code', monospace;
      font-size: 0.9rem;
      
      &:not(:global(pre code)) {
        background-color: var(--highlight-bg);
        padding: 0.2em 0.4em;
        border-radius: 3px;
      }
    }
  }
</style> 