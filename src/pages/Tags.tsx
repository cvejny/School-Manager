import { useState, useEffect, useRef } from 'react';
import { Tag, Pencil, Trash2, Check, X, ChevronDown, ChevronUp, GripVertical, Plus, CheckCircle2, Ban } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useSearchParams } from 'react-router-dom';
import TaskCard from '../components/TaskCard';
import TaskDetail from '../components/TaskDetail';
import type { Task } from '../types';

export default function Tags() {
  const { data, renameTag, deleteTag } = useApp();
  const [searchParams] = useSearchParams();
  const focusedTag = searchParams.get('tag');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [collapsedTags, setCollapsedTags] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const TAG_ORDER_KEY = 'tag_order';
  const [tagOrder, setTagOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(TAG_ORDER_KEY) || '[]'); } catch { return []; }
  });
  const dragTagIndex = useRef<number | null>(null);
  const dragTagOverIndex = useRef<number | null>(null);
  const [newTag, setNewTag] = useState('');
  const newTagInputRef = useRef<HTMLInputElement>(null);

  // Scroll to focused tag when navigating from sidebar
  useEffect(() => {
    if (!focusedTag) return;
    const el = sectionRefs.current[focusedTag];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Expand if collapsed
    setCollapsedTags(prev => {
      const next = new Set(prev);
      next.delete(focusedTag);
      return next;
    });
  }, [focusedTag]);

  // Collect all unique tags: saved order + new tags from tasks appended alphabetically
  const rawTags = Array.from(new Set(data.tasks.flatMap(t => t.tags)));
  const allTags = [
    ...tagOrder,
    ...rawTags.filter(t => !tagOrder.includes(t)).sort(),
  ].filter((t, i, arr) => arr.indexOf(t) === i);

  const addNewTag = () => {
    const name = newTag.trim();
    if (!name || allTags.includes(name)) { setNewTag(''); return; }
    const updated = [...allTags, name];
    setTagOrder(updated);
    localStorage.setItem(TAG_ORDER_KEY, JSON.stringify(updated));
    setNewTag('');
    newTagInputRef.current?.focus();
  };

  const handleTagDragStart = (index: number) => { dragTagIndex.current = index; };
  const handleTagDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragTagOverIndex.current = index;
  };
  const handleTagDrop = () => {
    const from = dragTagIndex.current;
    const to = dragTagOverIndex.current;
    if (from === null || to === null || from === to) { dragTagIndex.current = null; dragTagOverIndex.current = null; return; }
    const reordered = [...allTags];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setTagOrder(reordered);
    localStorage.setItem(TAG_ORDER_KEY, JSON.stringify(reordered));
    dragTagIndex.current = null;
    dragTagOverIndex.current = null;
  };

  const [collapsedDoneSections, setCollapsedDoneSections] = useState<Set<string>>(new Set(allTags));

  const toggleDoneSection = (tag: string) => {
    setCollapsedDoneSections(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  const tasksByTag = (tag: string) =>
    data.tasks.filter(t => t.tags.includes(tag) && t.status !== 'done' && t.status !== 'wont_do');

  const doneTasksByTag = (tag: string) =>
    data.tasks.filter(t => t.tags.includes(tag) && t.status === 'done');

  const wontDoTasksByTag = (tag: string) =>
    data.tasks.filter(t => t.tags.includes(tag) && t.status === 'wont_do');

  const startEdit = (tag: string) => {
    setEditingTag(tag);
    setEditValue(tag);
  };

  const confirmEdit = (oldName: string) => {
    if (editValue.trim() && editValue.trim() !== oldName) {
      renameTag(oldName, editValue.trim());
    }
    setEditingTag(null);
  };

  const cancelEdit = () => setEditingTag(null);

  const handleDelete = (tag: string) => {
    if (confirm(`Smazat štítek "${tag}"? Odstraní se ze všech úkolů.`)) {
      deleteTag(tag);
      const updated = tagOrder.filter(t => t !== tag);
      setTagOrder(updated);
      localStorage.setItem(TAG_ORDER_KEY, JSON.stringify(updated));
    }
  };

  const toggleCollapse = (tag: string) => {
    setCollapsedTags(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
              <Tag size={26} className="text-primary-500" />
              Štítky
            </h1>
            <p className="text-gray-400 mt-1">{allTags.length} štítků celkem</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <input
              ref={newTagInputRef}
              className="input text-sm py-2 w-40"
              placeholder="Nový štítek"
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addNewTag(); }}
            />
            <button
              onClick={addNewTag}
              disabled={!newTag.trim()}
              className="btn-primary py-2 px-3 disabled:opacity-40"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      {allTags.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 bg-primary-50 dark:bg-primary-900/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Tag size={36} className="text-primary-300 dark:text-primary-700" />
          </div>
          <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Žádné štítky</h3>
          <p className="text-gray-400 max-w-xs mx-auto">
            Přidej štítky k úkolům (např. "test", "projekt") a tady je uvidíš seřazené.
          </p>
        </div>
      ) : (
        <>
          {/* Tag chips overview */}
          <div className="card p-5 mb-8">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Všechny štítky</p>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <div key={tag} className="group flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1.5">
                  {editingTag === tag ? (
                    <>
                      <input
                        autoFocus
                        className="bg-transparent text-sm font-medium text-gray-800 dark:text-gray-200 outline-none w-24 min-w-0"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') confirmEdit(tag);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <button onClick={() => confirmEdit(tag)} className="text-green-500 hover:text-green-600 flex-shrink-0">
                        <Check size={13} />
                      </button>
                      <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-500 flex-shrink-0">
                        <X size={13} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{tag}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {tasksByTag(tag).length}
                      </span>
                      <button
                        onClick={() => startEdit(tag)}
                        className="text-gray-300 dark:text-gray-600 hover:text-primary-500 dark:hover:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(tag)}
                        className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tasks grouped by tag */}
          <div className="space-y-6">
            {allTags.map((tag, index) => {
              const tasks = tasksByTag(tag);
              const doneTasks = doneTasksByTag(tag);
              const wontDoTasks = wontDoTasksByTag(tag);
              const isCollapsed = collapsedTags.has(tag);
              const isFocused = focusedTag === tag;
              return (
                <section
                  key={tag}
                  ref={el => { sectionRefs.current[tag] = el; }}
                  draggable
                  onDragStart={() => handleTagDragStart(index)}
                  onDragOver={e => handleTagDragOver(e, index)}
                  onDrop={handleTagDrop}
                >
                  <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl transition-colors ${
                    isFocused ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                  }`}>
                    <GripVertical size={15} className="text-gray-300 dark:text-gray-600 cursor-grab flex-shrink-0" />
                    <button
                      onClick={() => toggleCollapse(tag)}
                      className="flex items-center gap-2 group"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
                        <Tag size={12} className="text-primary-500 dark:text-primary-400" />
                      </div>
                      <h2 className="font-bold text-gray-800 dark:text-gray-200 group-hover:text-primary-500 transition-colors">
                        {editingTag === tag ? editValue || tag : tag}
                      </h2>
                      {isCollapsed
                        ? <ChevronDown size={15} className="text-gray-400" />
                        : <ChevronUp size={15} className="text-gray-400" />
                      }
                    </button>
                    <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      {tasks.length}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        onClick={() => startEdit(tag)}
                        className="btn-ghost p-1.5 rounded-lg text-gray-400 hover:text-primary-500"
                        title="Přejmenovat štítek"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(tag)}
                        className="btn-ghost p-1.5 rounded-lg text-gray-400 hover:text-red-500"
                        title="Smazat štítek"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="space-y-2.5 pl-1">
                      {tasks.length === 0 && doneTasks.length === 0 && (
                        <p className="text-sm text-gray-400 pl-2">Žádné úkoly s tímto štítkem.</p>
                      )}
                      {tasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onClick={() => setSelectedTask(task)}
                        />
                      ))}
                      {doneTasks.length > 0 && (
                        <div className="mt-4">
                          <button
                            onClick={() => toggleDoneSection(tag)}
                            className="flex items-center gap-2 mb-2 hover:text-green-600 transition-colors"
                          >
                            {collapsedDoneSections.has(tag)
                              ? <ChevronDown size={13} className="text-gray-400" />
                              : <ChevronUp size={13} className="text-gray-400" />}
                            <CheckCircle2 size={13} className="text-green-500" />
                            <span className="text-xs font-semibold text-gray-400">Dokončené</span>
                            <span className="badge bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs">{doneTasks.length}</span>
                          </button>
                          {!collapsedDoneSections.has(tag) && (
                            <div className="space-y-2 opacity-60">
                              {doneTasks.map(task => (
                                <TaskCard
                                  key={task.id}
                                  task={task}
                                  onClick={() => setSelectedTask(task)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {wontDoTasks.length > 0 && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleDoneSection('wont_' + tag)}
                            className="flex items-center gap-2 mb-2 hover:text-gray-600 transition-colors"
                          >
                            {collapsedDoneSections.has('wont_' + tag)
                              ? <ChevronDown size={13} className="text-gray-400" />
                              : <ChevronUp size={13} className="text-gray-400" />}
                            <Ban size={13} className="text-gray-400" />
                            <span className="text-xs font-semibold text-gray-400">Neděláno</span>
                            <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-400 text-xs">{wontDoTasks.length}</span>
                          </button>
                          {!collapsedDoneSections.has('wont_' + tag) && (
                            <div className="space-y-2 opacity-50">
                              {wontDoTasks.map(task => (
                                <TaskCard
                                  key={task.id}
                                  task={task}
                                  onClick={() => setSelectedTask(task)}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </>
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
