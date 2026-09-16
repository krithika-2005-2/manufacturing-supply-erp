import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createCustomer, getCustomer, updateCustomer } from '../services/customerService'
import { ErrorMessage } from '../components/ErrorMessage'
import { FormInput } from '../components/FormControls'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { getApiErrorMessage } from '../utils/errors'

const empty = {
  companyName: '',
  contactPerson: '',
  mobile: '',
  email: '',
  city: '',
}

export const CustomerFormPage = () => {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id) {
      return
    }
    const load = async () => {
      try {
        const customer = await getCustomer(id)
        setForm({
          companyName: customer.companyName,
          contactPerson: customer.contactPerson,
          mobile: customer.mobile,
          email: customer.email,
          city: customer.city,
        })
      } catch (err) {
        setApiError(getApiErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id])

  const validate = () => {
    const next: Record<string, string> = {}
    if (form.companyName.trim().length < 2) next.companyName = 'Company name is required'
    if (form.contactPerson.trim().length < 2) next.contactPerson = 'Contact person is required'
    if (!/^[0-9]{10}$/.test(form.mobile)) next.mobile = 'Mobile must be 10 digits'
    if (!form.email.includes('@')) next.email = 'Valid email is required'
    if (form.city.trim().length < 2) next.city = 'City is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setApiError('')
    if (!validate()) {
      return
    }
    setBusy(true)
    try {
      if (id) {
        await updateCustomer(id, form)
        navigate(`/customers/${id}`)
      } else {
        const created = await createCustomer(form)
        navigate(`/customers/${created.id}`)
      }
    } catch (err) {
      setApiError(getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>{isEdit ? 'Edit customer' : 'New customer'}</h1>
          <p>Fields match the backend customer contract.</p>
        </div>
      </div>
      <ErrorMessage message={apiError} />
      <form className="card form-grid" onSubmit={onSubmit}>
        <FormInput label="Company name" name="companyName" value={form.companyName} onChange={(value) => setForm({ ...form, companyName: value })} required error={errors.companyName} />
        <FormInput label="Contact person" name="contactPerson" value={form.contactPerson} onChange={(value) => setForm({ ...form, contactPerson: value })} required error={errors.contactPerson} />
        <FormInput label="Mobile" name="mobile" value={form.mobile} onChange={(value) => setForm({ ...form, mobile: value })} required error={errors.mobile} />
        <FormInput label="Email" name="email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} required error={errors.email} />
        <FormInput label="City" name="city" value={form.city} onChange={(value) => setForm({ ...form, city: value })} required error={errors.city} />
        <div className="actions" style={{ gridColumn: '1 / -1' }}>
          <button className="btn ghost" type="button" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </section>
  )
}
