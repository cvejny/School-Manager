import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Plus, ArrowLeft, Edit3, Trash2, CheckCircle2,
  FileText, Image, File, MoreVertical, BookOpen,
  StickyNote, ListTodo, Download, FileDown, Upload, ChevronDown, ChevronUp, Ban,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import DynamicIcon from '../components/DynamicIcon';
import TaskCard from '../components/TaskCard';
import TaskDetail from '../components/TaskDetail';
import TaskModal from '../components/modals/TaskModal';
import NoteModal from '../components/modals/NoteModal';
import SubjectModal from '../components/modals/SubjectModal';
import { sortTasks } from '../utils/helpers';
import type { Task, Note } from '../types';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';

type Tab = 'tasks' | 'notes';

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, addNote, updateNote, deleteSubject, deleteNote } = useApp();
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('tasks');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showEditSubject, setShowEditSubject] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteView, setNoteView] = useState<Note | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'todo' | 'in_progress'>('all');
  const [showDoneSection, setShowDoneSection] = useState(false);
  const [showWontDoSection, setShowWontDoSection] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [editorNote, setEditorNote] = useState<Note | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');

  const subject = data.subjects.find(s => s.id === id);
  if (!subject) return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-gray-400">Předmět nenalezen</p>
      <Link to="/subjects" className="btn-primary">Zpět na předměty</Link>
    </div>
  );

  const allSubjectTasks = data.tasks.filter(t => t.subjectId === id);
  const filteredTasks = allSubjectTasks.filter(t => t.status !== 'done' && t.status !== 'wont_do' && (filterStatus === 'all' || t.status === filterStatus));
  const doneTasks = allSubjectTasks.filter(t => t.status === 'done');
  const wontDoTasks = allSubjectTasks.filter(t => t.status === 'wont_do');
  const sortedTasks = sortTasks(filteredTasks, data.settings.defaultSort);
  const subjectNotes = data.notes.filter(n => n.subjectId === id);

  const pendingCount = allSubjectTasks.filter(t => t.status !== 'done' && t.status !== 'wont_do').length;
  const doneCount = allSubjectTasks.filter(t => t.status === 'done').length;

  const handleDeleteSubject = () => {
    if (confirm(`Opravdu smazat předmět "${subject.name}"? Smaže se i ${allSubjectTasks.length} úkolů a ${subjectNotes.length} zápisků.`)) {
      deleteSubject(subject.id);
      navigate('/subjects');
    }
  };

  const handleDeleteNote = (note: Note) => {
    if (confirm('Smazat tento zápisek?')) {
      deleteNote(note.id);
      if (noteView?.id === note.id) setNoteView(null);
    }
  };

  const exportNoteToPDF = (note: Note) => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${note.title}</title>
