import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Customer } from '../types'
import { getCustomer } from '../services/customerService'
import { ErrorMessage } from '../components/ErrorMessage'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { getApiErrorMessage } from '../utils/errors'

export const CustomerDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      return
    }
    const load = async () => {
      try {
        setCustomer(await getCustomer(id))
      } catch (err) {
        setError(getApiErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id])

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>{customer?.companyName ?? 'Customer'}</h1>
          <p>Customer master data from the backend.</p>
        </div>
        {id ? (
          <button className="btn primary" type="button" onClick={() => navigate(`/customers/${id}/edit`)}>
            Edit
          </button>
        ) : null}
      </div>
      <ErrorMessage message={error} />
      {customer ? (
        <div className="card detail-grid">
          <div><small>Contact</small>{customer.contactPerson}</div>
          <div><small>Mobile</small>{customer.mobile}</div>
          <div><small>Email</small>{customer.email}</div>
          <div><small>City</small>{customer.city}</div>
        </div>
      ) : null}
      <p><Link to="/customers">Back to customers</Link></p>
    </section>
  )
}
