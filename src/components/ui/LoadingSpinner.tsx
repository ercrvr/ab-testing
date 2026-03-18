interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizeClass = {
    sm: 'loading-sm',
    md: 'loading-md',
    lg: 'loading-lg',
  }[size];

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-8">
      <span className={`loading loading-spinner ${sizeClass}`} />
      {text && <p className="text-sm text-base-content/60">{text}</p>}
    </div>
  );
}
