import { useState, useRef } from 'react';
import { X, Upload, FileText, Image, File } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Note } from '../../types';

interface Props {
  note?: Note;
  subjectId: string;
  onClose: () => void;
  onSaved?: (note: Note) => void;
}

export default function NoteModal({ note, subjectId, onClose, onSaved }: Props) {
  const { addNote, updateNote } = useApp();
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [mode, setMode] = useState<'text' | 'file'>(note?.type === 'text' ? 'text' : (note ? 'file' : 'text'));
  const [fileData, setFileData] = useState(note?.fileData || '');
  const [fileName, setFileName] = useState(note?.fileName || '');
  const [fileMimeType, setFileMimeType] = useState(note?.fileMimeType || '');
  const [fileType, setFileType] = useState<Note['type']>(note?.type || 'text');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileMimeType(file.type);
    if (file.type.startsWith('image/')) setFileType('image');
    else if (file.type === 'application/pdf') setFileType('pdf');
    else setFileType('file');
    const reader = new FileReader();
    reader.onload = () => setFileData(reader.result as string);
    reader.readAsDataURL(file);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
  };

  const handleSave = () => {
    if (!title.trim()) return;
    const noteData = {
      title: title.trim(),
      content,
      type: mode === 'text' ? 'text' as const : fileType,
      subjectId,
      fileData: mode === 'file' ? fileData : undefined,
      fileName: mode === 'file' ? fileName : undefined,
      fileMimeType: mode === 'file' ? fileMimeType : undefined,
    };
    if (note) {
      updateNote(note.id, noteData);
      onSaved?.({ ...note, ...noteData });
    } else {
      const n = addNote(noteData);
      onSaved?.(n);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold">{note ? 'Upravit zápisek' : 'Nový zápisek'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Mode tabs */}
          {!note && (
            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
              <button
                onClick={() => setMode('text')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  mode === 'text' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500'
                }`}
              >
                <span className="flex items-center gap-1.5"><FileText size={14} />Textový zápisek</span>
              </button>
              <button
                onClick={() => setMode('file')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  mode === 'file' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500'
                }`}
              >
                <span className="flex items-center gap-1.5"><Upload size={14} />Import souboru</span>
              </button>
            </div>
          )}

          <div>
            <label className="label">Název *</label>
            <input
              className="input"
              placeholder="Název zápisku..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {mode === 'text' ? (
            <div>
              <label className="label">Obsah</label>
              <textarea
                className="input resize-none font-mono text-sm"
                rows={12}
                placeholder="Piš zde své poznámky..."
                value={content}
                onChange={e => setContent(e.target.value)}
              />
            </div>
          ) : (
            <div>
              <label className="label">Soubor</label>
              <div
                className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {fileData ? (
                  <div className="space-y-2">
                    {fileType === 'image' ? (
                      <img src={fileData} alt={fileName} className="max-h-40 mx-auto rounded-lg object-contain" />
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
                        {fileType === 'pdf' ? <File size={32} /> : <FileText size={32} />}
                      </div>
                    )}
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{fileName}</p>
                    <p className="text-xs text-gray-400">Klikni pro změnu souboru</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-center gap-3 text-gray-300 dark:text-gray-600">
                      <Image size={28} /><File size={28} /><FileText size={28} />
                    </div>
                    <p className="text-gray-500 text-sm font-medium">Klikni pro nahrání souboru</p>
                    <p className="text-gray-400 text-xs">Podporované: obrázky, PDF, Word, a další</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt,.pptx,.xlsx"
                onChange={handleFile}
              />
              {fileData && (
                <div>
                  <label className="label mt-3">Poznámka k souboru</label>
                  <textarea
                    className="input resize-none text-sm"
                    rows={3}
                    placeholder="Volitelná poznámka..."
                    value={content}
                    onChange={e => setContent(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button className="btn-secondary flex-1" onClick={onClose}>Zrušit</button>
          <button className="btn-primary flex-1" onClick={handleSave} disabled={!title.trim() || (mode === 'file' && !fileData)}>
            {note ? 'Uložit' : 'Vytvořit zápisek'}
          </button>
        </div>
      </div>
    </div>
  );
}
