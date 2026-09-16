import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Quotation, QuotationStatus } from '../types'
import { listQuotations } from '../services/quotationService'
import { DataTable } from '../components/DataTable'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { StatusBadge } from '../components/StatusBadge'
import { Select } from '../components/FormControls'
import { getApiErrorMessage } from '../utils/errors'
import { formatMoney } from '../utils/format'

export const QuotationsPage = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (nextStatus?: string) => {
    setLoading(true)
    setError('')
    try {
      const result = await listQuotations({
        status: nextStatus ? (nextStatus as QuotationStatus) : undefined,
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
          <h1>Quotations</h1>
          <p>Totals shown here are stored by the backend. Frontend math is display-only.</p>
        </div>
        <button className="btn primary" type="button" onClick={() => navigate('/quotations/new')}>
          New quotation
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
          options={['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'].map((item) => ({ value: item, label: item }))}
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
            empty={<EmptyState title="No quotations" />}
            columns={[
              { key: 'no', header: 'Quotation', render: (row) => <Link to={`/quotations/${row.id}`}>{row.quotationNumber}</Link> },
              { key: 'enq', header: 'Enquiry', render: (row) => row.enquiry?.enquiryNumber ?? row.enquiryId },
              { key: 'cust', header: 'Customer', render: (row) => row.customer?.companyName ?? row.customerId },
              { key: 'total', header: 'Grand total', render: (row) => formatMoney(row.grandTotal) },
              { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            ]}
          />
        </div>
      )}
    </section>
  )
}
