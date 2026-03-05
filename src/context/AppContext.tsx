import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { addDays, addWeeks, addMonths, parseISO, isAfter } from 'date-fns';
import { supabase } from '../lib/supabase';
import type { AppData, Subject, Task, Note, Settings, SubTask, RecurringInterval, RecurringEnd, TimetableEntry } from '../types';

// ─── DB row → app type converters ────────────────────────────────────────────

// Values from timestamptz columns come back with timezone suffix, e.g. "2026-03-05T00:00:00+00:00".
// Values from text columns come back exactly as stored ("2026-03-05" or "2026-03-05T14:30").
// For timestamptz: midnight UTC means the original value was date-only → strip time.
// For text: return as-is (already in our format).
const normalizeDateFromDb = (val: string | null | undefined): string | null => {
  if (!val) return null;
  // Detect timestamptz output: ends with +HH:MM, -HH:MM, or Z
  const tstz = val.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):\d{2}(?:\.\d+)?(?:[+-]\d{2}:\d{2}|Z)$/);
  if (tstz) {
    // Midnight UTC → was stored as date-only string → strip time
    return tstz[2] === '00:00' ? tstz[1] : `${tstz[1]}T${tstz[2]}`;
  }
  // Already our format — return unchanged
  return val;
};

const fromDbSubject = (r: any): Subject => ({
  id: r.id, name: r.name, abbreviation: r.abbreviation ?? '', color: r.color, icon: r.icon,
  description: r.description ?? '', createdAt: r.created_at,
});

const fromDbTask = (r: any): Task => ({
  id: r.id, subjectId: r.subject_id, title: r.title,
  description: r.description ?? '', priority: r.priority, status: r.status,
  dueDate: normalizeDateFromDb(r.due_date), startDate: normalizeDateFromDb(r.start_date),
  subTasks: r.sub_tasks ?? [], tags: r.tags ?? [],
  recurring: r.recurring ?? false, recurringInterval: r.recurring_interval ?? null,
  recurringEnd: (r.recurring_end ?? 'forever') as RecurringEnd,
  recurringEndCount: r.recurring_end_count ?? null,
  recurringEndDate: normalizeDateFromDb(r.recurring_end_date),
  createdAt: r.created_at, updatedAt: r.updated_at,
});

const fromDbNote = (r: any): Note => ({
  id: r.id, subjectId: r.subject_id, title: r.title, content: r.content ?? '',
  type: r.type, fileName: r.file_name, fileData: r.file_data,
  fileMimeType: r.file_mime_type, createdAt: r.created_at, updatedAt: r.updated_at,
});

const fromDbSettings = (r: any): Settings => ({
  theme: r.theme, upcomingDays: r.upcoming_days,
  defaultSort: r.default_sort, showDoneTasks: r.show_done_tasks, language: 'cs',
  abbreviationPrefix: r.abbreviation_prefix ?? false,
});

const fromDbTimetableEntry = (r: any): TimetableEntry => ({
  id: r.id, day: r.day, period: r.period ?? 1,
  startTime: r.start_time, endTime: r.end_time,
  title: r.title, subjectId: r.subject_id ?? null,
  room: r.room ?? '', teacher: r.teacher ?? '', color: r.color ?? '',
  createdAt: r.created_at,
});

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defaultSettings: Settings = {
  theme: 'system', upcomingDays: 7, defaultSort: 'dueDate',
  showDoneTasks: false, language: 'cs', abbreviationPrefix: false,
};

const defaultData: AppData = { subjects: [], tasks: [], notes: [], settings: defaultSettings, timetable: [] };

// ─── Context type ─────────────────────────────────────────────────────────────

