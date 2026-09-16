import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Customer } from '../types'
import { listCustomers } from '../services/customerService'
import { DataTable } from '../components/DataTable'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { FormInput } from '../components/FormControls'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { getApiErrorMessage } from '../utils/errors'

export const CustomersPage = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (term?: string) => {
    setLoading(true)
    setError('')
    try {
      const result = await listCustomers({ search: term || undefined, limit: 50, page: 1 })
      setRows(result.data)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Customers</h1>
          <p>Create and maintain customer records used by enquiries and quotations.</p>
        </div>
        <button className="btn primary" type="button" onClick={() => navigate('/customers/new')}>
          New customer
        </button>
      </div>
      <div className="toolbar">
        <FormInput label="Search" name="search" value={search} onChange={setSearch} placeholder="Company, contact, email" />
        <button className="btn" type="button" onClick={() => void load(search)} style={{ alignSelf: 'end' }}>
          Search
        </button>
      </div>
      <ErrorMessage message={error} />
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card">
          <DataTable
            rows={rows}
            rowKey={(row) => row.id}
            empty={<EmptyState title="No customers found" hint="Create a customer to start an enquiry." />}
            columns={[
              { key: 'company', header: 'Company', render: (row) => <Link to={`/customers/${row.id}`}>{row.companyName}</Link> },
              { key: 'contact', header: 'Contact', render: (row) => row.contactPerson },
              { key: 'mobile', header: 'Mobile', render: (row) => row.mobile },
              { key: 'email', header: 'Email', render: (row) => row.email },
              { key: 'city', header: 'City', render: (row) => row.city },
            ]}
          />
        </div>
      )}
    </section>
  )
}
