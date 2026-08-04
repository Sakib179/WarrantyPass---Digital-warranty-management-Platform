import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./auth-provider', () => ({
  useAuth: () => ({ login: vi.fn() }),
}));

import { LoginForm } from './login-form';

describe('customer login form', () => {
  it('shows validation errors for missing credentials', async () => {
    const user = userEvent.setup();
    render(<LoginForm accountType="customer" />);

    await user.click(screen.getByRole('button', { name: 'Sign in to WarrantyPass' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });
});
