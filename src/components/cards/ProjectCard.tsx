import { Link, useLocation } from 'react-router-dom';
import { FolderOpen, FlaskConical } from 'lucide-react';
import type { Project } from '../../types';

interface ProjectCardProps {
  project: Project;
  repoOwner: string;
  repoName: string;
}

export function ProjectCard({ project, repoOwner, repoName }: ProjectCardProps) {
  const location = useLocation();
  const currentDepth = (location.state as { repoNavDepth?: number } | null)?.repoNavDepth ?? 1;

  return (
    <Link
      to={`/repo/${repoOwner}/${repoName}/${project.name}`}
      state={{ repoNavDepth: currentDepth + 1 }}
      className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
    >
      <div className="card-body p-5">
        <div className="flex items-start gap-3">
          <FolderOpen className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0">
            <h3 className="card-title text-base font-heading">{project.displayName}</h3>
            <p className="text-sm text-base-content/60 mt-1 flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5" />
              {project.testCount} {project.testCount === 1 ? 'test' : 'tests'}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