interface AppContextType {
  data: AppData;
  loading: boolean;
  addSubject: (subject: Omit<Subject, 'id' | 'createdAt'>) => Subject;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addSubTask: (taskId: string, subTask: Omit<SubTask, 'id' | 'createdAt'>) => void;
  toggleSubTask: (taskId: string, subTaskId: string) => void;
  deleteSubTask: (taskId: string, subTaskId: string) => void;
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  updateSettings: (updates: Partial<Settings>) => void;
  renameTag: (oldName: string, newName: string) => void;
  deleteTag: (name: string) => void;
  addTimetableEntry: (entry: Omit<TimetableEntry, 'id' | 'createdAt'>) => TimetableEntry;
  updateTimetableEntry: (id: string, updates: Partial<TimetableEntry>) => void;
  deleteTimetableEntry: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

function calculateNextDueDate(dueDate: string, interval: RecurringInterval): string {
  const date = parseISO(dueDate);
  switch (interval) {
    case 'daily': return addDays(date, 1).toISOString();
    case 'weekly': return addWeeks(date, 1).toISOString();
    case 'biweekly': return addWeeks(date, 2).toISOString();
    case 'monthly': return addMonths(date, 1).toISOString();
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const dataRef = useRef<AppData>(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  // Track auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
      if (!session) setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
      if (!session) { setData(defaultData); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load data when user changes
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      supabase.from('subjects').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('tasks').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('notes').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('settings').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('timetable').select('*').eq('user_id', userId).order('created_at'),
    ]).then(([subjectsRes, tasksRes, notesRes, settingsRes, timetableRes]) => {
      setData({
        subjects: (subjectsRes.data ?? []).map(fromDbSubject),
        tasks: (tasksRes.data ?? []).map(fromDbTask),
        notes: (notesRes.data ?? []).map(fromDbNote),
        settings: settingsRes.data ? fromDbSettings(settingsRes.data) : defaultSettings,
        timetable: (timetableRes.data ?? []).map(fromDbTimetableEntry),
      });
    }).catch(err => console.error('loadData:', err))
      .finally(() => setLoading(false));
  }, [userId]);

