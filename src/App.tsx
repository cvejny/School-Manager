import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Timetable from './pages/Timetable';
import Subjects from './pages/Subjects';
import SubjectDetail from './pages/SubjectDetail';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import Calendar from './pages/Calendar';
import Stats from './pages/Stats';
import Pomodoro from './pages/Pomodoro';
import Tags from './pages/Tags';
import { Loader2 } from 'lucide-react';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 size={32} className="animate-spin text-primary-500" />
      </div>
    );
  }

  if (!user) return <Auth />;

  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/timetable" element={<Timetable />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path="/subjects/:id" element={<SubjectDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/pomodoro" element={<Pomodoro />} />
            <Route path="/tags" element={<Tags />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
