import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { flushFieldDraft } from '@/lib/fieldDraftLifecycle';
import { MemoryRouter } from 'react-router-dom';
import FieldJournalPage from '@/pages/FieldJournal';
import { emptyJournal, newFieldEntry } from '@/lib/fieldJournal';
import { captureFieldPhoto } from '@/lib/fieldJournalDevice';
import { toast } from 'sonner';
const device = vi.hoisted(() => ({ value: null as string | null, failRead: false, notify: vi.fn() }));
vi.mock('@/lib/fieldJournalDevice', async () => {
  const { createJournalRepository } = await import('@/lib/fieldJournal');
  return {
    fieldJournal: createJournalRepository({ read: async () => { if (device.failRead) throw new Error('disk error'); return device.value; }, write: async value => { device.value = value; } }),
    syncFieldNotifications: device.notify,
    captureFieldPhoto: vi.fn(), fieldPhotoUrl: vi.fn(), clearFieldJournal: vi.fn(), exportFieldJournal: vi.fn(), importFieldJournal: vi.fn(),
  };
});
vi.mock('@/lib/native', () => ({ isNativeApp: () => true }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
beforeEach(() => { device.value = null; device.failRead = false; device.notify.mockReset().mockResolvedValue(true); vi.mocked(captureFieldPhoto).mockReset(); vi.mocked(toast.error).mockClear(); });
afterEach(cleanup);
const renderJournal = () => render(<MemoryRouter><FieldJournalPage /></MemoryRouter>);

describe('field journal user flow', () => {
  it('writes a real entry, shows it again after remount and keeps it searchable', async () => {
    const view = renderJournal();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ny anteckning' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Ny anteckning' }));
    fireEvent.change(screen.getByLabelText('Vad vill du minnas?'), { target: { value: 'Första tomatskörden' } });
    fireEvent.change(screen.getByLabelText('Växt eller odlingsplats'), { target: { value: 'Växthuset' } });
    fireEvent.change(screen.getByLabelText('Dina anteckningar'), { target: { value: 'Söta och mogna. Behåll sorten nästa år.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Spara i dagboken' }));
    await screen.findByRole('heading', { name: 'Första tomatskörden' });
    expect(JSON.parse(device.value!).entries).toHaveLength(1);
    view.unmount(); renderJournal();
    await screen.findByRole('heading', { name: 'Första tomatskörden' });
    fireEvent.change(screen.getByLabelText('Sök i fältdagboken'), { target: { value: 'Växthuset' } });
    expect(screen.getByRole('heading', { name: 'Första tomatskörden' })).toBeInTheDocument();
  });
  it('preserves an unfinished A when opening a different saved B', async () => {
    const a = { ...newFieldEntry(), title: 'Oavslutad lärdom', note: 'Får inte försvinna' };
    const b = { ...newFieldEntry([a]), title: 'Tidigare anteckning' };
    device.value = JSON.stringify({ ...emptyJournal(), entries: [b], draft: a });
    renderJournal();
    fireEvent.click(await screen.findByRole('button', { name: 'Öppna Tidigare anteckning' }));
    expect(screen.getByLabelText('Vad vill du minnas?')).toHaveValue('Oavslutad lärdom');
    fireEvent.click(screen.getByRole('button', { name: 'Spara i dagboken' }));
    await waitFor(() => expect(JSON.parse(device.value!).entries).toHaveLength(2));
    expect(JSON.parse(device.value!).entries.find(e => e.id === a.id).note).toBe('Får inte försvinna');
  });
  it('retains a saved note when phone notification permission is denied', async () => {
    device.notify.mockResolvedValue(false);
    renderJournal();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ny anteckning' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Ny anteckning' }));
    fireEvent.change(screen.getByLabelText('Påminn mig att följa upp'), { target: { value: '2099-09-20T10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Spara i dagboken' }));
    await screen.findByText(/Tillåt notiser i telefonens inställningar/);
    expect(JSON.parse(device.value!).entries).toHaveLength(1);
    expect(JSON.parse(device.value!).draft).toBeNull();
  });
  it('blocks editing when the stored journal cannot be read', async () => {
    device.failRead = true;
    renderJournal();
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Ny anteckning' })).toBeDisabled();
    expect(device.value).toBeNull();
  });
  it('flushes the latest text and closes the editor on native Back', async () => {
    renderJournal();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ny anteckning' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Ny anteckning' }));
    fireEvent.change(screen.getByLabelText('Dina anteckningar'), { target: { value: 'Precis skrivet före bakåt' } });
    await act(async () => { expect(await flushFieldDraft(true)).toBe(true); });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(JSON.parse(device.value!).draft.note).toBe('Precis skrivet före bakåt');
  });
  it('does not resurrect a draft when background flush overlaps saving', async () => {
    let finish!: () => void;
    device.notify.mockImplementation(() => new Promise<boolean>(resolve => { finish = () => resolve(true); }));
    renderJournal();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ny anteckning' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Ny anteckning' }));
    fireEvent.click(screen.getByRole('button', { name: 'Spara i dagboken' }));
    await waitFor(() => expect(device.notify).toHaveBeenCalled());
    await act(async () => { const flushing = flushFieldDraft(); finish(); await flushing; });
    expect(JSON.parse(device.value!).draft).toBeNull();
    expect(JSON.parse(device.value!).entries).toHaveLength(1);
  });
  it('saves the latest draft when background flush overlaps a denied photo request', async () => {
    let deny!: (error: Error) => void;
    vi.mocked(captureFieldPhoto).mockImplementation(() => new Promise((_, reject) => { deny = reject; }));
    renderJournal();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ny anteckning' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Ny anteckning' }));
    fireEvent.change(screen.getByLabelText('Dina anteckningar'), { target: { value: 'Text före nekad bildåtkomst' } });
    fireEvent.click(screen.getByRole('button', { name: 'Välj bild' }));
    await waitFor(() => expect(captureFieldPhoto).toHaveBeenCalledWith('gallery'));
    await act(async () => {
      const flushing = flushFieldDraft(true);
      deny(new Error('Bildåtkomst nekades'));
      expect(await flushing).toBe(true);
    });
    expect(JSON.parse(device.value!).draft.note).toBe('Text före nekad bildåtkomst');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledExactlyOnceWith('Bildåtkomst nekades');
  });
  it('still blocks navigation if saving fails after a denied photo request', async () => {
    let deny!: (error: Error) => void;
    vi.mocked(captureFieldPhoto).mockImplementation(() => new Promise((_, reject) => { deny = reject; }));
    renderJournal();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ny anteckning' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Ny anteckning' }));
    fireEvent.change(screen.getByLabelText('Dina anteckningar'), { target: { value: 'Behåll editorn vid lagringsfel' } });
    fireEvent.click(screen.getByRole('button', { name: 'Välj bild' }));
    await waitFor(() => expect(captureFieldPhoto).toHaveBeenCalled());
    const storedBeforeFailure = device.value;
    await act(async () => {
      const flushing = flushFieldDraft(true);
      const rejected = expect(flushing).rejects.toThrow();
      device.failRead = true;
      deny(new Error('Bildåtkomst nekades'));
      await rejected;
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Dina anteckningar')).toHaveValue('Behåll editorn vid lagringsfel');
    expect(device.value).toBe(storedBeforeFailure);
  });
});
