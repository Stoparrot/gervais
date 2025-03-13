import { render } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Markdown from './Markdown.svelte';

// Mock the highlight.js module
vi.mock('highlight.js', () => ({
  default: {
    highlightElement: vi.fn()
  }
}));

describe('Markdown Component', () => {
  beforeEach(() => {
    // Reset the mock before each test
    vi.resetAllMocks();
  });

  it('renders markdown content', () => {
    const { container } = render(Markdown, { 
      props: { 
        content: '# Hello World' 
      } 
    });
    
    const heading = container.querySelector('h1');
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toBe('Hello World');
  });

  it('renders code blocks', () => {
    const { container } = render(Markdown, { 
      props: { 
        content: '```javascript\nconst x = 1;\n```' 
      } 
    });
    
    const codeBlock = container.querySelector('pre code');
    expect(codeBlock).toBeInTheDocument();
    expect(codeBlock).toHaveClass('language-javascript');
  });

  it('renders inline code', () => {
    const { container } = render(Markdown, { 
      props: { 
        content: 'This is `inline code`' 
      } 
    });
    
    const inlineCode = container.querySelector('code');
    expect(inlineCode).toBeInTheDocument();
    expect(inlineCode.textContent).toBe('inline code');
  });

  it('renders links', () => {
    const { container } = render(Markdown, { 
      props: { 
        content: '[Link text](https://example.com)' 
      } 
    });
    
    const link = container.querySelector('a');
    expect(link).toBeInTheDocument();
    expect(link.href).toContain('example.com');
    expect(link.textContent).toBe('Link text');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
  });

  it('renders lists', () => {
    const { container } = render(Markdown, { 
      props: { 
        content: '- Item 1\n- Item 2\n- Item 3' 
      } 
    });
    
    const list = container.querySelector('ul');
    expect(list).toBeInTheDocument();
    
    const items = container.querySelectorAll('li');
    expect(items.length).toBe(3);
    expect(items[0].textContent).toBe('Item 1');
    expect(items[1].textContent).toBe('Item 2');
    expect(items[2].textContent).toBe('Item 3');
  });
}); 