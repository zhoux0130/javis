import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { api } from './api';
import { AdminLayout } from './layouts/AdminLayout';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';

/** 进后台前先问一次 /api/auth/me；未登录带上原路径跳登录页。 */
function RequireAuth({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'ok' | 'denied'>('loading');
  const location = useLocation();
  useEffect(() => {
    api.me().then(() => setState('ok'), () => setState('denied'));
  }, []);
  if (state === 'loading') return <Spin fullscreen />;
  if (state === 'denied') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
