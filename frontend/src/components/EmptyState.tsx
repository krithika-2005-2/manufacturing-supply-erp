type EmptyStateProps = {
  title: string
  hint?: string
}

export const EmptyState = ({ title, hint }: EmptyStateProps) => {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {hint ? <p>{hint}</p> : null}
    </div>
  )
}
