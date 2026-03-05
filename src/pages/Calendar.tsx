import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO,
  format, addMonths, subMonths, startOfDay, isBefore, isAfter,
  differenceInCalendarDays, addDays, addWeeks,
} from 'date-fns';
import { cs } from 'date-fns/locale';
import { useApp } from '../context/AppContext';
import type { Task, Subject } from '../types';
import type { RecurringInterval } from '../types';
import TaskDetail from '../components/TaskDetail';

const MAX_VISIBLE_LANES = 3;

interface CalEvent {
  task: Task;
  subject: Subject | undefined;
  startDay: Date;
  endDay: Date;
  virtual?: boolean;
}

interface WeekSlot {
  event: CalEvent;
  lane: number;
  startCol: number;
  endCol: number;
  isStart: boolean;
  isEnd: boolean;
}

const DAY_LABELS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

function advanceDate(date: Date, interval: RecurringInterval): Date {
  switch (interval) {
    case 'daily': return addDays(date, 1);
    case 'weekly': return addWeeks(date, 1);
    case 'biweekly': return addWeeks(date, 2);
    case 'monthly': return addMonths(date, 1);
  }
}

function intervalToDays(interval: RecurringInterval): number {
  switch (interval) {
    case 'daily': return 1;
    case 'weekly': return 7;
    case 'biweekly': return 14;
    case 'monthly': return 30;
  }
}

function expandRecurring(task: Task, gridStart: Date, gridEnd: Date, subject: Subject | undefined): CalEvent[] {
  if (!task.recurring || !task.recurringInterval || !task.dueDate) return [];
  if (task.status === 'done' || task.status === 'wont_do') return [];

  const events: CalEvent[] = [];
  const baseDue = startOfDay(parseISO(task.dueDate));
  const baseStart = task.startDate ? startOfDay(parseISO(task.startDate)) : baseDue;
  // Duration in days between startDate and dueDate of the original task.
  // Safeguard: if duration >= interval length the data is corrupted — virtual occurrences appear as single-day.
  const rawDuration = differenceInCalendarDays(baseDue, baseStart);
  const intervalDays = intervalToDays(task.recurringInterval);
  const durationDays = rawDuration >= intervalDays ? 0 : rawDuration;

  let currentDue = advanceDate(baseDue, task.recurringInterval);
  const endDate = task.recurringEndDate ? startOfDay(parseISO(task.recurringEndDate)) : null;
  let count = 1; // first occurrence is the real task
  const maxCount = task.recurringEndCount ?? Infinity;

  while (!isAfter(currentDue, gridEnd) && count < 500) {
    count++;
    if (task.recurringEnd === 'count' && count > maxCount) break;
    if (task.recurringEnd === 'date' && endDate && isAfter(currentDue, endDate)) break;
    const currentStart = durationDays > 0 ? addDays(currentDue, -durationDays) : currentDue;
    if (!isBefore(currentDue, gridStart)) {
      const dueDateStr = task.dueDate.includes('T')
        ? format(currentDue, "yyyy-MM-dd") + 'T' + task.dueDate.split('T')[1]
        : format(currentDue, 'yyyy-MM-dd');
      const startDateStr = durationDays > 0 && task.startDate
        ? (task.startDate.includes('T')
            ? format(currentStart, "yyyy-MM-dd") + 'T' + task.startDate.split('T')[1]
            : format(currentStart, 'yyyy-MM-dd'))
        : null;
      const virtualTask: Task = { ...task, id: task.id, dueDate: dueDateStr, startDate: startDateStr };
      events.push({ task: virtualTask, subject, startDay: currentStart, endDay: currentDue, virtual: true });
    }
    currentDue = advanceDate(currentDue, task.recurringInterval);
  }
  return events;
}

