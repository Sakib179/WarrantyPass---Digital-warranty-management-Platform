import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/api-client', () => ({
  apiRequest: vi.fn().mockResolvedValue({
    items: [],
    pagination: { page: 1, pageSize: 12, totalItems: 0, totalPages: 0 },
  }),
}));

import { WalletList } from './wallet-list';

describe('warranty wallet', () => {
  it('renders accessible search, filters, and an empty state', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <WalletList mode="warranties" />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('textbox', { name: 'Search your wallet' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(push).toHaveBeenCalledWith('/dashboard/warranties?sort=recent');
    expect(await screen.findByText('No matching records')).toBeInTheDocument();
  });
});
