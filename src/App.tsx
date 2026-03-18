import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Landing } from './pages/Landing';
import { RepoSelector } from './pages/RepoSelector';
import { ProjectList } from './pages/ProjectList';
import { ProjectView } from './pages/ProjectView';
import { TestComparison } from './pages/TestComparison';
import type { ReactNode } from 'react';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { auth } = useAuth();
  if (!auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/repos" element={<ProtectedRoute><RepoSelector /></ProtectedRoute>} />
          <Route path="/repo/:owner/:repo" element={<ProtectedRoute><ProjectList /></ProtectedRoute>} />
          <Route path="/repo/:owner/:repo/:project" element={<ProtectedRoute><ProjectView /></ProtectedRoute>} />
          <Route path="/repo/:owner/:repo/:project/:testId" element={<ProtectedRoute><TestComparison /></ProtectedRoute>} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
}
