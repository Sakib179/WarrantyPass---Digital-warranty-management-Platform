import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { BusinessRegistrationForm } from './business-registration-form';

describe('business registration form', () => {
  it('displays required owner fields and explains the staged verification flow', async () => {
    const user = userEvent.setup();
    render(<BusinessRegistrationForm />);

    expect(screen.getByLabelText(/owner’s full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/business email/i)).toBeRequired();
    expect(screen.getByText(/step 1 of 5/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/owner’s full name/i), 'Demo Owner');
    await user.type(screen.getByLabelText(/business email/i), 'owner@example.com');
    await user.type(screen.getByLabelText(/^create password/i), 'a memorable secure passphrase');
    await user.type(screen.getByLabelText(/confirm password/i), 'a memorable secure passphrase');
    await user.click(screen.getByRole('button', { name: /next/i }));

    expect(await screen.findByLabelText(/legal business name/i)).toBeRequired();
    expect(screen.getByLabelText(/trade licence number/i)).toBeRequired();
  });
});
