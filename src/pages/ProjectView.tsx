import { useParams } from 'react-router-dom';

export function ProjectView() {
  const { project } = useParams();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">{project}</h1>
      <p className="text-base-content/60">
        Project view will be implemented in Phase 3.
      </p>
    </div>
  );
}
