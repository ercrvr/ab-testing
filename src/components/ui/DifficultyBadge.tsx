interface DifficultyBadgeProps {
  difficulty: 'Simple' | 'Medium' | 'Complex';
}

const badgeStyles = {
  Simple: 'badge-success',
  Medium: 'badge-warning',
  Complex: 'badge-error',
};

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  return (
    <span className={`badge badge-sm ${badgeStyles[difficulty]}`}>
      {difficulty}
    </span>
  );
}
