import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Landing } from './pages/Landing';
import { RepoSelector } from './pages/RepoSelector';
import { ProjectList } from './pages/ProjectList';
import { ProjectView } from './pages/ProjectView';
import { TestComparison } from './pages/TestComparison';

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-base-100">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/repos" element={<RepoSelector />} />
              <Route path="/repo/:owner/:repo" element={<ProjectList />} />
              <Route path="/repo/:owner/:repo/:project" element={<ProjectView />} />
              <Route path="/repo/:owner/:repo/:project/:testId" element={<TestComparison />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </HashRouter>
  );
}
