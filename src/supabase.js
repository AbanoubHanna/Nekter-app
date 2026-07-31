import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://toighwahrodvnbiztdpy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaWdod2Focm9kdm5iaXp0ZHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NDUwNDIsImV4cCI6MjEwMTAyMTA0Mn0.s_VCEa-9ClzhVriT3G-7C6KIx4d6a8Ne6LWnk0SJB8w";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- row <-> app-object mapping helpers -------------------------------
// DB columns are snake_case; the app (and every component already built)
// expects the same camelCase shape Firestore used to hand back, plus the
// `order` / `position` rename kept local to products & categories so it
// never gets confused with the unrelated `orders` table.

const snakeToCamel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
const camelToSnake = (s) => s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());

export function rowToCamel(row) {
  if (!row) return row;
  const out = {};
  for (const k of Object.keys(row)) out[snakeToCamel(k)] = row[k];
  return out;
}

export function toSnakeRow(obj) {
  const out = {};
  for (const k of Object.keys(obj)) out[camelToSnake(k)] = obj[k];
  return out;
}

// products & categories use DB column `position` <-> app field `order`
export function mapOrderedRow(row) {
  const camel = rowToCamel(row);
  if ('position' in camel) {
    camel.order = camel.position;
    delete camel.position;
  }
  return camel;
}

export function unmapOrderedRow(obj) {
  const copy = { ...obj };
  if ('order' in copy) {
    copy.position = copy.order;
    delete copy.order;
  }
  return toSnakeRow(copy);
}
