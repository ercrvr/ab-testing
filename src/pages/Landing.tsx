import { FlaskConical } from 'lucide-react';

export function Landing() {
  return (
    <div className="hero min-h-[80vh]">
      <div className="hero-content text-center">
        <div className="max-w-lg">
          <FlaskConical className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-4xl font-heading font-bold tracking-tight">
            A/B Testing Dashboard
          </h1>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="lab-label text-primary flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Experiment Viewer
            </span>
          </div>
          <p className="py-6 text-base-content/70">
            Connect your GitHub account to visualize and compare A/B test results
            across your repositories.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <span className="badge badge-outline badge-sm font-mono tracking-wider">GitHub Native</span>
            <span className="badge badge-outline badge-sm font-mono tracking-wider">Side-by-Side Grid</span>
            <span className="badge badge-outline badge-sm font-mono tracking-wider">Smart Rendering</span>
          </div>
          <div className="text-sm text-base-content/50 lab-label">
            Authentication will be available in Phase 2
          </div>
        </div>
      </div>
    </div>
  );
}
