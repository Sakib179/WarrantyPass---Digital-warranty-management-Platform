import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage from './page';

describe('WarrantyPass landing page', () => {
  it('renders meaningful landing content', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { level: 1, name: /every warranty/i })).toBeInTheDocument();
    expect(screen.getByText(/verified is a fact/i)).toBeInTheDocument();
    expect(screen.getByText(/a warranty is valuable/i)).toBeInTheDocument();
  });

  it('has an accessible primary navigation', () => {
    render(<HomePage />);

    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(navigation).toBeInTheDocument();
    expect(within(navigation).getByRole('link', { name: 'How it works' })).toHaveAttribute(
      'href',
      '#how-it-works',
    );
  });

  it('offers customer and business calls to action', () => {
    render(<HomePage />);

    expect(screen.getAllByRole('link', { name: /create free account/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /apply as a business/i }).length).toBeGreaterThan(0);
  });
});
