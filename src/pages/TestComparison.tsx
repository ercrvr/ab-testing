import { useParams } from 'react-router-dom';

export function TestComparison() {
  const { project, testId } = useParams();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-heading font-bold mb-4">
        {project} / {testId}
      </h1>
      <p className="text-base-content/60 font-mono text-sm">
        Variant grid comparison will be implemented in Phase 5.
      </p>
      <div className="mt-6 text-base-content/40 text-xs font-mono uppercase tracking-widest">
        Layout: responsive grid · one column per variant · fullscreen popup on click
      </div>
    </div>
  );
}
