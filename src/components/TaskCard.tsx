import { Calendar, CheckSquare, Flag, Clock } from 'lucide-react';
import { PRIORITY_CONFIG, formatDueDate, isOverdue, hasExplicitTime } from '../utils/helpers';
import DynamicIcon from './DynamicIcon';
import { useApp } from '../context/AppContext';
import type { Task } from '../types';

interface Props {
  task: Task;
  onClick: () => void;
  showSubject?: boolean;
}

export default function TaskCard({ task, onClick, showSubject = true }: Props) {
  const { data, updateTask } = useApp();
  const subject = data.subjects.find(s => s.id === task.subjectId);
  const cfg = PRIORITY_CONFIG[task.priority];
  const overdue = isOverdue(task.dueDate);
  const completedSubs = task.subTasks.filter(s => s.done).length;
  const isDone = task.status === 'done' || task.status === 'wont_do';

  return (
    <div
      onClick={onClick}
      className={`card p-4 cursor-pointer hover:shadow-md transition-all duration-150 hover:-translate-y-0.5 group ${isDone ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Priority indicator */}
        <div className={`w-1 h-full min-h-[2.5rem] rounded-full flex-shrink-0 self-stretch`} style={{ backgroundColor: task.priority === 'low' ? '#22c55e' : task.priority === 'medium' ? '#eab308' : task.priority === 'high' ? '#f97316' : '#ef4444' }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-semibold text-gray-900 dark:text-gray-100 leading-snug ${isDone ? 'line-through text-gray-400 dark:text-gray-600' : ''}`}>
              {task.title}
            </h3>
            <span className={`badge flex-shrink-0 ${cfg.bg} ${cfg.color} text-xs`}>
              {cfg.label}
            </span>
          </div>

          {task.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{task.description}</p>
          )}

          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            {showSubject && subject && (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-4 h-4 rounded flex items-center justify-center"
                  style={{ backgroundColor: subject.color + '30', color: subject.color }}
                >
                  <DynamicIcon name={subject.icon} size={10} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{subject.abbreviation || subject.name}</span>
              </div>
            )}

            {task.dueDate && (
              <div className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
                <Calendar size={11} />
                <span>{formatDueDate(task.dueDate)}</span>
                {hasExplicitTime(task.dueDate) && (
                  <>
                    <Clock size={10} className="ml-0.5" />
                    <span>{task.dueDate.split('T')[1].slice(0, 5)}</span>
                  </>
                )}
              </div>
            )}

            {task.subTasks.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                <CheckSquare size={11} />
                <span>{completedSubs}/{task.subTasks.length}</span>
              </div>
            )}

            {task.tags.slice(0, 2).map(tag => (
              <span key={tag} className="badge bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
