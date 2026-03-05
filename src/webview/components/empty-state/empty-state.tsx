interface EmptyStateProps {
  message: string
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center h-[80vh] text-description">
      <p>{message}</p>
    </div>
  )
}
