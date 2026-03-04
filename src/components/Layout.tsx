import { NavLink, Outlet } from 'react-router-dom';
import { Home, BookOpen, Settings, GraduationCap, LogOut, Calendar, BarChart2, Timer, Tag, LayoutGrid } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import DynamicIcon from './DynamicIcon';

export default function Layout() {
  const { data } = useApp();
  const { user, signOut } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-200 dark:shadow-primary-900/30">
              <GraduationCap size={18} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white text-lg">School Manager</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <NavLink to="/home" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Home size={18} />
            <span>Přehled</span>
          </NavLink>
          <NavLink to="/timetable" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <LayoutGrid size={18} />
            <span>Rozvrh</span>
          </NavLink>
          <NavLink to="/subjects" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <BookOpen size={18} />
            <span>Předměty</span>
          </NavLink>
          <NavLink to="/tags" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Tag size={18} />
            <span>Štítky</span>
          </NavLink>
          <NavLink to="/calendar" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Calendar size={18} />
            <span>Kalendář</span>
          </NavLink>
          <NavLink to="/stats" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <BarChart2 size={18} />
            <span>Statistiky</span>
          </NavLink>
          <NavLink to="/pomodoro" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Timer size={18} />
            <span>Pomodoro</span>
          </NavLink>

          {/* Subjects list */}
          {data.subjects.length > 0 && (
            <div className="pt-2">
              <div className="px-3 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider">
                Moje předměty
              </div>
              {(() => {
                const order: string[] = (() => { try { return JSON.parse(localStorage.getItem('subject_order') || '[]'); } catch { return []; } })();
                const ordered = [...data.subjects].sort((a, b) => {
                  const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
                  if (ai === -1 && bi === -1) return 0;
                  if (ai === -1) return 1;
                  if (bi === -1) return -1;
                  return ai - bi;
                });
                return ordered;
              })().map(subject => {
                const remaining = data.tasks.filter(t => t.subjectId === subject.id && t.status !== 'done' && t.status !== 'wont_do').length;
                return (
                  <NavLink
                    key={subject.id}
                    to={`/subjects/${subject.id}`}
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''} justify-between`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: subject.color + '30', color: subject.color }}
                      >
                        <DynamicIcon name={subject.icon} size={12} />
                      </div>
                      <span className="truncate text-sm">{subject.abbreviation || subject.name}</span>
                    </div>
                    {remaining > 0 && (
                      <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex-shrink-0">{remaining}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          )}

        </nav>

        {/* Settings + User */}
        <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
          <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Settings size={18} />
            <span>Nastavení</span>
          </NavLink>
          <div className="flex items-center gap-2 px-3 py-2 mt-1">
            <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                {user?.email?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">{user?.email}</span>
            <button
              onClick={signOut}
              title="Odhlásit se"
              className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>


    </div>
  );
}