  // Apply theme
  useEffect(() => {
    const applyTheme = (theme: string) => {
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    };
    applyTheme(data.settings.theme);
    if (data.settings.theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [data.settings.theme]);

  // ── Subjects ──────────────────────────────────────────────────────────────

  const addSubject = useCallback((subject: Omit<Subject, 'id' | 'createdAt'>) => {
    const newSubject: Subject = { ...subject, id: uuidv4(), createdAt: new Date().toISOString() };
    setData(d => ({ ...d, subjects: [...d.subjects, newSubject] }));
    if (userId) {
      supabase.from('subjects').insert({
        id: newSubject.id, user_id: userId, name: newSubject.name,
        abbreviation: newSubject.abbreviation || null,
        color: newSubject.color, icon: newSubject.icon, description: newSubject.description,
      }).then(({ error }) => { if (error) console.error('addSubject:', error.message); });
    }
    return newSubject;
  }, [userId]);

  const updateSubject = useCallback((id: string, updates: Partial<Subject>) => {
    setData(d => ({ ...d, subjects: d.subjects.map(s => s.id === id ? { ...s, ...updates } : s) }));
    if (userId) {
      const db: any = {};
      if (updates.name !== undefined) db.name = updates.name;
      if (updates.abbreviation !== undefined) db.abbreviation = updates.abbreviation || null;
      if (updates.color !== undefined) db.color = updates.color;
      if (updates.icon !== undefined) db.icon = updates.icon;
      if (updates.description !== undefined) db.description = updates.description;
      supabase.from('subjects').update(db).eq('id', id).eq('user_id', userId)
        .then(({ error }) => { if (error) console.error('updateSubject:', error.message); });
    }
  }, [userId]);

  const deleteSubject = useCallback((id: string) => {
    setData(d => ({
      ...d,
      subjects: d.subjects.filter(s => s.id !== id),
      tasks: d.tasks.filter(t => t.subjectId !== id),
      notes: d.notes.filter(n => n.subjectId !== id),
    }));
    if (userId) {
      supabase.from('subjects').delete().eq('id', id).eq('user_id', userId)
        .then(({ error }) => { if (error) console.error('deleteSubject:', error.message); });
    }
  }, [userId]);

  // ── Tasks ─────────────────────────────────────────────────────────────────

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newTask: Task = { ...task, id: uuidv4(), createdAt: now, updatedAt: now };
    setData(d => ({ ...d, tasks: [...d.tasks, newTask] }));
    if (userId) {
      const insertRow: any = {
        id: newTask.id, user_id: userId, subject_id: newTask.subjectId,
        title: newTask.title, description: newTask.description, priority: newTask.priority,
        status: newTask.status, due_date: newTask.dueDate,
        sub_tasks: newTask.subTasks, tags: newTask.tags,
        recurring: newTask.recurring, recurring_interval: newTask.recurringInterval,
        recurring_end: newTask.recurringEnd, recurring_end_count: newTask.recurringEndCount,
        recurring_end_date: newTask.recurringEndDate,
      };
      if (newTask.startDate != null) insertRow.start_date = newTask.startDate;
      supabase.from('tasks').insert(insertRow).then(({ error }) => {
        if (error) {
          console.error('addTask:', error.message);
          // Rollback – remove task from local state so UI stays consistent
          setData(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== newTask.id) }));
          alert(`Úkol se nepodařilo uložit: ${error.message}`);
        }
      });
    }
    return newTask;
  }, [userId]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    const now = new Date().toISOString();
    const currentTask = dataRef.current.tasks.find(t => t.id === id);
    let nextTask: Task | null = null;
    if (
      updates.status === 'done' &&
      currentTask?.recurring &&
      currentTask?.recurringInterval &&
      currentTask?.dueDate
    ) {
      // Check end conditions before creating next occurrence
      const canCreate = (() => {
        if (currentTask.recurringEnd === 'count') {
          return currentTask.recurringEndCount !== null && currentTask.recurringEndCount > 1;
        }
        if (currentTask.recurringEnd === 'date' && currentTask.recurringEndDate) {
          const nextDate = calculateNextDueDate(currentTask.dueDate, currentTask.recurringInterval);
          return !isAfter(parseISO(nextDate), parseISO(currentTask.recurringEndDate));
        }
        return true; // forever
      })();
      if (canCreate) {
        const nextDueDate = calculateNextDueDate(currentTask.dueDate, currentTask.recurringInterval);
        const nextStartDate = currentTask.startDate
          ? calculateNextDueDate(currentTask.startDate, currentTask.recurringInterval)
          : null;
        // Decrement count for next occurrence
        const nextEndCount = currentTask.recurringEnd === 'count' && currentTask.recurringEndCount !== null
          ? currentTask.recurringEndCount - 1 : currentTask.recurringEndCount;
        nextTask = {
          ...currentTask, id: uuidv4(), status: 'todo', dueDate: nextDueDate,
          startDate: nextStartDate,
          recurringEndCount: nextEndCount,
          subTasks: currentTask.subTasks.map(st => ({ ...st, done: false })),
          createdAt: now, updatedAt: now,
        };
      }
    }
    setData(d => {
      const updatedTasks = d.tasks.map(t => t.id === id ? { ...t, ...updates, updatedAt: now } : t);
      return { ...d, tasks: nextTask ? [...updatedTasks, nextTask] : updatedTasks };
    });
    if (userId) {
      const db: any = { updated_at: now };
      if (updates.title !== undefined) db.title = updates.title;
      if (updates.description !== undefined) db.description = updates.description;
      if (updates.priority !== undefined) db.priority = updates.priority;
      if (updates.status !== undefined) db.status = updates.status;
      if (updates.dueDate !== undefined) db.due_date = updates.dueDate;
      if (updates.startDate != null) db.start_date = updates.startDate;
      if (updates.subTasks !== undefined) db.sub_tasks = updates.subTasks;
      if (updates.tags !== undefined) db.tags = updates.tags;
      if (updates.subjectId !== undefined) db.subject_id = updates.subjectId;
      if (updates.recurring !== undefined) db.recurring = updates.recurring;
      if (updates.recurringInterval !== undefined) db.recurring_interval = updates.recurringInterval;
      if (updates.recurringEnd !== undefined) db.recurring_end = updates.recurringEnd;
      if (updates.recurringEndCount !== undefined) db.recurring_end_count = updates.recurringEndCount;
      if (updates.recurringEndDate !== undefined) db.recurring_end_date = updates.recurringEndDate;
      supabase.from('tasks').update(db).eq('id', id).eq('user_id', userId)
        .then(({ error }) => {
          if (error) {
            console.error('updateTask:', error.message);
            // Rollback – restore previous task state
            if (currentTask) {
              setData(d => ({
                ...d,
                tasks: d.tasks
                  .filter(t => nextTask ? t.id !== nextTask.id : true)
                  .map(t => t.id === id ? currentTask : t),
              }));
            }
            alert(`Úkol se nepodařilo uložit: ${error.message}`);
          }
        });
      if (nextTask) {
        const recurringRow: any = {
          id: nextTask.id, user_id: userId, subject_id: nextTask.subjectId,
          title: nextTask.title, description: nextTask.description, priority: nextTask.priority,
          status: nextTask.status, due_date: nextTask.dueDate,
          sub_tasks: nextTask.subTasks, tags: nextTask.tags,
          recurring: nextTask.recurring, recurring_interval: nextTask.recurringInterval,
          recurring_end: nextTask.recurringEnd, recurring_end_count: nextTask.recurringEndCount,
          recurring_end_date: nextTask.recurringEndDate,
        };
        if (nextTask.startDate != null) recurringRow.start_date = nextTask.startDate;
        supabase.from('tasks').insert(recurringRow)
          .then(({ error }) => { if (error) console.error('addRecurringTask:', error.message); });
      }
    }
  }, [userId]);

  const deleteTask = useCallback((id: string) => {
    setData(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) }));
    if (userId) {
      supabase.from('tasks').delete().eq('id', id).eq('user_id', userId)
        .then(({ error }) => { if (error) console.error('deleteTask:', error.message); });
    }
  }, [userId]);

  const addSubTask = useCallback((taskId: string, subTask: Omit<SubTask, 'id' | 'createdAt'>) => {
    const newSubTask: SubTask = { ...subTask, id: uuidv4(), createdAt: new Date().toISOString() };
    const now = new Date().toISOString();
    let newSubTasks: SubTask[] = [];
    setData(d => {
      const tasks = d.tasks.map(t => {
        if (t.id !== taskId) return t;
        newSubTasks = [...t.subTasks, newSubTask];
        return { ...t, subTasks: newSubTasks, updatedAt: now };
      });
      return { ...d, tasks };
    });
    if (userId) {
      supabase.from('tasks').update({ sub_tasks: newSubTasks, updated_at: now })
        .eq('id', taskId).eq('user_id', userId)
        .then(({ error }) => { if (error) console.error('addSubTask:', error.message); });
    }
  }, [userId]);

  const toggleSubTask = useCallback((taskId: string, subTaskId: string) => {
    const now = new Date().toISOString();
    let newSubTasks: SubTask[] = [];
    setData(d => {
      const tasks = d.tasks.map(t => {
        if (t.id !== taskId) return t;
        newSubTasks = t.subTasks.map(st => st.id === subTaskId ? { ...st, done: !st.done } : st);
        return { ...t, subTasks: newSubTasks, updatedAt: now };
      });
      return { ...d, tasks };
    });
    if (userId) {
      supabase.from('tasks').update({ sub_tasks: newSubTasks, updated_at: now })
        .eq('id', taskId).eq('user_id', userId)
        .then(({ error }) => { if (error) console.error('toggleSubTask:', error.message); });
    }
  }, [userId]);

  const deleteSubTask = useCallback((taskId: string, subTaskId: string) => {
    const now = new Date().toISOString();
    let newSubTasks: SubTask[] = [];
    setData(d => {
      const tasks = d.tasks.map(t => {
        if (t.id !== taskId) return t;
        newSubTasks = t.subTasks.filter(st => st.id !== subTaskId);
        return { ...t, subTasks: newSubTasks, updatedAt: now };
      });
      return { ...d, tasks };
    });
    if (userId) {
      supabase.from('tasks').update({ sub_tasks: newSubTasks, updated_at: now })
        .eq('id', taskId).eq('user_id', userId)
        .then(({ error }) => { if (error) console.error('deleteSubTask:', error.message); });
    }
  }, [userId]);

  // ── Notes ─────────────────────────────────────────────────────────────────

  const addNote = useCallback((note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newNote: Note = { ...note, id: uuidv4(), createdAt: now, updatedAt: now };
    setData(d => ({ ...d, notes: [...d.notes, newNote] }));
    if (userId) {
      supabase.from('notes').insert({
        id: newNote.id, user_id: userId, subject_id: newNote.subjectId,
        title: newNote.title, content: newNote.content, type: newNote.type,
        file_name: newNote.fileName ?? null, file_data: newNote.fileData ?? null,
        file_mime_type: newNote.fileMimeType ?? null,
      }).then(({ error }) => { if (error) console.error('addNote:', error.message); });
    }
    return newNote;
  }, [userId]);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    const now = new Date().toISOString();
    setData(d => ({
      ...d,
      notes: d.notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: now } : n),
    }));
    if (userId) {
      const db: any = { updated_at: now };
      if (updates.title !== undefined) db.title = updates.title;
      if (updates.content !== undefined) db.content = updates.content;
      if (updates.type !== undefined) db.type = updates.type;
      if (updates.fileName !== undefined) db.file_name = updates.fileName;
      if (updates.fileData !== undefined) db.file_data = updates.fileData;
      if (updates.fileMimeType !== undefined) db.file_mime_type = updates.fileMimeType;
      supabase.from('notes').update(db).eq('id', id).eq('user_id', userId)
        .then(({ error }) => { if (error) console.error('updateNote:', error.message); });
    }
  }, [userId]);

  const deleteNote = useCallback((id: string) => {
    setData(d => ({ ...d, notes: d.notes.filter(n => n.id !== id) }));
    if (userId) {
      supabase.from('notes').delete().eq('id', id).eq('user_id', userId)
        .then(({ error }) => { if (error) console.error('deleteNote:', error.message); });
    }
  }, [userId]);

  // ── Settings ──────────────────────────────────────────────────────────────

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setData(d => ({ ...d, settings: { ...d.settings, ...updates } }));
    if (userId) {
      const db: any = { user_id: userId, updated_at: new Date().toISOString() };
      if (updates.theme !== undefined) db.theme = updates.theme;
      if (updates.upcomingDays !== undefined) db.upcoming_days = updates.upcomingDays;
      if (updates.defaultSort !== undefined) db.default_sort = updates.defaultSort;
      if (updates.showDoneTasks !== undefined) db.show_done_tasks = updates.showDoneTasks;
      if (updates.abbreviationPrefix !== undefined) db.abbreviation_prefix = updates.abbreviationPrefix;
      supabase.from('settings').upsert(db, { onConflict: 'user_id' })
        .then(({ error }) => { if (error) console.error('updateSettings:', error.message); });
    }
  }, [userId]);

  const renameTag = useCallback((oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    const now = new Date().toISOString();
    let affectedTasks: Task[] = [];
    setData(d => {
      const tasks = d.tasks.map(t => {
        if (!t.tags.includes(oldName)) return t;
        const tags = t.tags.map(tag => tag === oldName ? trimmed : tag);
        const updated = { ...t, tags, updatedAt: now };
        affectedTasks.push(updated);
        return updated;
      });
      return { ...d, tasks };
    });
    if (userId) {
      affectedTasks.forEach(t => {
        supabase.from('tasks').update({ tags: t.tags, updated_at: now })
          .eq('id', t.id).eq('user_id', userId)
          .then(({ error }) => { if (error) console.error('renameTag:', error.message); });
      });
    }
  }, [userId]);

  const deleteTag = useCallback((name: string) => {
    const now = new Date().toISOString();
    let affectedTasks: Task[] = [];
    setData(d => {
      const tasks = d.tasks.map(t => {
        if (!t.tags.includes(name)) return t;
        const tags = t.tags.filter(tag => tag !== name);
        const updated = { ...t, tags, updatedAt: now };
        affectedTasks.push(updated);
        return updated;
      });
      return { ...d, tasks };
    });
    if (userId) {
      affectedTasks.forEach(t => {
        supabase.from('tasks').update({ tags: t.tags, updated_at: now })
          .eq('id', t.id).eq('user_id', userId)
          .then(({ error }) => { if (error) console.error('deleteTag:', error.message); });
      });
    }
  }, [userId]);

  // ── Timetable ─────────────────────────────────────────────────────────────
  const addTimetableEntry = useCallback((entry: Omit<TimetableEntry, 'id' | 'createdAt'>) => {
    const newEntry: TimetableEntry = { ...entry, id: uuidv4(), createdAt: new Date().toISOString() };
    setData(d => ({ ...d, timetable: [...d.timetable, newEntry] }));
    if (userId) {
      supabase.from('timetable').insert({
        id: newEntry.id, user_id: userId, day: newEntry.day,
        period: newEntry.period,
        start_time: newEntry.startTime, end_time: newEntry.endTime,
        title: newEntry.title, subject_id: newEntry.subjectId || null,
        room: newEntry.room || null, teacher: newEntry.teacher || null,
        color: newEntry.color || null,
      }).then(({ error }) => {
        if (error) {
          console.error('addTimetableEntry:', error.message);
          // Rollback — remove from local state so refresh stays consistent
          setData(d => ({ ...d, timetable: d.timetable.filter(e => e.id !== newEntry.id) }));
          alert(`Rozvrh se nepodařilo uložit: ${error.message}`);
        }
      });
    }
    return newEntry;
  }, [userId]);

  const updateTimetableEntry = useCallback((id: string, updates: Partial<TimetableEntry>) => {
    setData(d => ({ ...d, timetable: d.timetable.map(e => e.id === id ? { ...e, ...updates } : e) }));
    if (userId) {
      const db: any = {};
      if (updates.day !== undefined) db.day = updates.day;
      if (updates.period !== undefined) db.period = updates.period;
      if (updates.startTime !== undefined) db.start_time = updates.startTime;
      if (updates.endTime !== undefined) db.end_time = updates.endTime;
      if (updates.title !== undefined) db.title = updates.title;
      if (updates.subjectId !== undefined) db.subject_id = updates.subjectId || null;
      if (updates.room !== undefined) db.room = updates.room || null;
      if (updates.teacher !== undefined) db.teacher = updates.teacher || null;
      if (updates.color !== undefined) db.color = updates.color || null;
      supabase.from('timetable').update(db).eq('id', id).eq('user_id', userId)
        .then(({ error }) => { if (error) console.error('updateTimetableEntry:', error.message); });
    }
  }, [userId]);

  const deleteTimetableEntry = useCallback((id: string) => {
    setData(d => ({ ...d, timetable: d.timetable.filter(e => e.id !== id) }));
    if (userId) {
      supabase.from('timetable').delete().eq('id', id).eq('user_id', userId)
        .then(({ error }) => { if (error) console.error('deleteTimetableEntry:', error.message); });
    }
  }, [userId]);

  return (
    <AppContext.Provider value={{
      data, loading,
      addSubject, updateSubject, deleteSubject,
      addTask, updateTask, deleteTask, addSubTask, toggleSubTask, deleteSubTask,
      addNote, updateNote, deleteNote,
      updateSettings, renameTag, deleteTag,
      addTimetableEntry, updateTimetableEntry, deleteTimetableEntry,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
