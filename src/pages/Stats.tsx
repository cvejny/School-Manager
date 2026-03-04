import { BarChart2, CheckCircle2, AlertCircle, Clock, TrendingUp, Ban } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isOverdue } from '../utils/helpers';
import { PRIORITY_CONFIG } from '../utils/helpers';
import { subDays, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';

export default function Stats() {
  const { data } = useApp();
  const { tasks, subjects } = data;

  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'done').length;
  const wontDo = tasks.filter(t => t.status === 'wont_do').length;
  const overdue = tasks.filter(t => t.status !== 'done' && t.status !== 'wont_do' && isOverdue(t.dueDate)).length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  // Per-subject stats
  const subjectStats = subjects.map(s => {
    const subjectTasks = tasks.filter(t => t.subjectId === s.id);
    const subjectDone = subjectTasks.filter(t => t.status === 'done').length;
    return { subject: s, total: subjectTasks.length, done: subjectDone };
  }).filter(s => s.total > 0).sort((a, b) => b.total - a.total);

  const maxSubjectTotal = Math.max(...subjectStats.map(s => s.total), 1);

  // Last 7 days activity
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const dayStart = startOfDay(day);
    const dayEnd = new Date(dayStart.getTime() + 86400000 - 1);
    const due = tasks.filter(t => t.dueDate && isAfter(parseISO(t.dueDate), new Date(dayStart.getTime() - 1)) && isBefore(parseISO(t.dueDate), dayEnd)).length;
    return { day, due };
  });
  const maxActivity = Math.max(...last7.map(d => d.due), 1);

  // Priority distribution
  const priorityCounts = (['urgent', 'high', 'medium', 'low'] as const).map(p => ({
    priority: p,
    count: tasks.filter(t => t.priority === p).length,
    cfg: PRIORITY_CONFIG[p],
  }));

  const statCards = [
    { label: 'Celkem úkolů', value: total, icon: <BarChart2 size={20} />, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-900/20' },
    { label: 'Splněno', value: done, icon: <CheckCircle2 size={20} />, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Probíhá', value: inProgress, icon: <Clock size={20} />, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Po termínu', value: overdue, icon: <AlertCircle size={20} />, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Neděláno', value: wontDo, icon: <Ban size={20} />, color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800' },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart2 size={24} className="text-primary-500" />
          Statistiky
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Přehled plnění úkolů</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {statCards.map(card => (
          <div key={card.label} className="card p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.bg} ${card.color}`}>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
            <p className="text-sm text-gray-400 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Completion rate + Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Completion rate */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-primary-500" />
            <h2 className="font-bold text-gray-800 dark:text-gray-200">Míra plnění</h2>
          </div>
          <div className="flex items-end gap-4">
            <span className="text-4xl font-bold text-primary-600 dark:text-primary-400">{completionRate}%</span>
            <span className="text-gray-400 text-sm mb-1">{done} z {total} úkolů</span>
          </div>
          <div className="mt-4 bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-700"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Priority distribution */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-800 dark:text-gray-200 mb-4">Rozdělení podle priority</h2>
          <div className="space-y-3">
            {priorityCounts.map(({ priority, count, cfg }) => (
              <div key={priority} className="flex items-center gap-3">
                <span className={`text-xs font-semibold w-20 ${cfg.color}`}>{cfg.label}</span>
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${cfg.bg}`}
                    style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per-subject */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-6">
          <h2 className="font-bold text-gray-800 dark:text-gray-200 mb-4">Úkoly podle předmětu</h2>
          {subjectStats.length === 0 ? (
            <p className="text-gray-400 text-sm">Žádné předměty s úkoly</p>
          ) : (
            <div className="space-y-3">
              {subjectStats.map(({ subject, total: st, done: sd }) => (
                <div key={subject.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{subject.abbreviation || subject.name}</span>
                    <span className="text-xs text-gray-400">{sd}/{st}</span>
                  </div>
                  <div className="relative bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(st / maxSubjectTotal) * 100}%`, backgroundColor: subject.color + '40' }}
                    />
                    <div
                      className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                      style={{ width: `${st > 0 ? (sd / maxSubjectTotal) * 100 : 0}%`, backgroundColor: subject.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Last 7 days */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-800 dark:text-gray-200 mb-4">Úkoly za posledních 7 dní</h2>
          <div className="flex items-end gap-1.5 h-32">
            {last7.map(({ day, due }, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end" style={{ height: '96px' }}>
                  <div
                    className="w-full rounded-t-md bg-primary-400 dark:bg-primary-600 transition-all duration-500 min-h-[4px]"
                    style={{ height: `${Math.max((due / maxActivity) * 96, due > 0 ? 4 : 0)}px` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400">
                  {['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'][day.getDay()]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
