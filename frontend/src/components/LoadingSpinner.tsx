type LoadingSpinnerProps = {
  label?: string
}

export const LoadingSpinner = ({ label = 'Loading' }: LoadingSpinnerProps) => {
  return (
    <div className="spinner-wrap" role="status">
      <div className="spinner" />
      <p>{label}…</p>
    </div>
  )
}
