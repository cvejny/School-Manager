import { useState } from 'react';
import {
  X, Edit3, Trash2, Plus, Check, Circle, Flag,
  Calendar, Tag, ChevronDown, ChevronRight, BookOpen, Clock, Ban,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useApp } from '../context/AppContext';
import { PRIORITY_CONFIG, formatDueDate, isOverdue, hasExplicitTime } from '../utils/helpers';
import DynamicIcon from './DynamicIcon';
import type { Task } from '../types';
import TaskModal from './modals/TaskModal';

interface Props {
  task: Task;
  onClose: () => void;
  onDeleted?: () => void;
}

export default function TaskDetail({ task, onClose, onDeleted }: Props) {
  const { data, addSubTask, toggleSubTask, deleteSubTask, deleteTask, updateTask } = useApp();
  const [showEdit, setShowEdit] = useState(false);
  const [newSubTask, setNewSubTask] = useState('');
  const [showSubTaskInput, setShowSubTaskInput] = useState(false);

  const subject = data.subjects.find(s => s.id === task.subjectId);
  const cfg = PRIORITY_CONFIG[task.priority];
  const overdue = isOverdue(task.dueDate);

  const formatDateLabel = (dateStr: string) => {
    const d = parseISO(dateStr);
    const datePart = format(d, 'd. M. yyyy', { locale: cs });
    return hasExplicitTime(dateStr)
      ? `${datePart}, ${dateStr.split('T')[1].slice(0, 5)}`
      : datePart;
  };

  const dateLabel = (() => {
    if (!task.dueDate) return null;
    if (task.startDate) {
      const from = formatDateLabel(task.startDate);
      const to = formatDateLabel(task.dueDate);
      return `${from} – ${to}`;
    }
    return formatDateLabel(task.dueDate);
  })();

  const handleAddSubTask = () => {
    if (!newSubTask.trim()) return;
    addSubTask(task.id, { title: newSubTask.trim(), done: false });
    setNewSubTask('');
  };

  const handleDelete = () => {
    if (confirm('Opravdu smazat tento úkol?')) {
      deleteTask(task.id);
      onDeleted?.();
      onClose();
    }
  };

  const toggleStatus = () => {
    const next = task.status === 'wont_do' ? 'todo' : task.status === 'done' ? 'wont_do' : task.status === 'todo' ? 'in_progress' : 'done';
    updateTask(task.id, { status: next });
  };

  const statusConfig = {
    todo: { label: 'K udělání', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
    in_progress: { label: 'Probíhá', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/40' },
    done: { label: 'Hotovo', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/40' },
    wont_do: { label: 'Neděláno', color: 'text-gray-400 dark:text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
  };

  const completedSubTasks = task.subTasks.filter(st => st.done).length;

  return (
    <>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal-content max-w-2xl">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-100 dark:border-gray-800 gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <button
                onClick={toggleStatus}
                className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  task.status === 'done'
                    ? 'bg-green-500 border-green-500 text-white'
                    : task.status === 'in_progress'
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : task.status === 'wont_do'
                    ? 'bg-gray-200 border-gray-300 dark:bg-gray-700 dark:border-gray-600 text-gray-400'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
                }`}
              >
                {task.status === 'done' && <Check size={12} />}
                {task.status === 'in_progress' && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                {task.status === 'wont_do' && <Ban size={11} />}
              </button>
              <div className="flex-1 min-w-0">
                <h2 className={`text-xl font-bold ${task.status === 'done' || task.status === 'wont_do' ? 'line-through text-gray-400' : ''}`}>
                  {task.title}
                </h2>
                {subject && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center"
                      style={{ backgroundColor: subject.color + '30', color: subject.color }}
                    >
                      <DynamicIcon name={subject.icon} size={10} />
                    </div>
                    <span className="text-sm text-gray-500">{subject.abbreviation || subject.name}</span>
                  </div>
                )}
                {dateLabel && (
                  <div className={`flex items-center gap-1.5 mt-1.5 text-sm font-medium ${overdue ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
                    <Calendar size={13} className="flex-shrink-0" />
                    <span>{dateLabel}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => setShowEdit(true)} className="btn-ghost p-1.5 rounded-lg" title="Upravit"><Edit3 size={16} /></button>
              <button onClick={handleDelete} className="btn-ghost p-1.5 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Smazat"><Trash2 size={16} /></button>
              <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg ml-1"><X size={18} /></button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Meta badges */}
            <div className="flex flex-wrap gap-2">
              <span className={`badge ${cfg.bg} ${cfg.color}`}>
                <Flag size={10} className="mr-1" />{cfg.label}
              </span>
              <span className={`badge ${statusConfig[task.status].bg} ${statusConfig[task.status].color}`}>
                {statusConfig[task.status].label}
              </span>
              {task.dueDate && (
                <span className={`badge ${overdue ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                  <Calendar size={10} className="mr-1" />
                  {formatDueDate(task.dueDate)}
                </span>
              )}
              {task.tags.map(tag => (
                <span key={tag} className="badge bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                  <Tag size={10} className="mr-1" />{tag}
                </span>
              ))}
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Popis</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{task.description}</p>
              </div>
            )}

            {/* SubTasks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Podúkoly {task.subTasks.length > 0 && `(${completedSubTasks}/${task.subTasks.length})`}
                </h3>
                <button
                  onClick={() => setShowSubTaskInput(!showSubTaskInput)}
                  className="btn-ghost text-xs py-1 px-2"
                >
                  <Plus size={12} />Přidat
                </button>
              </div>

              {/* Progress bar */}
              {task.subTasks.length > 0 && (
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mb-3 overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-300"
                    style={{ width: `${(completedSubTasks / task.subTasks.length) * 100}%` }}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                {task.subTasks.map(st => (
                  <div key={st.id} className="flex items-center gap-2.5 group p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <button
                      onClick={() => toggleSubTask(task.id, st.id)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        st.done ? 'bg-primary-500 border-primary-500 text-white' : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
                      }`}
                    >
                      {st.done && <Check size={10} />}
                    </button>
                    <span className={`flex-1 text-sm ${st.done ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {st.title}
                    </span>
                    <button
                      onClick={() => deleteSubTask(task.id, st.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {showSubTaskInput && (
                <div className="flex gap-2 mt-2">
                  <input
                    className="input flex-1 text-sm py-1.5"
                    placeholder="Název podúkolu..."
                    value={newSubTask}
                    onChange={e => setNewSubTask(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddSubTask(); if (e.key === 'Escape') setShowSubTaskInput(false); }}
                    autoFocus
                  />
                  <button className="btn-primary px-3 py-1.5 text-sm" onClick={handleAddSubTask}>Přidat</button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {showEdit && (
        <TaskModal
          task={task}
          onClose={() => setShowEdit(false)}
          onSaved={() => setShowEdit(false)}
        />
      )}
    </>
  );
}