<style>body{font-family:sans-serif;max-width:800px;margin:40px auto;color:#111}
h1{font-size:1.4rem;margin-bottom:4px}p.meta{color:#888;font-size:.85rem;margin-bottom:24px}
pre{white-space:pre-wrap;font-family:inherit;line-height:1.6}</style></head>
<body><h1>${note.title}</h1><p class="meta">Předmět: ${subject.name} &bull; ${format(parseISO(note.updatedAt), 'd. M. yyyy HH:mm', { locale: cs })}</p>
<pre>${note.content ?? ''}</pre></body></html>`;
    const w = window.open();
    if (w) { w.document.write(html); w.document.close(); w.setTimeout(() => { w.print(); }, 400); }
  };

  const exportNoteToCSV = (note: Note) => {
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows = [
      ['Název', 'Předmět', 'Typ', 'Obsah', 'Vytvořeno', 'Upraveno'],
      [escape(note.title), escape(subject.name), escape(note.type), escape(note.content ?? ''),
       escape(note.createdAt), escape(note.updatedAt)],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${note.title.replace(/[^a-z0-9]/gi, '_')}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const openNoteEditor = (note?: Note) => {
    setEditorNote(note || null);
    setEditorTitle(note?.title || '');
    setEditorContent(note?.content || '');
    setNoteView(null);
    setShowNoteEditor(true);
  };

  const handleEditorSave = () => {
    if (!editorTitle.trim()) return;
    const noteData = { title: editorTitle.trim(), content: editorContent, type: 'text' as const, subjectId: id! };
    if (editorNote) {
      updateNote(editorNote.id, noteData);
    } else {
      addNote(noteData);
    }
    setShowNoteEditor(false);
    setEditorNote(null);
  };

  const getNoteIcon = (type: Note['type']) => {
    switch (type) {
      case 'image': return <Image size={18} className="text-blue-500" />;
      case 'pdf': return <File size={18} className="text-red-500" />;
      default: return <FileText size={18} className="text-primary-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Subject Header */}
      <div
        className="px-8 pt-6 pb-0 border-b border-gray-100 dark:border-gray-800"
        style={{ background: `linear-gradient(135deg, ${subject.color}08, transparent)` }}
      >
        <div className="flex items-start gap-4 mb-5">
          <Link to="/subjects" className="btn-ghost mt-1 p-1.5 rounded-lg text-gray-400">
            <ArrowLeft size={18} />
          </Link>

          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0"
            style={{ backgroundColor: subject.color + '25', border: `2px solid ${subject.color}30` }}
          >
            <DynamicIcon name={subject.icon} size={28} className="opacity-90" style={{ color: subject.color }} />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{subject.name}</h1>
            {subject.description && (
              <p className="text-gray-500 text-sm mt-0.5">{subject.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
              <span>{pendingCount} zbývajících úkolů</span>
              <span>·</span>
              <span>{doneCount} hotových</span>
              <span>·</span>
              <span>{subjectNotes.length} zápisků</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setShowEditSubject(true)} className="btn-ghost p-2 rounded-lg" title="Upravit">
              <Edit3 size={16} />
            </button>
            <button onClick={handleDeleteSubject} className="btn-ghost p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Smazat">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          <button
            onClick={() => setTab('tasks')}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition-all ${
              tab === 'tasks'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/10'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span className="flex items-center gap-2"><ListTodo size={15} />Úkoly {pendingCount > 0 && <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-500">{pendingCount}</span>}</span>
          </button>
          <button
            onClick={() => setTab('notes')}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition-all ${
              tab === 'notes'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/10'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span className="flex items-center gap-2"><StickyNote size={15} />Zápisky {subjectNotes.length > 0 && <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-500">{subjectNotes.length}</span>}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 ${showNoteEditor && tab === 'notes' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
        {tab === 'tasks' && (
          <div className="p-8 max-w-4xl">
            <div className="flex items-center justify-between mb-5">
              {/* Filter */}
              <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                {([['all', 'Vše'], ['todo', 'K udělání'], ['in_progress', 'Probíhá']] as const).map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setFilterStatus(v)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                      filterStatus === v ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <button className="btn-primary text-sm py-2" onClick={() => setShowTaskModal(true)}>
                <Plus size={15} />Nový úkol
              </button>
            </div>

            {sortedTasks.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={28} className="text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-gray-400 mb-4">
                  {filterStatus === 'all' ? `Žádné úkoly v předmětu ${subject.name}` : 'Žádné úkoly v tomto stavu'}
                </p>
                {filterStatus === 'all' && (
                  <button className="btn-primary text-sm" onClick={() => setShowTaskModal(true)}>
                    <Plus size={14} />Přidat úkol
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {sortedTasks.map(task => (
                  <TaskCard key={task.id} task={task} showSubject={false} onClick={() => setSelectedTask(task)} />
                ))}
              </div>
            )}

            {/* Dokončené úkoly dole */}
            {doneTasks.length > 0 && (
              <div className="mt-8">
                <button
                  onClick={() => setShowDoneSection(v => !v)}
                  className="flex items-center gap-2 mb-3 hover:text-green-600 transition-colors"
                >
                  {showDoneSection
                    ? <ChevronUp size={15} className="text-gray-400" />
                    : <ChevronDown size={15} className="text-gray-400" />}
                  <CheckCircle2 size={15} className="text-green-500" />
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Dokončené úkoly</span>
                  <span className="badge bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">{doneTasks.length}</span>
                </button>
                {showDoneSection && (
                  <div className="space-y-2.5 opacity-60">
                    {doneTasks.map(task => (
                      <TaskCard key={task.id} task={task} showSubject={false} onClick={() => setSelectedTask(task)} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Neděláno dole */}
            {wontDoTasks.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowWontDoSection(v => !v)}
                  className="flex items-center gap-2 mb-3 hover:text-gray-600 transition-colors"
                >
                  {showWontDoSection
                    ? <ChevronUp size={15} className="text-gray-400" />
                    : <ChevronDown size={15} className="text-gray-400" />}
                  <Ban size={15} className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-400 dark:text-gray-500">Neděláno</span>
                  <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-400">{wontDoTasks.length}</span>
                </button>
                {showWontDoSection && (
                  <div className="space-y-2.5 opacity-50">
                    {wontDoTasks.map(task => (
                      <TaskCard key={task.id} task={task} showSubject={false} onClick={() => setSelectedTask(task)} />
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {tab === 'notes' && (
          showNoteEditor ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 px-8 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
                <button
                  onClick={() => setShowNoteEditor(false)}
                  className="btn-ghost p-1.5 rounded-lg text-gray-400"
                  title="Zpět na zápisky"
                >
                  <ArrowLeft size={16} />
                </button>
                <input
                  className="flex-1 text-xl font-bold bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600"
                  placeholder="Název zápisku..."
                  value={editorTitle}
                  onChange={e => setEditorTitle(e.target.value)}
                  autoFocus
                />
                <button
                  className="btn-primary text-sm py-2 px-5"
                  onClick={handleEditorSave}
                  disabled={!editorTitle.trim()}
                >
                  Uložit zápisek
                </button>
                <button className="btn-secondary text-sm py-2" onClick={() => setShowNoteEditor(false)}>
                  Zrušit
                </button>
              </div>
              <textarea
                className="flex-1 w-full px-10 py-8 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-950 resize-none outline-none leading-relaxed"
                placeholder="Začni psát zápisek..."
                value={editorContent}
                onChange={e => setEditorContent(e.target.value)}
              />
            </div>
          ) : (
          <div className="p-8 max-w-6xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300">Zápisky</h2>
              <div className="flex items-center gap-2">
                <button className="btn-secondary text-sm py-2" onClick={() => { setSelectedNote(null); setShowNoteModal(true); }}>
                  <Upload size={15} />Importovat soubor
                </button>
                <button className="btn-primary text-sm py-2" onClick={() => openNoteEditor()}>
                  <Plus size={15} />Nový zápisek
                </button>
              </div>
            </div>

            {noteView ? (
              /* Note full view */
              <div className="card p-0 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    {getNoteIcon(noteView.type)}
                    <h3 className="font-bold text-gray-900 dark:text-white">{noteView.title}</h3>
                    <span className="text-xs text-gray-400">{format(parseISO(noteView.updatedAt), 'd. M. yyyy HH:mm', { locale: cs })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (noteView.type === 'text') openNoteEditor(noteView);
                        else { setSelectedNote(noteView); setNoteView(null); setShowNoteModal(true); }
                      }}
                      className="btn-ghost p-1.5 rounded-lg"
                    ><Edit3 size={15} /></button>
                    <button onClick={() => { handleDeleteNote(noteView); }} className="btn-ghost p-1.5 rounded-lg text-red-400"><Trash2 size={15} /></button>
                    {noteView.type === 'text' && (
                      <>
                        <button onClick={() => exportNoteToPDF(noteView)} className="btn-ghost p-1.5 rounded-lg text-gray-500" title="Exportovat PDF"><FileDown size={15} /></button>
                        <button onClick={() => exportNoteToCSV(noteView)} className="btn-ghost p-1.5 rounded-lg text-gray-500" title="Exportovat CSV"><FileText size={15} /></button>
                      </>
                    )}
                    <button onClick={() => setNoteView(null)} className="btn-ghost px-3 py-1.5 text-sm">← Zpět</button>
                  </div>
                </div>
                <div className="p-6">
                  {noteView.type === 'image' && noteView.fileData && (
                    <img src={noteView.fileData} alt={noteView.title} className="max-w-full rounded-xl mb-4" />
                  )}
                  {noteView.type === 'pdf' && noteView.fileData && (
                    <iframe src={noteView.fileData} className="w-full h-[70vh] rounded-xl mb-4" title={noteView.title} />
                  )}
                  {noteView.type === 'file' && noteView.fileData && (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl mb-4">
                      <File size={24} className="text-gray-400" />
                      <div>
                        <p className="font-medium text-sm">{noteView.fileName}</p>
                        <a href={noteView.fileData} download={noteView.fileName} className="text-xs text-primary-500 hover:underline flex items-center gap-1 mt-0.5">
                          <Download size={11} />Stáhnout
                        </a>
                      </div>
                    </div>
                  )}
                  {noteView.content && (
                    <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 font-sans leading-relaxed text-sm">{noteView.content}</pre>
                  )}
                </div>
              </div>
            ) : subjectNotes.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <StickyNote size={28} className="text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-gray-400 mb-4">Žádné zápisky v tomto předmětu</p>
                <button className="btn-primary text-sm" onClick={() => openNoteEditor()}>
                  <Plus size={14} />Vytvořit zápisek
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjectNotes.map(note => (
                  <div key={note.id} className="card overflow-hidden hover:shadow-md transition-all duration-150 hover:-translate-y-0.5 group cursor-pointer" onClick={() => setNoteView(note)}>
                    {note.type === 'image' && note.fileData && (
                      <div className="aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <img src={note.fileData} alt={note.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    {note.type !== 'image' && (
                      <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 flex items-start p-4 overflow-hidden">
                        {note.type === 'pdf' ? (
                          <div className="flex flex-col items-center justify-center w-full h-full gap-2 text-red-400">
                            <File size={32} />
                            <span className="text-xs font-medium">{note.fileName}</span>
                          </div>
                        ) : note.type === 'file' ? (
                          <div className="flex flex-col items-center justify-center w-full h-full gap-2 text-gray-400">
                            <FileText size={32} />
                            <span className="text-xs font-medium">{note.fileName}</span>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-6 font-mono leading-relaxed">
                            {note.content || <span className="italic text-gray-300">Prázdný zápisek</span>}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="p-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {getNoteIcon(note.type)}
                          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{note.title}</h4>
                        </div>
                        <p className="text-xs text-gray-400">{format(parseISO(note.updatedAt), 'd. M. yyyy', { locale: cs })}</p>
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            if (note.type === 'text') openNoteEditor(note);
                            else { setSelectedNote(note); setShowNoteModal(true); }
                          }}
                          className="btn-ghost p-1.5 rounded-lg"
                        ><Edit3 size={13} /></button>
                        {note.type === 'text' && (
                          <>
                            <button onClick={() => exportNoteToPDF(note)} className="btn-ghost p-1.5 rounded-lg text-gray-500" title="PDF"><FileDown size={13} /></button>
                            <button onClick={() => exportNoteToCSV(note)} className="btn-ghost p-1.5 rounded-lg text-gray-500" title="CSV"><FileText size={13} /></button>
                          </>
                        )}
                        <button onClick={() => handleDeleteNote(note)} className="btn-ghost p-1.5 rounded-lg text-red-400"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )
        )}
      </div>

      {selectedTask && (() => { const liveTask = data.tasks.find(t => t.id === selectedTask.id); return liveTask ? (
        <TaskDetail task={liveTask} onClose={() => setSelectedTask(null)} onDeleted={() => setSelectedTask(null)} />
      ) : null; })()}
      {showTaskModal && (
        <TaskModal defaultSubjectId={id} onClose={() => setShowTaskModal(false)} />
      )}
      {showNoteModal && (
        <NoteModal
          note={selectedNote || undefined}
          subjectId={id!}
          onClose={() => { setShowNoteModal(false); setSelectedNote(null); }}
        />
      )}
      {showEditSubject && (
        <SubjectModal subject={subject} onClose={() => setShowEditSubject(false)} />
      )}
    </div>
  );
}
