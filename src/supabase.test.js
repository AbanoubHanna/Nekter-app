import { describe, it, expect } from 'vitest';
import { rowToCamel, toSnakeRow, mapOrderedRow, unmapOrderedRow } from './supabase';

describe('rowToCamel', () => {
  it('converts snake_case keys to camelCase', () => {
    expect(rowToCamel({ customer_name: 'أحمد', table_number: '3' })).toEqual({
      customerName: 'أحمد',
      tableNumber: '3',
    });
  });

  it('leaves already-camelCase or single-word keys untouched', () => {
    expect(rowToCamel({ id: '1', price: 18 })).toEqual({ id: '1', price: 18 });
  });

  it('handles keys with numbers after the underscore', () => {
    expect(rowToCamel({ item_2_qty: 5 })).toEqual({ item2Qty: 5 });
  });

  it('returns falsy input unchanged', () => {
    expect(rowToCamel(null)).toBe(null);
    expect(rowToCamel(undefined)).toBe(undefined);
  });
});

describe('toSnakeRow', () => {
  it('converts camelCase keys to snake_case', () => {
    expect(toSnakeRow({ customerName: 'أحمد', tableNumber: '3' })).toEqual({
      customer_name: 'أحمد',
      table_number: '3',
    });
  });

  it('round-trips with rowToCamel', () => {
    const original = { customer_phone: '0501234567', total: 18 };
    expect(toSnakeRow(rowToCamel(original))).toEqual(original);
  });
});

describe('mapOrderedRow', () => {
  it('renames the DB `position` column to the app `order` field', () => {
    expect(mapOrderedRow({ id: '1', name: 'قهوة', position: 2 })).toEqual({
      id: '1',
      name: 'قهوة',
      order: 2,
    });
  });

  it('leaves rows without a position column unaffected (still camelCased)', () => {
    expect(mapOrderedRow({ customer_name: 'أحمد' })).toEqual({ customerName: 'أحمد' });
  });
});

describe('unmapOrderedRow', () => {
  it('renames the app `order` field back to the DB `position` column', () => {
    expect(unmapOrderedRow({ id: '1', name: 'قهوة', order: 2 })).toEqual({
      id: '1',
      name: 'قهوة',
      position: 2,
    });
  });

  it('round-trips with mapOrderedRow', () => {
    const dbRow = { id: '1', is_visible: true, position: 4 };
    expect(unmapOrderedRow(mapOrderedRow(dbRow))).toEqual(dbRow);
  });

  it('does not mutate the object passed in', () => {
    const input = { order: 1 };
    unmapOrderedRow(input);
    expect(input).toEqual({ order: 1 });
  });
});
