import { useParams } from 'react-router-dom';

export function ProjectList() {
  const { owner, repo } = useParams();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">
        Projects in {owner}/{repo}
      </h1>
      <p className="text-base-content/60">
        Project discovery will be implemented in Phase 3.
      </p>
    </div>
  );
}
