import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Timer, Coffee, Brain } from 'lucide-react';
import { useApp } from '../context/AppContext';

type Mode = 'work' | 'short' | 'long';

const MODES: Record<Mode, { label: string; seconds: number; color: string; icon: React.ReactNode }> = {
  work:  { label: 'Práce',          seconds: 25 * 60, color: '#7c3aed', icon: <Brain size={16} /> },
  short: { label: 'Krátká pauza',   seconds:  5 * 60, color: '#10b981', icon: <Coffee size={16} /> },
  long:  { label: 'Dlouhá pauza',   seconds: 15 * 60, color: '#3b82f6', icon: <Coffee size={16} /> },
};

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  } catch {}
}

const SIZE = 260;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

export default function Pomodoro() {
  const { data } = useApp();
  const [mode, setMode] = useState<Mode>('work');
  const [timeLeft, setTimeLeft] = useState(MODES.work.seconds);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = MODES[mode].seconds;
  const progress = (timeLeft / total) * CIRCUMFERENCE;
  const { color } = MODES[mode];

  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const switchMode = useCallback((m: Mode) => {
    clearTimer();
    setRunning(false);
    setMode(m);
    setTimeLeft(MODES[m].seconds);
  }, [clearTimer]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearTimer();
          setRunning(false);
          beep();
          if (mode === 'work') {
            setSessions(s => {
              const next = s + 1;
              return next;
            });
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return clearTimer;
  }, [running, mode, clearTimer]);

  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const seconds = String(timeLeft % 60).padStart(2, '0');

  const activeTasks = data.tasks.filter(t => t.status !== 'done');
  const selectedTask = activeTasks.find(t => t.id === selectedTaskId);
  const selectedSubject = selectedTask ? data.subjects.find(s => s.id === selectedTask.subjectId) : null;

  const sessionBlocks = sessions > 0 ? Array.from({ length: Math.min(sessions, 8) }) : [];

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Timer size={24} className="text-primary-500" />
          Pomodoro
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Technika práce v soustředěných blocích</p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 mb-8 card p-1.5">
        {(Object.entries(MODES) as [Mode, typeof MODES[Mode]][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => switchMode(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
              mode === key
                ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            {cfg.icon}
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Timer circle */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} className="-rotate-90">
            {/* Background track */}
            <circle
              cx={SIZE / 2} cy={SIZE / 2} r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              className="text-gray-100 dark:text-gray-800"
            />
            {/* Progress arc */}
            <circle
              cx={SIZE / 2} cy={SIZE / 2} r={R}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE - progress}
              style={{ transition: 'stroke-dashoffset 0.5s linear' }}
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold font-mono text-gray-900 dark:text-white tabular-nums">
              {minutes}:{seconds}
            </span>
            <span className="text-sm text-gray-400 mt-1">{MODES[mode].label}</span>
            {sessions > 0 && (
              <div className="flex gap-1 mt-3">
                {sessionBlocks.map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                ))}
                {sessions > 8 && <span className="text-xs text-gray-400 ml-1">+{sessions - 8}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={() => switchMode(mode)}
            className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            title="Resetovat"
          >
            <RotateCcw size={18} />
          </button>

          <button
            onClick={() => setRunning(r => !r)}
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all duration-150 hover:scale-105 active:scale-95"
            style={{ backgroundColor: color, boxShadow: `0 8px 24px ${color}40` }}
          >
            {running ? <Pause size={24} /> : <Play size={24} />}
          </button>

          <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 text-sm font-bold">
            {sessions}
          </div>
        </div>
      </div>

      {/* Current task selector */}
      <div className="card p-5">
        <label className="label mb-2">Pracuji na úkolu</label>
        <select
          className="select"
          value={selectedTaskId}
          onChange={e => setSelectedTaskId(e.target.value)}
        >
          <option value="">— Bez výběru —</option>
          {activeTasks.map(t => {
            const sub = data.subjects.find(s => s.id === t.subjectId);
            return (
              <option key={t.id} value={t.id}>
                {sub ? `[${sub.name}] ` : ''}{t.title}
              </option>
            );
          })}
        </select>

        {selectedTask && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-start gap-3">
            {selectedSubject && (
              <div
                className="w-2 h-full min-h-[32px] rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedSubject.color }}
              />
            )}
            <div>
              <p className="font-medium text-sm text-gray-900 dark:text-white">{selectedTask.title}</p>
              {selectedTask.description && (
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{selectedTask.description}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800">
        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">💡 Tip</p>
        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
          Pracuj 25 minut bez přerušení, pak si dej 5minutovou pauzu. Po 4 sezeních si zasloužíš 15minutový odpočinek.
        </p>
      </div>
    </div>
  );
}
