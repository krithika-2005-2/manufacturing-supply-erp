type ErrorMessageProps = {
  message: string
}

export const ErrorMessage = ({ message }: ErrorMessageProps) => {
  if (!message) {
    return null
  }
  return (
    <div className="alert alert-error" role="alert">
      {message}
    </div>
  )
}
