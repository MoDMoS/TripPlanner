import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth';
import { TripListPage } from './pages/TripListPage';
import { WizardPage } from './pages/WizardPage';
import { Layout } from './shell/Layout';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<TripListPage />} />
          <Route path="/trips/:id" element={<WizardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
