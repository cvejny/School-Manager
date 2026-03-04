import { Sun, Moon, Monitor, Clock, SortAsc, Eye, Palette, Globe, Trash2, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Theme, SortOption } from '../types';

export default function Settings() {
  const { data, updateSettings, deleteSubject } = useApp();
  const { settings } = data;

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Světlé', icon: <Sun size={18} /> },
    { value: 'dark', label: 'Tmavé', icon: <Moon size={18} /> },
    { value: 'system', label: 'Systém', icon: <Monitor size={18} /> },
  ];

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'dueDate', label: 'Datum splnění' },
    { value: 'priority', label: 'Priorita' },
    { value: 'createdAt', label: 'Datum vytvoření' },
  ];

  const handleClearAllData = () => {
    if (confirm('Opravdu smazat všechna data? Tato akce je nevratná!')) {
      localStorage.removeItem('school-manager-data');
      window.location.reload();
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nastavení</h1>
        <p className="text-gray-400 mt-1">Přizpůsob aplikaci svým potřebám</p>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Palette size={18} className="text-primary-500" />
            <h2 className="font-bold text-gray-900 dark:text-white">Vzhled</h2>
          </div>

          <div>
            <label className="label">Téma</label>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateSettings({ theme: opt.value })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 ${
                    settings.theme === opt.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {opt.icon}
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Home page */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Clock size={18} className="text-primary-500" />
            <h2 className="font-bold text-gray-900 dark:text-white">Hlavní stránka</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="label">Nadcházející úkoly – zobrazit příštích N dní</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={settings.upcomingDays}
                  onChange={e => updateSettings({ upcomingDays: Number(e.target.value) })}
                  className="flex-1 accent-primary-600"
                />
                <div className="w-16 text-center">
                  <span className="text-2xl font-bold text-primary-600">{settings.upcomingDays}</span>
                  <span className="text-xs text-gray-400 block">dní</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Na hlavní stránce se zobrazí úkoly se splněním do {settings.upcomingDays} dnů.
              </p>
            </div>

            <div>
              <label className="label">Výchozí řazení úkolů</label>
              <select
                className="select"
                value={settings.defaultSort}
                onChange={e => updateSettings({ defaultSort: e.target.value as SortOption })}
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-gray-700 dark:text-gray-300">Zobrazit dokončené úkoly</p>
                <p className="text-xs text-gray-400 mt-0.5">Na hlavní stránce se zobrazí i splněné úkoly</p>
              </div>
              <button
                onClick={() => updateSettings({ showDoneTasks: !settings.showDoneTasks })}
                className={`relative w-12 h-6 rounded-full transition-all duration-200 ${
                  settings.showDoneTasks ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${
                  settings.showDoneTasks ? 'left-6' : 'left-0.5'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm text-gray-700 dark:text-gray-300">Předpis zkratky do názvu úkolu</p>
                <p className="text-xs text-gray-400 mt-0.5">Při vytváření úkolu se do názvu automaticky doplní zkratka předmětu, např. „MAT - “</p>
              </div>
              <button
                onClick={() => updateSettings({ abbreviationPrefix: !settings.abbreviationPrefix })}
                className={`relative w-12 h-6 rounded-full transition-all duration-200 ${
                  settings.abbreviationPrefix ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${
                  settings.abbreviationPrefix ? 'left-6' : 'left-0.5'
                }`} />
              </button>
            </div>          </div>
        </div>

        {/* Data stats */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Globe size={18} className="text-primary-500" />
            <h2 className="font-bold text-gray-900 dark:text-white">Data</h2>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.subjects.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Předmětů</p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.tasks.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Úkolů</p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.notes.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Zápisků</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-4">
            Všechna data jsou uložena lokálně ve vašem prohlížeči (localStorage).
          </p>

          <button
            onClick={handleClearAllData}
            className="btn-danger w-full text-sm"
          >
            <Trash2 size={15} />Smazat všechna data
          </button>
        </div>

        {/* About */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 dark:text-white mb-3">O aplikaci</h2>
          <p className="text-sm text-gray-400">
            <strong className="text-gray-700 dark:text-gray-300">School Manager</strong> – moderní nástroj pro správu školních úkolů, projektů a zápisků.
          </p>
          <p className="text-xs text-gray-400 mt-2">Verze 1.0.0</p>
        </div>
      </div>
    </div>
  );
}
