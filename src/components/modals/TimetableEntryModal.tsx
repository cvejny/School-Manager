import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { TimetableEntry } from '../../types';

export const PERIODS = [
  { n: 1, start: '08:00', end: '08:45' },
  { n: 2, start: '08:55', end: '09:40' },
  { n: 3, start: '10:00', end: '10:45' },
  { n: 4, start: '10:55', end: '11:40' },
  { n: 5, start: '11:50', end: '12:35' },
  { n: 6, start: '12:45', end: '13:30' },
  { n: 7, start: '13:40', end: '14:25' },
  { n: 8, start: '14:35', end: '15:20' },
];

const DAYS = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];

interface Props {
  entry?: TimetableEntry;
  defaultDay?: number;
  defaultPeriod?: number;
  onClose: () => void;
}

export default function TimetableEntryModal({ entry, defaultDay, defaultPeriod, onClose }: Props) {
  const { data, addTimetableEntry, updateTimetableEntry, deleteTimetableEntry } = useApp();

  const [day, setDay] = useState<number>(entry?.day ?? defaultDay ?? 0);
  const [period, setPeriod] = useState<number>(entry?.period ?? defaultPeriod ?? 1);
  const [title, setTitle] = useState(entry?.title ?? '');
  const [subjectId, setSubjectId] = useState(entry?.subjectId ?? '');
  const [room, setRoom] = useState(entry?.room ?? '');
  const [teacher, setTeacher] = useState(entry?.teacher ?? '');
  const [color, setColor] = useState(entry?.color ?? '');

  useEffect(() => {
    if (!entry) {
      const subject = data.subjects.find(s => s.id === subjectId);
      if (subject) {
        setTitle(subject.abbreviation || subject.name);
        setColor(subject.color);
      } else {
        setColor('');
      }
    }
  }, [subjectId]);

  const handleSave = () => {
    if (!title.trim()) return;
    const p = PERIODS[period - 1];
    const payload = {
      day: day as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      period,
      startTime: p.start,
      endTime: p.end,
      title: title.trim(),
      subjectId: subjectId || null,
      room: room.trim(),
      teacher: teacher.trim(),
      color: color || (data.subjects.find(s => s.id === subjectId)?.color ?? '#6366f1'),
    };
    if (entry) {
      updateTimetableEntry(entry.id, payload);
    } else {
      addTimetableEntry(payload);
    }
    onClose();
  };

  const handleDelete = () => {
    if (entry && confirm('Smazat tuto hodinu z rozvrhu?')) {
      deleteTimetableEntry(entry.id);
      onClose();
    }
  };

  const selectedSubject = data.subjects.find(s => s.id === subjectId);
  const entryColor = color || selectedSubject?.color || '#6366f1';
  const currentPeriod = PERIODS[period - 1];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold">{entry ? 'Upravit hodinu' : 'Přidat hodinu'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Day */}
          <div>
            <label className="label">Den</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {DAYS.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setDay(i)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    day === i
                      ? 'text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  style={day === i ? { backgroundColor: entryColor } : {}}
                >
                  {d.slice(0, 2)}
                </button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div>
            <label className="label">Hodina</label>
            <div className="grid grid-cols-4 gap-1.5 mt-1">
              {PERIODS.map(p => (
                <button
                  key={p.n}
                  onClick={() => setPeriod(p.n)}
                  className={`flex flex-col items-center py-2 rounded-lg text-xs transition-all border ${
                    period === p.n
                      ? 'text-white border-transparent shadow-sm'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  style={period === p.n ? { backgroundColor: entryColor } : {}}
                >
                  <span className="font-bold text-sm">{p.n}</span>
                  <span className="opacity-75">{p.start}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{currentPeriod.start} – {currentPeriod.end}</p>
          </div>

          {/* Subject */}
          <div>
            <label className="label">Předmět (volitelné)</label>
            <select className="input" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
              <option value="">— bez předmětu —</option>
              {data.subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="label">Zkratka / název *</label>
            <input
              className="input"
              placeholder="např. MAT"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Místnost</label>
              <input className="input" placeholder="B204" value={room} onChange={e => setRoom(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} />
            </div>
            <div>
              <label className="label">Učitel</label>
              <input className="input" placeholder="Příjmení" value={teacher} onChange={e => setTeacher(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="label">Barva</label>
            <div className="flex items-center gap-3">
              <input type="color" className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-700" value={entryColor} onChange={e => setColor(e.target.value)} />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {selectedSubject ? `Barva předmětu ${selectedSubject.abbreviation || selectedSubject.name}` : 'Vlastní'}
              </span>
              {selectedSubject && color && color !== selectedSubject.color && (
                <button className="text-xs text-primary-600 hover:underline" onClick={() => setColor(selectedSubject.color)}>Obnovit</button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 pb-6">
          {entry ? (
            <button onClick={handleDelete} className="btn text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm px-3 py-2">Smazat</button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost px-4 py-2 rounded-lg text-sm">Zrušit</button>
            <button onClick={handleSave} disabled={!title.trim()} className="btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {entry ? 'Uložit' : 'Přidat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
