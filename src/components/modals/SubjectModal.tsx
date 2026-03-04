import { useState } from 'react';
import { X, Plus, ChevronUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BASIC_COLORS, SUBJECT_COLORS, SUBJECT_ICONS } from '../../utils/helpers';
import DynamicIcon from '../DynamicIcon';
import type { Subject } from '../../types';

interface Props {
  subject?: Subject;
  onClose: () => void;
  onSaved?: (subject: Subject) => void;
}

export default function SubjectModal({ subject, onClose, onSaved }: Props) {
  const { addSubject, updateSubject } = useApp();
  const [name, setName] = useState(subject?.name || '');
  const [abbreviation, setAbbreviation] = useState(subject?.abbreviation || '');
  const [description, setDescription] = useState(subject?.description || '');
  const [color, setColor] = useState(subject?.color || BASIC_COLORS[0]);
  const [icon, setIcon] = useState(subject?.icon || SUBJECT_ICONS[0]);
  const [showMoreColors, setShowMoreColors] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return;
    if (subject) {
      updateSubject(subject.id, { name: name.trim(), abbreviation: abbreviation.trim(), description, color, icon });
      onSaved?.(subject);
    } else {
      const s = addSubject({ name: name.trim(), abbreviation: abbreviation.trim(), description, color, icon });
      onSaved?.(s);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold">{subject ? 'Upravit předmět' : 'Nový předmět'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Preview */}
          <div className="flex items-center justify-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: color + '25', border: `2px solid ${color}40` }}
            >
              <DynamicIcon name={icon} size={32} className="opacity-90" style={{ color }} />
            </div>
          </div>

          <div>
            <label className="label">Název předmětu *</label>
            <input
              className="input"
              placeholder="např. Matematika"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>

          <div>
            <label className="label">Zkratka (volitelné)</label>
            <input
              className="input"
              placeholder="např. MAT, ČJL..."
              value={abbreviation}
              onChange={e => setAbbreviation(e.target.value)}
              maxLength={10}
            />
            <p className="text-xs text-gray-400 mt-1">Zobrazuje se v postranním panelu, úkolech a kalendáři místo celého názvu.</p>
          </div>

          <div>
            <label className="label">Popis (volitelné)</label>
            <input
              className="input"
              placeholder="Krátký popis předmětu..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Barva</label>
            <div className="flex items-center gap-2">
              {BASIC_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setShowMoreColors(false); }}
                  className="w-7 h-7 rounded-full transition-all hover:scale-110 focus:outline-none flex-shrink-0"
                  style={{
                    backgroundColor: c,
                    boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined,
                  }}
                />
              ))}
              <button
                onClick={() => setShowMoreColors(v => !v)}
                className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                title={showMoreColors ? 'Skrýt barvy' : 'Více barev'}
              >
                {showMoreColors ? <ChevronUp size={14} /> : <Plus size={14} />}
              </button>
            </div>

            {showMoreColors && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SUBJECT_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-6 h-6 rounded-full transition-all hover:scale-110 focus:outline-none flex-shrink-0"
                    style={{
                      backgroundColor: c,
                      boxShadow: color === c ? `0 0 0 2px white, 0 0 0 3px ${c}` : undefined,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="label">Ikona</label>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_ICONS.map(ic => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110 ${
                    icon === ic
                      ? 'shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                  style={icon === ic ? { backgroundColor: color + '25', color } : {}}
                >
                  <DynamicIcon name={ic} size={18} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <button className="btn-secondary flex-1" onClick={onClose}>Zrušit</button>
          <button className="btn-primary flex-1" onClick={handleSave} disabled={!name.trim()}>
            {subject ? 'Uložit' : 'Vytvořit'}
          </button>
        </div>
      </div>
    </div>
  );
}