// Returns luminance 0 (black) – 1 (white)
function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export default function Calendar() {
  const { data } = useApp();
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const isDarkMode = document.documentElement.classList.contains('dark');

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Build events sorted: multi-day first, then chronological
  const realEvents: CalEvent[] = data.tasks
    .filter(t => t.dueDate)
    .map(t => {
      const end = startOfDay(parseISO(t.dueDate!));
      const start = t.startDate ? startOfDay(parseISO(t.startDate)) : end;
      return {
        task: t,
        subject: data.subjects.find(s => s.id === t.subjectId),
        startDay: start,
        endDay: end,
      };
    })
    .filter(e =>
      !isBefore(e.endDay, startOfDay(gridStart)) &&
      !isAfter(e.startDay, startOfDay(gridEnd))
    );

  // Expand recurring tasks into virtual future occurrences within the visible grid
  const virtualEvents: CalEvent[] = data.tasks.flatMap(t =>
    expandRecurring(t, startOfDay(gridStart), startOfDay(gridEnd), data.subjects.find(s => s.id === t.subjectId))
  );

  const calEvents: CalEvent[] = [...realEvents, ...virtualEvents]
    .sort((a, b) => {
      const aDur = differenceInCalendarDays(a.endDay, a.startDay);
      const bDur = differenceInCalendarDays(b.endDay, b.startDay);
      if (bDur !== aDur) return bDur - aDur;
      return differenceInCalendarDays(a.startDay, b.startDay);
    });

  function getWeekSlots(week: Date[]): WeekSlot[] {
    const weekStart = startOfDay(week[0]);
    const weekEnd = startOfDay(week[6]);

    const overlapping = calEvents
      .filter(e =>
        !isBefore(e.endDay, weekStart) && !isAfter(e.startDay, weekEnd)
      )
      .map(event => {
        const effStart = isBefore(event.startDay, weekStart) ? weekStart : event.startDay;
        const effEnd = isAfter(event.endDay, weekEnd) ? weekEnd : event.endDay;
        const startCol = differenceInCalendarDays(effStart, weekStart);
        const endCol = differenceInCalendarDays(effEnd, weekStart);
        return { event, startCol, endCol };
      })
      // Sort per-week: wider spans first, then by startCol ascending
      .sort((a, b) => {
        const aDur = a.endCol - a.startCol;
        const bDur = b.endCol - b.startCol;
        if (bDur !== aDur) return bDur - aDur;
        return a.startCol - b.startCol;
      });

    // Track occupied column ranges per lane
    const laneSegments: Array<{ start: number; end: number }[]> = [];

    const result = overlapping.map(({ event, startCol, endCol }) => {
      let lane = 0;
      while (
        lane < laneSegments.length &&
        laneSegments[lane].some(seg => seg.start <= endCol && seg.end >= startCol)
      ) {
        lane++;
      }
      if (!laneSegments[lane]) laneSegments[lane] = [];
      laneSegments[lane].push({ start: startCol, end: endCol });

      return {
        event,
        lane,
        startCol,
        endCol,
        isStart: !isBefore(event.startDay, weekStart),
        isEnd: !isAfter(event.endDay, weekEnd),
      };
    });

    return result;
  }

  const selectedDayEvents = selected
    ? calEvents.filter(e => {
        const sel = startOfDay(selected);
        return !isBefore(sel, e.startDay) && !isAfter(sel, e.endDay);
      })
    : [];

  return (
    <div className="p-4 sm:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarIcon size={24} className="text-primary-500" />
            Kalendář
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">Přehled úkolů podle termínu</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-ghost p-2 rounded-xl" onClick={() => setCurrent(d => subMonths(d, 1))}>
            <ChevronLeft size={18} />
          </button>
          <span className="font-semibold text-gray-700 dark:text-gray-200 min-w-[160px] text-center">
            {format(current, 'LLLL yyyy', { locale: cs })}
          </span>
          <button className="btn-ghost p-2 rounded-xl" onClick={() => setCurrent(d => addMonths(d, 1))}>
            <ChevronRight size={18} />
          </button>
          <button
            className="btn-secondary text-sm"
            onClick={() => { setCurrent(new Date()); setSelected(new Date()); }}
          >
            Dnes
          </button>
        </div>
      </div>

      <div className="card p-4">
        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Weeks */}
        <div className="space-y-0.5">
          {weeks.map((week, wi) => {
            const slots = getWeekSlots(week);
            const maxLane = slots.length > 0 ? Math.max(...slots.map(s => s.lane)) : -1;
            const visibleLanes = Math.min(maxLane + 1, MAX_VISIBLE_LANES);

            return (
              <div key={wi} className="border-t border-gray-100 dark:border-gray-800 pt-0.5">
                {/* Day number row */}
                <div className="grid grid-cols-7">
                  {week.map(day => {
                    const isCurrentMonth = isSameMonth(day, current);
                    const isSelected = selected && isSameDay(day, selected);
                    const today = isToday(day);
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelected(isSelected ? null : day)}
                        className={`flex items-center justify-center h-9 rounded-lg transition-all ${
                          isSelected
                            ? 'bg-primary-50 dark:bg-primary-900/30'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        } ${!isCurrentMonth ? 'opacity-30' : ''}`}
                      >
                        <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                          today ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {format(day, 'd')}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Event lanes */}
                {Array.from({ length: visibleLanes }, (_, lane) => (
                  <div key={lane} className="grid grid-cols-7 h-6 mb-0.5">
                    {slots
                      .filter(s => s.lane === lane)
                      .map(({ event, startCol, endCol, isStart, isEnd }) => {
                        const color = event.subject?.color ?? '#6366f1';
                        const isDone = event.task.status === 'done';
                        // In dark mode, very dark colors become invisible — use lighter treatment
                        const isVeryDark = !isDone && isDarkMode && getLuminance(color) < 0.15;
                        const effectiveColor = isVeryDark ? '#e5e7eb' : color;
                        const bgColor = isDone ? '#e5e7eb' : (isVeryDark ? 'rgba(255,255,255,0.12)' : color + '28');
                        return (
                          <button
                            key={event.task.id + (event.virtual ? '-v-' + event.startDay.toISOString() : '')}
                            onClick={() => {
                              // For virtual events, find and open the original task
                              const original = event.virtual
                                ? data.tasks.find(t => t.id === event.task.id) ?? event.task
                                : event.task;
                              setSelectedTask(original);
                            }}
                            title={event.task.title}
                            style={{
                              gridColumn: `${startCol + 1} / ${endCol + 2}`,
                              gridRow: 1,
                              alignSelf: 'center',
                              backgroundColor: bgColor,
                              borderLeft: isStart ? `3px solid ${isDone ? '#9ca3af' : effectiveColor}` : 'none',
                              borderStyle: event.virtual ? 'dashed' : 'solid',
                              color: isDone ? '#9ca3af' : effectiveColor,
                              borderRadius: `${isStart ? '6px' : '0'} ${isEnd ? '6px' : '0'} ${isEnd ? '6px' : '0'} ${isStart ? '6px' : '0'}`,
                              marginLeft: isStart ? '2px' : 0,
                              marginRight: isEnd ? '2px' : 0,
                            }}
                            className="flex items-center h-5 text-[10px] font-semibold truncate cursor-pointer hover:opacity-80 transition-opacity overflow-hidden"
                          >
                            <span className="pl-1.5 truncate">{isStart ? event.task.title : ''}</span>
                          </button>
                        );
                      })}
                  </div>
                ))}

                {/* "+N" overflow per day */}
                {maxLane >= MAX_VISIBLE_LANES && (
                  <div className="grid grid-cols-7 h-4 mb-0.5">
                    {week.map((day, di) => {
                      const hidden = slots.filter(
                        s => s.lane >= MAX_VISIBLE_LANES && s.startCol <= di && s.endCol >= di
                      ).length;
                      return (
                        <div key={day.toISOString()} className="flex justify-center items-center">
                          {hidden > 0 && (
                            <button
                              onClick={() => setSelected(day)}
                              className="text-xs font-bold text-primary-500 hover:text-primary-700 transition-colors leading-none"
                            >
                              +{hidden}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {maxLane < 0 && <div className="h-2" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day panel */}
      {selected && (
        <div className="mt-4 card p-5">
          <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-3">
            {format(selected, 'EEEE, d. MMMM yyyy', { locale: cs })}
          </h3>
          {selectedDayEvents.length === 0 ? (
            <p className="text-gray-400 text-sm">Žádné úkoly na tento den</p>
          ) : (
            <div className="space-y-2">
              {selectedDayEvents.map((event, idx) => {
                const task = event.task;
                const liveTask = data.tasks.find(t => t.id === task.id) ?? task;
                const subject = event.subject;
                const color = subject?.color ?? '#6366f1';
                const isDone = liveTask.status === 'done';
                const isWontDo = liveTask.status === 'wont_do';
                return (
                  <button
                    key={task.id + (event.virtual ? '-v-' + idx : '')}
                    onClick={() => setSelectedTask(liveTask)}
                    className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors ${
                      event.virtual
                        ? 'border-dashed border-gray-200 dark:border-gray-700'
                        : 'border-gray-100 dark:border-gray-800'
                    }`}
                  >
                    <div
                      className="w-1 self-stretch rounded-full flex-shrink-0"
                      style={{ backgroundColor: isDone ? '#9ca3af' : isWontDo ? '#d1d5db' : color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${isDone || isWontDo ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                        {liveTask.title}
                      </p>
                      {subject && <p className="text-xs text-gray-400 mt-0.5">{subject.abbreviation || subject.name}</p>}
                    </div>
                    {liveTask.dueDate?.includes('T') && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {liveTask.dueDate.split('T')[1].slice(0, 5)}
                      </span>
                    )}
                    {event.virtual && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">↺</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      isDone ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                      isWontDo ? 'bg-gray-100 text-gray-400 dark:bg-gray-800' :
                      liveTask.status === 'in_progress' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {isDone ? 'Hotovo' : isWontDo ? 'Neděláno' : liveTask.status === 'in_progress' ? 'Probíhá' : 'K udělání'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedTask && (() => { const liveTask = data.tasks.find(t => t.id === selectedTask.id); return liveTask ? (
        <TaskDetail
          task={liveTask}
          onClose={() => setSelectedTask(null)}
          onDeleted={() => setSelectedTask(null)}
        />
      ) : null; })()}
    </div>
  );
}
