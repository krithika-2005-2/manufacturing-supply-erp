import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ErrorMessage } from '../components/ErrorMessage'
import { FormInput } from '../components/FormControls'
import { getApiErrorMessage } from '../utils/errors'

export const LoginPage = () => {
  const { user, login } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) {
    return <Navigate to={from} replace />
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setFieldError('')
    if (!identifier.trim()) {
      setFieldError('Email or username is required')
      return
    }
    if (password.length < 8) {
      setFieldError('Password must be at least 8 characters')
      return
    }
    setBusy(true)
    try {
      await login(identifier, password)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>Sign in</h1>
        <p>Manufacturing &amp; Supply ERP — connect to the existing backend.</p>
        <ErrorMessage message={error || fieldError} />
        <FormInput
          label="Email or username"
          name="identifier"
          value={identifier}
          onChange={setIdentifier}
          required
        />
        <FormInput
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
          required
        />
        <div className="actions">
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Login'}
          </button>
        </div>
      </form>
    </div>
  )
}
