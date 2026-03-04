import { useState, useRef, useEffect } from 'react';
import { Plus, BookOpen, CheckCircle2, GripVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import DynamicIcon from '../components/DynamicIcon';
import SubjectModal from '../components/modals/SubjectModal';
import type { Subject } from '../types';

const ORDER_KEY = 'subject_order';

function savedOrder(): string[] {
  try { return JSON.parse(localStorage.getItem(ORDER_KEY) || '[]'); } catch { return []; }
}

function applyOrder(subjects: Subject[], order: string[]): Subject[] {
  const map = new Map(subjects.map(s => [s.id, s]));
  const sorted = order.map(id => map.get(id)).filter(Boolean) as Subject[];
  const rest = subjects.filter(s => !order.includes(s.id));
  return [...sorted, ...rest];
}

export default function Subjects() {
  const { data } = useApp();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [orderedSubjects, setOrderedSubjects] = useState<Subject[]>(() =>
    applyOrder(data.subjects, savedOrder())
  );
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  // Sync when subjects change (add/delete)
  useEffect(() => {
    setOrderedSubjects(prev => {
      const order = prev.map(s => s.id);
      return applyOrder(data.subjects, order);
    });
  }, [data.subjects]);

  const persistOrder = (subjects: Subject[]) => {
    localStorage.setItem(ORDER_KEY, JSON.stringify(subjects.map(s => s.id)));
  };

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverIndex.current = index;
  };

  const handleDrop = () => {
    if (dragIndex.current === null || dragOverIndex.current === null) return;
    if (dragIndex.current === dragOverIndex.current) return;
    const next = [...orderedSubjects];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(dragOverIndex.current, 0, moved);
    dragIndex.current = null;
    dragOverIndex.current = null;
    setOrderedSubjects(next);
    persistOrder(next);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Předměty</h1>
          <p className="text-gray-400 mt-1">{data.subjects.length} předmětů celkem</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />Nový předmět
        </button>
      </div>

      {data.subjects.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 bg-primary-50 dark:bg-primary-900/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <BookOpen size={36} className="text-primary-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Zatím žádné předměty</h3>
          <p className="text-gray-400 mb-6 max-w-xs mx-auto">Vytvoř si předměty jako Matematika, Fyzika, Čeština a přidávej do nich úkoly a zápisky.</p>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />Přidat první předmět
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orderedSubjects.map((subject, index) => {
            const totalTasks = data.tasks.filter(t => t.subjectId === subject.id).length;
            const pendingTasks = data.tasks.filter(t => t.subjectId === subject.id && t.status !== 'done' && t.status !== 'wont_do').length;
            const doneTasks = data.tasks.filter(t => t.subjectId === subject.id && t.status === 'done').length;
            const notes = data.notes.filter(n => n.subjectId === subject.id).length;
            const progress = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;

            return (
              <div
                key={subject.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={e => handleDragOver(e, index)}
                onDrop={handleDrop}
                onDragEnd={() => { dragIndex.current = null; dragOverIndex.current = null; }}
                onClick={() => navigate(`/subjects/${subject.id}`)}
                className="card p-5 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group cursor-pointer select-none"
              >
                {/* Icon + drag handle */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md"
                    style={{ backgroundColor: subject.color + '20', border: `1.5px solid ${subject.color}30` }}
                  >
                    <DynamicIcon name={subject.icon} size={24} className="opacity-90" style={{ color: subject.color }} />
                  </div>
                  <div
                    className="text-gray-300 dark:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing mt-0.5"
                    onClick={e => e.stopPropagation()}
                  >
                    <GripVertical size={18} />
                  </div>
                </div>

                {/* Name & description */}
                <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-0.5 truncate">{subject.abbreviation || subject.name}</h3>
                {subject.description && (
                  <p className="text-sm text-gray-400 dark:text-gray-500 mb-3 line-clamp-1">{subject.description}</p>
                )}

                {/* Progress bar */}
                {totalTasks > 0 && (
                  <div className="mb-3">
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%`, backgroundColor: subject.color }}
                      />
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-3 text-sm">
                  {pendingTasks > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: subject.color }} />
                      <span className="text-gray-600 dark:text-gray-400">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{pendingTasks}</span> úkolů zbývá
                      </span>
                    </div>
                  ) : totalTasks > 0 ? (
                    <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                      <CheckCircle2 size={13} />
                      <span className="text-xs font-medium">Vše splněno!</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">Žádné úkoly</span>
                  )}
                  {notes > 0 && (
                    <span className="text-gray-400 text-xs ml-auto">{notes} zápisků</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add card */}
          <button
            onClick={() => setShowModal(true)}
            className="card p-5 border-dashed border-2 border-gray-200 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-700 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-primary-500 transition-all duration-200 hover:shadow-md min-h-[10rem]"
          >
            <Plus size={28} />
            <span className="text-sm font-medium">Přidat předmět</span>
          </button>
        </div>
      )}

      {showModal && (
        <SubjectModal onClose={() => setShowModal(false)} />

      )}
    </div>
  );
}
