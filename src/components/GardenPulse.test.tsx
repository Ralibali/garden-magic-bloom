import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import GardenPulse from './GardenPulse';
import { addDaysToDateKey, localDateKey } from '@/lib/gardenToday';

vi.mock('@/lib/api', () => ({
  api: { updateReminderSettings: vi.fn() },
}));

vi.mock('@/lib/analytics', () => ({
  recordProductActivity: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

function renderPulse(props: Partial<ComponentProps<typeof GardenPulse>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <GardenPulse climateZone={3} {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('GardenPulse UI', () => {
  it('shows a quiet loading state without inventing actions', () => {
    renderPulse({ isLoading: true });
    expect(screen.getByLabelText('Garden Pulse')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText(/hämtar din odling/i)).toBeInTheDocument();
    expect(screen.queryByText('Klar')).not.toBeInTheDocument();
    expect(screen.queryByText('Skapa din första odlingsplats')).not.toBeInTheDocument();
  });

  it('shows an error without fake advice', () => {
    renderPulse({ isError: true });
    expect(screen.getByText('Kunde inte läsa dagens lista.')).toBeInTheDocument();
    expect(screen.queryByText('Klar')).not.toBeInTheDocument();
    expect(screen.queryByText(/skapa din första/i)).not.toBeInTheDocument();
  });

  it('shows the empty-user nothing-important copy', () => {
    renderPulse({ beds: [], sowings: [], remindersData: { settings: { reminders: [] } } });
    expect(screen.getByText('Inget viktigt just nu.')).toBeInTheDocument();
    expect(screen.queryByText('Saker som är sena')).not.toBeInTheDocument();
    expect(screen.queryByText(/skapa din första/i)).not.toBeInTheDocument();
  });

  it('does not show completed or dismissed work', () => {
    const now = localDateKey();
    renderPulse({
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 's-1', variety: 'Sallat', sow_date: now, type: 'direct', status: 'sown' }],
      remindersData: {
        settings: {
          reminders: [
            { id: 'done', title: 'Klar uppgift', type: 'other', date: now, done: true },
            { id: 'open', title: 'Snoozad uppgift', type: 'other', date: now, done: false },
          ],
          smart_action_state: {
            'reminder-open': { snoozedUntil: addDaysToDateKey(now, 2) },
          },
        },
      },
    });
    expect(screen.getByText('Inget viktigt just nu.')).toBeInTheDocument();
    expect(screen.queryByText('Klar uppgift')).not.toBeInTheDocument();
    expect(screen.queryByText('Snoozad uppgift')).not.toBeInTheDocument();
  });

  it('lists overdue and week-ahead reminders in separate buckets', () => {
    const today = localDateKey();
    renderPulse({
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 's-1', variety: 'Sallat', sow_date: today, type: 'direct', status: 'sown' }],
      remindersData: {
        settings: {
          reminders: [
            { id: 'late', title: 'Gallra morötter', type: 'other', date: addDaysToDateKey(today, -3), done: false },
            { id: 'soon', title: 'Plantera ut Sungold', type: 'transplant', date: addDaysToDateKey(today, 3), done: false },
          ],
        },
      },
    });
    expect(screen.getByText('Saker som är sena')).toBeInTheDocument();
    expect(screen.getByText('Den här veckan')).toBeInTheDocument();
    expect(screen.getByText('Gallra morötter')).toBeInTheDocument();
    expect(screen.getByText('Plantera ut Sungold')).toBeInTheDocument();
    expect(screen.getAllByText('Klar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Imorgon').length).toBeGreaterThan(0);
  });

  it('shows why-am-I-seeing-this and cheap terminals', () => {
    const today = localDateKey();
    renderPulse({
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 's-1', variety: 'Sallat', sow_date: today, type: 'direct', status: 'sown' }],
      remindersData: {
        settings: {
          reminders: [{ id: 'late', title: 'Gallra Sungold', type: 'other', date: addDaysToDateKey(today, -2), done: false }],
        },
      },
    });
    expect(screen.getByText('Varför: din logg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logga/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /inte relevant/i })).toBeInTheDocument();
  });
});
