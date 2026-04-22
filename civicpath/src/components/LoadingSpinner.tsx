// src/components/LoadingSpinner.tsx
interface Props { label?: string; }

export default function LoadingSpinner({ label = "Loading..." }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-surface-1" role="status" aria-label={label}>
      <div className="w-10 h-10 border-4 border-surface-3 border-t-brand-500 rounded-full animate-spin" aria-hidden="true" />
      <span className="text-body text-text-secondary">{label}</span>
    </div>
  );
}
