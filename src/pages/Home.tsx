import { useState, useRef, useEffect } from 'react';
import { Plus, CheckCircle2, Clock, AlertTriangle, CalendarX, Settings2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sortTasks, isDueSoon, isOverdue, PRIORITY_CONFIG } from '../utils/helpers';
import TaskCard from '../components/TaskCard';
import TaskDetail from '../components/TaskDetail';
import TaskModal from '../components/modals/TaskModal';
import type { Task, Priority } from '../types';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

export default function Home() {
  const { data } = useApp();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAllSection, setShowAllSection] = useState(true);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterSubjects, setFilterSubjects] = useState<Set<string>>(new Set(['all']));
  const [filterPriorities, setFilterPriorities] = useState<Set<string>>(new Set(['all']));
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set(['all']));
  const [allSort, setAllSort] = useState<'dueDate' | 'priority' | 'title'>('dueDate');
  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { settings } = data;
  const allTasks = data.tasks;

  // All unique tags across tasks
  const allTags = Array.from(new Set(allTasks.flatMap(t => t.tags))).sort();
  const allPriorities: Priority[] = ['urgent', 'high', 'medium', 'low'];

  // Filter helpers
  const toggleFilter = <T extends string>(set: Set<T>, value: T, setFn: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (value === 'all' as T) {
      setFn(new Set(['all' as T]));
      return;
    }
    next.delete('all' as T);
    if (next.has(value)) { next.delete(value); if (next.size === 0) next.add('all' as T); }
    else next.add(value);
    setFn(next);
  };

  // Apply filters for "Vše" section
  const allTasksFiltered = allTasks.filter(t => {
    if (t.status === 'done' || t.status === 'wont_do') return false;
    const subjectOk = filterSubjects.has('all') || filterSubjects.has(t.subjectId);
    const priorityOk = filterPriorities.has('all') || filterPriorities.has(t.priority);
    const tagOk = filterTags.has('all') || t.tags.some(tag => filterTags.has(tag));
    return subjectOk && priorityOk && tagOk;
  });

  const hasActiveFilter =
    !filterSubjects.has('all') || !filterPriorities.has('all') || !filterTags.has('all');

  const upcomingTasks = allTasks.filter(t =>
    t.status !== 'done' && t.status !== 'wont_do' && isDueSoon(t.dueDate, settings.upcomingDays)
  );
  const overdueTasks = allTasks.filter(t => t.status !== 'done' && t.status !== 'wont_do' && isOverdue(t.dueDate));
  const noDateTasks = allTasks.filter(t => t.status !== 'done' && t.status !== 'wont_do' && !t.dueDate);
  const doneTasks = allTasks.filter(t => t.status === 'done');

  const sortedUpcoming = sortTasks(upcomingTasks, settings.defaultSort);
  const sortedOverdue = sortTasks(overdueTasks, 'dueDate');
  const sortedNoDate = sortTasks(noDateTasks, settings.defaultSort);

  const today = format(new Date(), 'EEEE, d. MMMM yyyy', { locale: cs });

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-1 capitalize">{today}</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Přehled</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowTaskModal(true)}>
          <Plus size={18} />
          Nový úkol
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-red-500" />
            <span className="text-xs font-medium text-gray-500">Po termínu</span>
          </div>
          <p className="text-2xl font-bold text-red-500">{overdueTasks.length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-primary-500" />
            <span className="text-xs font-medium text-gray-500">Do {settings.upcomingDays} dní</span>
          </div>
          <p className="text-2xl font-bold text-primary-600">{upcomingTasks.length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarX size={16} className="text-gray-400" />
            <span className="text-xs font-medium text-gray-500">Bez termínu</span>
          </div>
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-300">{noDateTasks.length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={16} className="text-green-500" />
            <span className="text-xs font-medium text-gray-500">Dokončeno</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{doneTasks.length}</p>
        </div>
      </div>

      {/* Overdue */}
      {sortedOverdue.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-red-500" />
            <h2 className="text-lg font-bold text-red-600 dark:text-red-400">Po termínu</h2>
            <span className="badge bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400">{sortedOverdue.length}</span>
          </div>
          <div className="space-y-2.5">
            {sortedOverdue.map(task => (
              <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {sortedUpcoming.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-primary-500" />
            <h2 className="text-lg font-bold">Nadcházející ({settings.upcomingDays} dní)</h2>
            <span className="badge bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">{sortedUpcoming.length}</span>
          </div>
          <div className="space-y-2.5">
            {sortedUpcoming.map(task => (
              <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
            ))}
          </div>
        </section>
      )}

      {/* No due date */}
      {sortedNoDate.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <CalendarX size={18} className="text-gray-400" />
            <h2 className="text-lg font-bold text-gray-600 dark:text-gray-400">Bez termínu</h2>
            <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{sortedNoDate.length}</span>
          </div>
          <div className="space-y-2.5">
            {sortedNoDate.map(task => (
              <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {allTasks.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-primary-50 dark:bg-primary-900/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={36} className="text-primary-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Žádné úkoly</h3>
          <p className="text-gray-400 mb-6 max-w-xs mx-auto">Přidej si první úkol nebo nejprve vytvoř předmět, do kterého budeš úkoly řadit.</p>
          <button className="btn-primary" onClick={() => setShowTaskModal(true)}>
            <Plus size={16} />Přidat úkol
          </button>
        </div>
      )}

      {selectedTask && (() => { const liveTask = data.tasks.find(t => t.id === selectedTask.id); return liveTask ? (
        <TaskDetail
          task={liveTask}
          onClose={() => setSelectedTask(null)}
          onDeleted={() => setSelectedTask(null)}
        />
      ) : null; })()}

      {showTaskModal && (
        <TaskModal onClose={() => setShowTaskModal(false)} />
      )}

      {/* Vše section */}
      <section className="mt-2">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setShowAllSection(v => !v)}
            className="flex items-center gap-2 hover:text-primary-500 transition-colors"
          >
            {showAllSection ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300">Vše</h2>
          </button>
          <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">{allTasksFiltered.length}</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              {([{ v: 'dueDate', l: 'Datum' }, { v: 'priority', l: 'Priorita' }, { v: 'title', l: 'Název' }] as const).map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setAllSort(opt.v)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    allSort === opt.v
                      ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
            <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilterPanel(v => !v)}
              className={`p-1.5 rounded-lg transition-colors ${
                hasActiveFilter
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'btn-ghost text-gray-400 hover:text-gray-600'
              }`}
              title="Filtrovat"
            >
              <Settings2 size={17} />
            </button>

            {showFilterPanel && (
              <div className="absolute right-0 top-9 z-50 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl p-4 w-72 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">Filtrovat úkoly</span>
                  {hasActiveFilter && (
                    <button
                      onClick={() => {
                        setFilterSubjects(new Set(['all']));
                        setFilterPriorities(new Set(['all']));
                        setFilterTags(new Set(['all']));
                      }}
                      className="text-xs text-red-400 hover:text-red-500 flex items-center gap-1"
                    >
                      <X size={12} />Resetovat
                    </button>
                  )}
                </div>

                {/* Předmět */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Předmět</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setFilterSubjects(new Set(['all']))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        filterSubjects.has('all')
                          ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >Vše</button>
                    {data.subjects.map(s => (
                      <button
                        key={s.id}
                        onClick={() => toggleFilter(filterSubjects, s.id, setFilterSubjects)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          filterSubjects.has(s.id)
                            ? 'text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                        style={filterSubjects.has(s.id) ? { backgroundColor: s.color } : undefined}
                      >{s.name}</button>
                    ))}
                  </div>
                </div>

                {/* Priorita */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Priorita</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setFilterPriorities(new Set(['all']))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        filterPriorities.has('all')
                          ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >Vše</button>
                    {allPriorities.map(p => {
                      const cfg = PRIORITY_CONFIG[p];
                      return (
                        <button
                          key={p}
                          onClick={() => toggleFilter(filterPriorities, p, setFilterPriorities)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                            filterPriorities.has(p)
                              ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >{cfg.label}</button>
                      );
                    })}
                  </div>
                </div>

                {/* Štítky */}
                {allTags.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Štítky</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setFilterTags(new Set(['all']))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          filterTags.has('all')
                            ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >Vše</button>
                      {allTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleFilter(filterTags, tag, setFilterTags)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                            filterTags.has(tag)
                              ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >{tag}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>

        {showAllSection && (
          allTasksFiltered.length === 0 ? (
            <p className="text-gray-400 text-sm">Žádné úkoly odpovídají filtru.</p>
          ) : (
            <div className="space-y-2.5">
              {sortTasks(allTasksFiltered, allSort).map(task => (
                <TaskCard key={task.id} task={task} onClick={() => setSelectedTask(task)} />
              ))}
            </div>
          )
        )}
      </section>
    </div>
  );
}
