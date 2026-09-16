import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Enquiry, EnquiryStatus } from '../types'
import { listEnquiries } from '../services/enquiryService'
import { DataTable } from '../components/DataTable'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { StatusBadge } from '../components/StatusBadge'
import { Select } from '../components/FormControls'
import { getApiErrorMessage } from '../utils/errors'
import { formatDate } from '../utils/format'

export const EnquiriesPage = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (nextStatus?: string) => {
    setLoading(true)
    setError('')
    try {
      const result = await listEnquiries({
        status: nextStatus ? (nextStatus as EnquiryStatus) : undefined,
        limit: 50,
        page: 1,
      })
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
          <h1>Enquiries</h1>
          <p>Customer demand with multiple product lines.</p>
        </div>
        <button className="btn primary" type="button" onClick={() => navigate('/enquiries/new')}>
          New enquiry
        </button>
      </div>
      <div className="toolbar">
        <Select
          label="Status"
          name="status"
          value={status}
          onChange={(value) => {
            setStatus(value)
            void load(value)
          }}
          emptyLabel="All statuses"
          options={['NEW', 'QUOTED', 'WON', 'LOST'].map((item) => ({ value: item, label: item }))}
        />
      </div>
      <ErrorMessage message={error} />
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card">
          <DataTable
            rows={rows}
            rowKey={(row) => row.id}
            empty={<EmptyState title="No enquiries" hint="Create an enquiry from an existing customer and products." />}
            columns={[
              { key: 'no', header: 'Enquiry', render: (row) => <Link to={`/enquiries/${row.id}`}>{row.enquiryNumber}</Link> },
              { key: 'customer', header: 'Customer', render: (row) => row.customer?.companyName ?? row.customerId },
              { key: 'dates', header: 'Required', render: (row) => formatDate(row.requiredDate) },
              { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
              { key: 'items', header: 'Lines', render: (row) => String(row.items?.length ?? 0) },
            ]}
          />
        </div>
      )}
    </section>
  )
}
