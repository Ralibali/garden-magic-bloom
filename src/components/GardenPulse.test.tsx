import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import GardenPulse from './GardenPulse';
import { addDaysToDateKey, localDateKey } from '@/lib/gardenToday';

vi.mock('@/lib/api', () => ({
  api: {
    updateReminderSettings: vi.fn(),
  },
}));

vi.mock('@/lib/analytics', () => ({
  recordProductActivity: vi.fn(),
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
  it('shows a useful empty state when nothing is due', () => {
    const now = localDateKey();
    renderPulse({
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 's-1', variety: 'Sallat', sow_date: now, type: 'direct', status: 'sown' }],
      remindersData: { settings: { reminders: [] } },
    });
    expect(screen.getByRole('heading', { name: /inget viktigt just nu/i })).toBeInTheDocument();
    expect(screen.queryByText(/skapa din första/i)).not.toBeInTheDocument();
  });

  it('shows overdue work under Saker som är sena', () => {
    const now = localDateKey();
    renderPulse({
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 's-1', variety: 'Sallat', sow_date: now, type: 'direct', status: 'sown' }],
      remindersData: {
        settings: {
          reminders: [{ id: 'r-late', title: 'Gallra Sungold', type: 'other', date: addDaysToDateKey(now, -2), done: false }],
        },
      },
    });
    expect(screen.getByText('Saker som är sena')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Gallra Sungold' })).toBeInTheDocument();
    expect(screen.getByText(/försenad/i)).toBeInTheDocument();
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
    expect(screen.getByRole('heading', { name: /inget viktigt just nu/i })).toBeInTheDocument();
    expect(screen.queryByText('Klar uppgift')).not.toBeInTheDocument();
    expect(screen.queryByText('Snoozad uppgift')).not.toBeInTheDocument();
  });

  it('shows loading without inventing tasks', () => {
    renderPulse({ isLoading: true });
    expect(screen.getByText(/hämtar din odling/i)).toBeInTheDocument();
    expect(screen.queryByText(/skapa din första/i)).not.toBeInTheDocument();
  });

  it('shows error without inventing tasks', () => {
    renderPulse({ isError: true });
    expect(screen.getByRole('heading', { name: /kunde inte läsa odlingen/i })).toBeInTheDocument();
    expect(screen.queryByText(/skapa din första/i)).not.toBeInTheDocument();
  });
});
