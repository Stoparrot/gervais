import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Button from './Button.svelte';

describe('Button Component', () => {
  it('renders a button element', async () => {
    const { container } = render(Button);
    const button = container.querySelector('button');
    expect(button).toBeTruthy();
  });

  it('is not disabled by default', async () => {
    const { container } = render(Button);
    const button = container.querySelector('button');
    expect(button).not.toBeDisabled();
  });

  it('renders with primary variant by default', () => {
    const { container } = render(Button);
    const button = container.querySelector('button');
    expect(button.className).toContain('primary');
  });

  it('renders with secondary variant when specified', () => {
    const { container } = render(Button, {
      props: { 
        variant: 'secondary'
      }
    });
    
    const button = container.querySelector('button');
    expect(button.className).toContain('secondary');
  });

  it('renders with medium size by default', () => {
    const { container } = render(Button);
    const button = container.querySelector('button');
    expect(button.className).toContain('md');
  });

  it('renders with small size when specified', () => {
    const { container } = render(Button, {
      props: { 
        size: 'sm'
      }
    });
    
    const button = container.querySelector('button');
    expect(button.className).toContain('sm');
  });

  it('renders with large size when specified', () => {
    const { container } = render(Button, {
      props: { 
        size: 'lg'
      }
    });
    
    const button = container.querySelector('button');
    expect(button.className).toContain('lg');
  });

  it('is disabled when disabled prop is true', () => {
    const { container } = render(Button, {
      props: { 
        disabled: true
      }
    });
    
    const button = container.querySelector('button');
    expect(button).toBeDisabled();
  });

  it('has full-width class when fullWidth prop is true', () => {
    const { container } = render(Button, {
      props: { 
        fullWidth: true
      }
    });
    
    const button = container.querySelector('button');
    expect(button.className).toContain('full-width');
  });
}); 