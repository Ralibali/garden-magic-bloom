import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DiaryEvent } from '@/lib/diary';
const mocks = vi.hoisted(() => ({ getDiary: vi.fn(), saveDiaryNote: vi.fn(), deleteDiaryNote: vi.fn(), toast: vi.fn(), getSeasonSummaries: vi.fn(), upsertSeasonSummary: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'gardener' } }) }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));
vi.mock('@/lib/diaryApi', () => ({ ...mocks, getDiaryPhotoUrl: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { getSeasonSummaries: mocks.getSeasonSummaries, upsertSeasonSummary: mocks.upsertSeasonSummary } }));
import Timeline from '@/pages/Timeline';
import SeasonWrapDialog from '@/components/SeasonWrapDialog';
const event: DiaryEvent = { id: 'sowing-1', sourceId: '1', date: '2026-05-01', kind: 'sowing', title: 'Sådde Tomat', body: 'Växthuset', place: 'Pallkragen', placeId: 'bed:1', subject: 'Tomat', href: '/app/sowings' };
function show(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
}
beforeEach(() => { vi.clearAllMocks(); mocks.getDiary.mockResolvedValue([event]); mocks.saveDiaryNote.mockResolvedValue({ id: 'saved' }); });
afterEach(cleanup);

describe('diary interactions', () => {
  it('keeps filters available when a selected type is empty', async () => {
    show(<Timeline />);
    await screen.findByText('Sådde Tomat');
    fireEvent.click(screen.getByRole('button', { name: 'Skörd' }));
    expect(await screen.findByText('Inga ögonblick matchar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Allt' }));
    expect(screen.getByText('Sådde Tomat')).toBeInTheDocument();
  });
  it('shows a fetch error instead of an empty garden and can retry', async () => {
    mocks.getDiary.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([event]);
    show(<Timeline />);
    expect(await screen.findByText('Dagboken kunde inte hämtas')).toBeInTheDocument();
    expect(screen.queryByText('Här börjar din odlingshistoria')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Försök igen' }));
    expect(await screen.findByText('Sådde Tomat')).toBeInTheDocument();
  });
  it('preserves a draft after a failed save and only announces success after retry', async () => {
    mocks.saveDiaryNote.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ id: 'saved' });
    show(<Timeline />);
    fireEvent.click(screen.getByRole('button', { name: 'Skriv i dagboken' }));
    fireEvent.change(screen.getByLabelText('Vad hände i odlingen?'), { target: { value: 'Tomaterna blommar!\nSpara detta.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Spara i dagboken' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Anteckningen kunde inte sparas');
    expect(screen.getByLabelText('Vad hände i odlingen?')).toHaveValue('Tomaterna blommar!\nSpara detta.');
    expect(mocks.toast).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Spara i dagboken' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sparat i din dagbok' })));
    expect(screen.queryByLabelText('Vad hände i odlingen?')).not.toBeInTheDocument();
  });
});

describe('season learnings', () => {
  it('preserves previous fields when editing just one field', async () => {
    mocks.getSeasonSummaries.mockResolvedValue([{ bed_id: 'bed', went_well: 'Tomaterna', didnt_work: 'Gurkorna', grow_again: 'partly', learnings: 'Vattna tidigt' }]);
    mocks.upsertSeasonSummary.mockResolvedValue({ id: 'summary' });
    show(<SeasonWrapDialog open onOpenChange={vi.fn()} beds={[{ id: 'bed', name: 'Pallkragen' }]} year={2026} />);
    const field = await screen.findByLabelText('Viktigaste lärdomen');
    expect(screen.getByLabelText('Vad gick bra?')).toHaveValue('Tomaterna');
    fireEvent.change(field, { target: { value: 'Täckodla också' } });
    fireEvent.click(screen.getByRole('button', { name: 'Spara lärdomarna' }));
    await waitFor(() => expect(mocks.upsertSeasonSummary).toHaveBeenCalledWith({ bed_id: 'bed', year: 2026, went_well: 'Tomaterna', didnt_work: 'Gurkorna', grow_again: 'partly', learnings: 'Täckodla också' }));
  });
});
