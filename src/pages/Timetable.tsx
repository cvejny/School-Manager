import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import TimetableEntryModal, { PERIODS } from '../components/modals/TimetableEntryModal';
import type { TimetableEntry } from '../types';

const DAYS_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
const DAYS_FULL  = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];
const todayIndex = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1; })();

export default function Timetable() {
  const { data } = useApp();
  const [showWeekend, setShowWeekend] = useState(() => data.timetable.some(e => e.day >= 5));
  const [modal, setModal] = useState<{ open: boolean; entry?: TimetableEntry; defaultDay?: number; defaultPeriod?: number }>({ open: false });

  const daysCount = showWeekend ? 7 : 5;
  const hasWeekendEntries = data.timetable.some(e => e.day >= 5);
  const getEntry = (day: number, period: number) => data.timetable.find(e => e.day === day && e.period === period);

  const currentPeriodN = (() => {
    const now = new Date();
    const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    return PERIODS.find(p => t >= p.start && t <= p.end)?.n;
  })();

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rozvrh</h1>
            {data.timetable.length > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Klikni na buňku pro přidání nebo úpravu hodiny</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(hasWeekendEntries || showWeekend) && (
              <button
                onClick={() => setShowWeekend(v => !v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  showWeekend
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {showWeekend ? 'Skrýt víkend' : 'Víkend'}
              </button>
            )}
            <button
              onClick={() => setModal({ open: true })}
              className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm"
            >
              <Plus size={16} />
              Přidat hodinu
            </button>
          </div>
        </div>
      </div>

      {data.timetable.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Zatím žádný rozvrh</h3>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 max-w-xs">Přidej své hodiny a měj vždy přehled o tom, co tě čeká</p>
          </div>
          <button onClick={() => setModal({ open: true })} className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl">
            <Plus size={18} />
            Přidat první hodinu
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4">
          <div className="min-w-fit">
            <table className="border-collapse" style={{ minWidth: `${56 + PERIODS.length * 80}px` }}>
              <thead>
                <tr>
                  <th className="w-14" />
                  {PERIODS.map(p => (
                    <th key={p.n} className="text-center pb-1 px-0.5" style={{ minWidth: '80px' }}>
                      <div className={`rounded-lg py-1.5 px-1 ${p.n === currentPeriodN ? 'bg-primary-100 dark:bg-primary-900/30' : ''}`}>
                        <div className="text-sm font-bold text-gray-700 dark:text-gray-300">{p.n}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 leading-tight">{p.start}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 leading-tight">{p.end}</div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: daysCount }, (_, dayIndex) => {
                  const isToday = dayIndex === todayIndex;
                  return (
                    <tr key={dayIndex}>
                      {/* Day label */}
                      <td className={`pr-3 text-right align-middle py-1 w-14 ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        <div className="font-bold text-sm">{DAYS_SHORT[dayIndex]}</div>
                        {isToday && <div className="text-xs font-normal">{new Date().getDate()}.{new Date().getMonth()+1}.</div>}
                      </td>
                      {/* Period cells */}
                      {PERIODS.map(p => {
                        const entry = getEntry(dayIndex, p.n);
                        const subject = entry ? data.subjects.find(s => s.id === entry.subjectId) : null;
                        const cellColor = entry?.color || subject?.color;
                        const isCurrentCell = isToday && p.n === currentPeriodN;

                        return (
                          <td key={p.n} className="px-0.5 py-1">
                            <button
                              onClick={() =>
                                entry
                                  ? setModal({ open: true, entry })
                                  : setModal({ open: true, defaultDay: dayIndex, defaultPeriod: p.n })
                              }
                              className={`w-full rounded-xl border-2 transition-all active:scale-95 ${
                                isCurrentCell ? 'ring-2 ring-primary-400 ring-offset-1' : ''
                              } ${
                                entry
                                  ? 'hover:brightness-95'
                                  : 'border-dashed border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                              }`}
                              style={
                                entry && cellColor
                                  ? { backgroundColor: cellColor + '1a', borderColor: cellColor + '55' }
                                  : entry
                                  ? { backgroundColor: '#6366f11a', borderColor: '#6366f155' }
                                  : {}
                              }
                            >
                              {entry ? (
                                <div className="flex flex-col items-center justify-between px-1.5 py-2" style={{ minHeight: '80px' }}>
                                  {/* Room top-right */}
                                  <span className="text-xs text-gray-400 dark:text-gray-500 w-full text-center leading-none truncate">
                                    {entry.room || '\u00a0'}
                                  </span>
                                  {/* Abbreviation center */}
                                  <span className="text-lg font-black leading-tight text-center" style={{ color: cellColor || '#6366f1' }}>
                                    {entry.title}
                                  </span>
                                  {/* Teacher bottom */}
                                  <span className="text-xs text-gray-400 dark:text-gray-500 w-full text-center leading-none truncate">
                                    {entry.teacher || '\u00a0'}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center text-gray-300 dark:text-gray-700 text-xl hover:text-gray-400 dark:hover:text-gray-500 transition-colors" style={{ minHeight: '80px' }}>
                                  +
                                </div>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal.open && (
        <TimetableEntryModal
          entry={modal.entry}
          defaultDay={modal.defaultDay}
          defaultPeriod={modal.defaultPeriod}
          onClose={() => setModal({ open: false })}
        />
      )}
    </div>
  );
}
