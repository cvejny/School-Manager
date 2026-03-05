import { format, differenceInDays, isPast, isToday, isTomorrow, parseISO, startOfDay, isBefore } from 'date-fns';
import { cs } from 'date-fns/locale';
import type { Priority, Task } from '../types';

export const BASIC_COLORS = [
  '#ef4444', // červená
  '#3b82f6', // modrá
  '#22c55e', // zelená
  '#eab308', // žlutá
  '#111827', // černá
  '#f97316', // oranžová
];

export const SUBJECT_COLORS = [
  // Reds
  '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c',
  // Oranges
  '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c',
  // Yellows / Ambers
  '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706',
  // Limes / Greens
  '#bef264', '#86efac', '#4ade80', '#22c55e', '#16a34a',
  // Teals / Emeralds
  '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857',
  // Cyans
  '#a5f3fc', '#67e8f9', '#22d3ee', '#06b6d4', '#0891b2',
  // Sky / Blues
  '#7dd3fc', '#38bdf8', '#0ea5e9', '#2563eb', '#1d4ed8',
  // Indigos
  '#a5b4fc', '#818cf8', '#6366f1', '#4f46e5', '#4338ca',
  // Purples / Violets
  '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7c3aed',
  // Pinks / Roses
  '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d',
  // Slates / Grays / Blacks
  '#94a3b8', '#64748b', '#475569', '#334155', '#111827',
];

export const SUBJECT_ICONS = [
  'BookOpen', 'Calculator', 'FlaskConical', 'Globe', 'Music',
  'Palette', 'Code', 'Dumbbell', 'Landmark', 'Microscope',
  'Languages', 'PenTool', 'Map', 'Cpu', 'Leaf',
];

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; darkBg: string; border: string }> = {
  low:    { label: 'Nízká',    color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-100 dark:bg-green-900/40',  darkBg: 'dark:bg-green-900/40', border: 'border-green-200 dark:border-green-800' },
  medium: { label: 'Střední',  color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/40', darkBg: 'dark:bg-yellow-900/40', border: 'border-yellow-200 dark:border-yellow-800' },
  high:   { label: 'Vysoká',   color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/40', darkBg: 'dark:bg-orange-900/40', border: 'border-orange-200 dark:border-orange-800' },
  urgent: { label: 'Urgentní', color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-100 dark:bg-red-900/40',      darkBg: 'dark:bg-red-900/40',    border: 'border-red-200 dark:border-red-800' },
};

function getRelativeDateLabel(date: Date): string {
  if (isToday(date)) return 'Dnes';
  if (isTomorrow(date)) return 'Zítra';
  const diff = differenceInDays(startOfDay(date), startOfDay(new Date()));
  if (diff >= 2 && diff <= 4) return `Za ${diff} dny`;
  if (diff < 0) return 'Po termínu';
  return format(date, 'd. MMM', { locale: cs });
}

/** Returns display text + overdue flag for TaskCard date badge.
 *  Uses startDate as primary anchor; shows time range when both start and end times exist. */
export function formatTaskDateDisplay(
  startDate: string | null,
  dueDate: string | null,
): { text: string; overdue: boolean } {
  const primaryStr = startDate || dueDate;
  if (!primaryStr) return { text: '', overdue: false };

  const primary = parseISO(primaryStr);
  const primaryHasTime = primaryStr.includes('T');
  const primaryLabel = getRelativeDateLabel(primary);
  const startTimePart = primaryHasTime ? ` v ${format(primary, 'H:mm')}` : '';

  // Overdue is determined by dueDate being in the past (whole day)
  const overdue =
    !!dueDate &&
    isBefore(startOfDay(parseISO(dueDate)), startOfDay(new Date()));

  // Show end segment only when a distinct dueDate with time exists alongside a startDate
  let endPart = '';
  if (startDate && dueDate && startDate !== dueDate && dueDate.includes('T')) {
    const end = parseISO(dueDate);
    endPart = ` – ${getRelativeDateLabel(end)} v ${format(end, 'H:mm')}`;
  }

  return { text: `${primaryLabel}${startTimePart}${endPart}`, overdue };
}

export function formatDueDate(dateStr: string | null, showTime = false): string {
  if (!dateStr) return 'Bez termínu';
  const hasTime = dateStr.includes('T');
  const date = parseISO(dateStr);
  let result: string;
  if (isToday(date)) result = 'Dnes';
  else if (isTomorrow(date)) result = 'Zítra';
  else {
    const diff = differenceInDays(date, new Date());
    if (diff < 0) result = `${Math.abs(diff)} dní po termínu`;
    else if (diff < 7) result = `Za ${diff} dní`;
    else result = format(date, 'd. MMM yyyy', { locale: cs });
  }
  if (showTime && hasTime) result += ` · ${format(date, 'HH:mm')}`;
  return result;
}

export function hasExplicitTime(dateStr: string | null): boolean {
  return !!dateStr && dateStr.includes('T');
}

export function isDueSoon(dateStr: string | null, days: number): boolean {
  if (!dateStr) return false;
  const date = parseISO(dateStr);
  const diff = differenceInDays(date, new Date());
  return diff <= days && diff >= 0;
}

export function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const hasTime = dateStr.includes('T');
  const date = parseISO(dateStr);
  if (hasTime) return isPast(date) && !isToday(date);
  // date-only: overdue only if strictly before today
  return isBefore(date, startOfDay(new Date())) && !isToday(date);
}

export function sortTasks(tasks: Task[], sort: string): Task[] {
  return [...tasks].sort((a, b) => {
    switch (sort) {
      case 'dueDate': {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      case 'priority': {
        const order: Priority[] = ['urgent', 'high', 'medium', 'low'];
        return order.indexOf(a.priority) - order.indexOf(b.priority);
      }
      case 'createdAt':
        return b.createdAt.localeCompare(a.createdAt);
      default:
        return 0;
    }
  });
}

export function getOrderedSubjects<T extends { id: string }>(subjects: T[]): T[] {
  try {
    const order: string[] = JSON.parse(localStorage.getItem('subject_order') || '[]');
    if (order.length === 0) return subjects;
    return [...subjects].sort((a, b) => {
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  } catch {
    return subjects;
  }
}
