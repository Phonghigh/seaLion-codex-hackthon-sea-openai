import { expect, it } from 'vitest';
import { compareChronological } from './client';

it('orders timeline events by their timestamp instant and then id, regardless of input order', () => {
  const rows = [
    { id: 'CE3', created_at: '2026-11-01T09:00:00+07:00' },
    { id: 'CE2', created_at: '2026-10-31T02:00:00Z' },
    { id: 'CE1', created_at: '2026-10-31T09:00:00+07:00' },
  ];
  expect([...rows].sort(compareChronological).map(row => row.id)).toEqual(['CE1', 'CE2', 'CE3']);
  expect([...rows].sort((a, b) => compareChronological(b, a)).map(row => row.id)).toEqual(['CE3', 'CE2', 'CE1']);
});
