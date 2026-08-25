import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth';
import { TripListPage } from './pages/TripListPage';
import { WizardPage } from './pages/WizardPage';

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Routes>
          <Route path="/" element={<TripListPage />} />
          <Route path="/trips/:id" element={<WizardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}
