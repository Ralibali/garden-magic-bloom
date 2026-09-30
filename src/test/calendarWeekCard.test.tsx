import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CalendarWeekCard from '@/components/calendar/CalendarWeekCard';

afterEach(cleanup);

const tomato = { id: 's', variety: 'Tomat – Sungold', sow_date: '2026-03-23', type: 'indoor', status: 'indoor', crop_key: 'tomat' };

describe('Kalenderkortet på startsidan', () => {
  it('visar veckans utplantering och länkar till kalendern', () => {
    render(<MemoryRouter><CalendarWeekCard sowings={[tomato]} zone={3} today="2026-05-14" /></MemoryRouter>);
    expect(screen.getByText('Plantera ut Tomat – Sungold')).toBeInTheDocument();
    expect(screen.getByText(/måndag 18 maj/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Öppna/ })).toHaveAttribute('href', '/app/calendar');
  });

  it('säger till när fönstret har stängt', () => {
    render(<MemoryRouter><CalendarWeekCard sowings={[{ ...tomato, sow_date: '2026-08-10' }]} zone={3} today="2026-09-30" /></MemoryRouter>);
    expect(screen.getByText(/fönstret har stängt/)).toBeInTheDocument();
  });

  it('syns inte när kalendern inte har något att säga', () => {
    const { container } = render(<MemoryRouter><CalendarWeekCard sowings={[]} zone={3} today="2026-12-10" /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });
});
