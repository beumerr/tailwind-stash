import './EmptyState.css';

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div class="empty-state">
      <p>{message}</p>
    </div>
  );
}
