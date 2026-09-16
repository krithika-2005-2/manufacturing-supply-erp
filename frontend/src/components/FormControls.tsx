import type { ReactNode } from 'react'

type FormInputProps = {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
  error?: string
  placeholder?: string
}

export const FormInput = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  error,
  placeholder,
}: FormInputProps) => {
  return (
    <label className="field">
      <span>
        {label}
        {required ? ' *' : ''}
      </span>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <em className="field-error">{error}</em> : null}
    </label>
  )
}

type SelectOption = {
  value: string
  label: string
}

type SelectProps = {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  required?: boolean
  error?: string
  emptyLabel?: string
}

export const Select = ({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  error,
  emptyLabel = 'Select…',
}: SelectProps) => {
  return (
    <label className="field">
      <span>
        {label}
        {required ? ' *' : ''}
      </span>
      <select id={name} name={name} value={value} required={required} onChange={(event) => onChange(event.target.value)}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <em className="field-error">{error}</em> : null}
    </label>
  )
}

type DateInputProps = {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  error?: string
}

export const DateInput = ({ label, name, value, onChange, required = false, error }: DateInputProps) => {
  return (
    <FormInput
      label={label}
      name={name}
      value={value}
      onChange={onChange}
      type="date"
      required={required}
      error={error}
    />
  )
}

type TextAreaProps = {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  rows?: number
}

export const TextArea = ({ label, name, value, onChange, rows = 3 }: TextAreaProps) => {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea id={name} name={name} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

type ModalProps = {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
}

export const Modal = ({ title, open, onClose, children }: ModalProps) => {
  if (!open) {
    return null
  }
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h3 id="modal-title">{title}</h3>
          <button type="button" className="btn ghost" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

type ConfirmationDialogProps = {
  title: string
  message: string
  open: boolean
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
}

export const ConfirmationDialog = ({
  title,
  message,
  open,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  busy = false,
}: ConfirmationDialogProps) => {
  return (
    <Modal title={title} open={open} onClose={onCancel}>
      <p>{message}</p>
      <div className="actions">
        <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn primary" onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
