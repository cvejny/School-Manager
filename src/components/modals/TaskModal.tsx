import { useState, useEffect, useRef } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PRIORITY_CONFIG } from '../../utils/helpers';
import type { Task, Priority, TaskStatus, RecurringInterval, RecurringEnd } from '../../types';

interface Props {
  task?: Task;
  defaultSubjectId?: string;
  onClose: () => void;
  onSaved?: (task: Task) => void;
}

export default function TaskModal({ task, defaultSubjectId, onClose, onSaved }: Props) {
  const { data, addTask, updateTask } = useApp();
  const titleInputRef = useRef<HTMLInputElement>(null);

  const getPrefix = (sId: string) => {
    if (!data.settings.abbreviationPrefix || task) return '';
    const abbr = data.subjects.find(s => s.id === sId)?.abbreviation;
    return abbr ? `${abbr} - ` : '';
  };

  const initialPrefix = getPrefix(task?.subjectId || defaultSubjectId || data.subjects[0]?.id || '');
  const [title, setTitle] = useState(task?.title || initialPrefix);
  const [description, setDescription] = useState(task?.description || '');
  const [subjectId, setSubjectId] = useState(task?.subjectId || defaultSubjectId || data.subjects[0]?.id || '');
  const [priority, setPriority] = useState<Priority>(task?.priority || 'medium');
  const [status, setStatus] = useState<TaskStatus>(task?.status || 'todo');
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.split('T')[0] : '');
  const [dueTime, setDueTime] = useState(task?.dueDate ? (task.dueDate.includes('T') ? task.dueDate.split('T')[1].slice(0, 5) : '') : '');
  const [allDay, setAllDay] = useState(!task?.dueDate?.includes('T'));
  const [startDate, setStartDate] = useState(task?.startDate ? task.startDate.split('T')[0] : '');
  const [startTime, setStartTime] = useState(task?.startDate ? (task.startDate.includes('T') ? task.startDate.split('T')[1].slice(0, 5) : '') : '');
  const [dateMode, setDateMode] = useState<'deadline' | 'range'>(task?.startDate ? 'range' : 'deadline');
  const [tags, setTags] = useState<Set<string>>(new Set(task?.tags ?? []));
  const [recurring, setRecurring] = useState(task?.recurring || false);
  const [recurringInterval, setRecurringInterval] = useState<RecurringInterval>(task?.recurringInterval || 'weekly');
  const [recurringEnd, setRecurringEnd] = useState<RecurringEnd>(task?.recurringEnd || 'forever');
  const [recurringEndCount, setRecurringEndCount] = useState<number>(task?.recurringEndCount ?? 5);
  const [recurringEndDate, setRecurringEndDate] = useState<string>(task?.recurringEndDate ?? '');

  // When subject changes, swap the prefix in the title
  const handleSubjectChange = (newSubjectId: string) => {
    const oldPrefix = getPrefix(subjectId);
    const newPrefix = getPrefix(newSubjectId);
    setSubjectId(newSubjectId);
    if (!task && data.settings.abbreviationPrefix) {
      setTitle(prev => {
        const body = prev.startsWith(oldPrefix) ? prev.slice(oldPrefix.length) : prev;
        return newPrefix + body;
      });
      // Place cursor after the prefix
      setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
          const pos = newPrefix.length;
          titleInputRef.current.setSelectionRange(pos, pos);
        }
      }, 0);
    }
  };

  // On first render, place cursor after prefix
  useEffect(() => {
    if (!task && initialPrefix && titleInputRef.current) {
      titleInputRef.current.setSelectionRange(initialPrefix.length, initialPrefix.length);
    }
  }, []);

  const storedTagOrder: string[] = (() => { try { return JSON.parse(localStorage.getItem('tag_order') || '[]'); } catch { return []; } })();
  const existingTags = Array.from(new Set([
    ...storedTagOrder,
    ...data.tasks.filter(t => t.id !== task?.id).flatMap(t => t.tags),
  ])).sort();

  const toggleTag = (tag: string) => {
    setTags(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  const handleSave = () => {
    if (!title.trim() || !subjectId) return;
    const taskData = {
      title: title.trim(),
      description,
      subjectId,
      priority,
      status,
      dueDate: dueDate ? ((!allDay && dueTime) ? `${dueDate}T${dueTime}` : dueDate) : null,
      startDate: dateMode === 'range' && startDate ? ((!allDay && startTime) ? `${startDate}T${startTime}` : startDate) : null,
      subTasks: task?.subTasks || [],
      tags: Array.from(tags),
      recurring,
      recurringInterval: recurring ? recurringInterval : null,
      recurringEnd: recurring ? recurringEnd : 'forever',
      recurringEndCount: recurring && recurringEnd === 'count' ? recurringEndCount : null,
      recurringEndDate: recurring && recurringEnd === 'date' ? recurringEndDate || null : null,
    };
    if (task) {
      updateTask(task.id, taskData);
      onSaved?.({ ...task, ...taskData });
    } else {
      const t = addTask(taskData);
      onSaved?.(t);
    }
    onClose();
  };

  const priorities: Priority[] = ['low', 'medium', 'high', 'urgent'];
  const statuses: { value: TaskStatus; label: string }[] = [
    { value: 'todo', label: 'K udělání' },
    { value: 'in_progress', label: 'Probíhá' },
    { value: 'done', label: 'Hotovo' },
    { value: 'wont_do', label: 'Neděláno' },
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold">{task ? 'Upravit úkol' : 'Nový úkol'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="label">Název úkolu *</label>
            <input
              ref={titleInputRef}
              className="input"
              placeholder="Co je potřeba udělat?"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="label">Popis</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Detaily, poznámky, instrukce..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Předmět *</label>
              <select className="select" value={subjectId} onChange={e => handleSubjectChange(e.target.value)}>
                {data.subjects.length === 0 && <option value="">Nejprve přidej předmět</option>}
                {data.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Stav</label>
              <select className="select" value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
                {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Priorita</label>
            <div className="flex gap-2">
              {priorities.map(p => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all duration-150 ${
                      priority === p
                        ? `${cfg.bg} ${cfg.color} ${cfg.border} shadow-sm`
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date / time */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Datum</label>
              <div className="flex items-center gap-2">
                {/* All-day toggle */}
                <button
                  type="button"
                  onClick={() => setAllDay(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    allDay
                      ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 border-primary-300 dark:border-primary-700'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-transparent hover:border-gray-300'
                  }`}
                >
                  Celý den
                </button>
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                  {([{ v: 'deadline', l: 'Termín' }, { v: 'range', l: 'Trvání' }] as const).map(opt => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setDateMode(opt.v)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        dateMode === opt.v
                          ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                          : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {dateMode === 'deadline' ? (
              allDay ? (
                <input type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Datum splnění</p>
                    <input type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Čas splnění</p>
                    <input type="time" className="input" value={dueTime} onChange={e => setDueTime(e.target.value)} disabled={!dueDate} />
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-2">
                <div className={`grid gap-3 ${allDay ? 'grid-cols-2' : 'grid-cols-2'}`}>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Začátek</p>
                    <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  {!allDay && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Začátek — čas</p>
                      <input type="time" className="input" value={startTime} onChange={e => setStartTime(e.target.value)} disabled={!startDate} />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Konec</p>
                    <input type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                  </div>
                  {!allDay && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Konec — čas</p>
                      <input type="time" className="input" value={dueTime} onChange={e => setDueTime(e.target.value)} disabled={!dueDate} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="label">Štítky</label>
            {/* Existing tag chips */}
            {existingTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {existingTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      tags.has(tag)
                        ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 border-primary-300 dark:border-primary-700'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
            {/* Free-text input for new tags */}
            <input
              className="input"
              placeholder="nový štítek"
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const val = (e.currentTarget.value || '').trim();
                  if (val) { toggleTag(val); e.currentTarget.value = ''; }
                }
              }}
              onBlur={e => {
                const val = e.currentTarget.value.trim();
                if (val) { toggleTag(val); e.currentTarget.value = ''; }
              }}
            />
            {tags.size > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {Array.from(tags).map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400">
                    {tag}
                    <button type="button" onClick={() => toggleTag(tag)} className="hover:text-red-500 transition-colors">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Recurring */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="label mb-0 flex items-center gap-1.5">
                <RefreshCw size={14} />
                Opakující se úkol
              </label>
              <button
                type="button"
                onClick={() => setRecurring(r => !r)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  recurring ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  recurring ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            {recurring && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  {(['daily', 'weekly', 'biweekly', 'monthly'] as RecurringInterval[]).map(iv => {
                    const labels: Record<RecurringInterval, string> = { daily: 'Denně', weekly: 'Týdně', biweekly: 'Á 2 týdny', monthly: 'Měsíčně' };
                    return (
                      <button
                        key={iv}
                        type="button"
                        onClick={() => setRecurringInterval(iv)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          recurringInterval === iv
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border-primary-300 dark:border-primary-700'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                        }`}
                      >
                        {labels[iv]}
                      </button>
                    );
                  })}
                </div>
                {/* End condition */}
                <div className="flex gap-1.5">
                  {([['forever', 'Do nekonečna'], ['count', 'Počet'], ['date', 'Do data']] as [RecurringEnd, string][]).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRecurringEnd(val)}
                      className={`flex-1 py-1 rounded-lg text-xs font-medium border transition-all ${
                        recurringEnd === val
                          ? 'bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900 border-transparent'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-400 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {recurringEnd === 'count' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={recurringEndCount}
                      onChange={e => setRecurringEndCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="input w-20 text-center"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">opakování</span>
                  </div>
                )}
                {recurringEnd === 'date' && (
                  <input
                    type="date"
                    value={recurringEndDate}
                    onChange={e => setRecurringEndDate(e.target.value)}
                    className="input w-full"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button className="btn-secondary flex-1" onClick={onClose}>Zrušit</button>
          <button className="btn-primary flex-1" onClick={handleSave} disabled={!title.trim() || !subjectId}>
            {task ? 'Uložit' : 'Vytvořit úkol'}
          </button>
        </div>
      </div>
    </div>
  );
}
