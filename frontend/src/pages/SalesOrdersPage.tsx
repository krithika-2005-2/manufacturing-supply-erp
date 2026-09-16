import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { SalesOrder, SalesOrderStatus } from '../types'
import { listSalesOrders } from '../services/salesOrderService'
import { DataTable } from '../components/DataTable'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { StatusBadge } from '../components/StatusBadge'
import { Select } from '../components/FormControls'
import { getApiErrorMessage } from '../utils/errors'
import { formatDate, formatMoney } from '../utils/format'

export const SalesOrdersPage = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [rows, setRows] = useState<SalesOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (nextStatus?: string) => {
    setLoading(true)
    setError('')
    try {
      const result = await listSalesOrders({
        status: nextStatus ? (nextStatus as SalesOrderStatus) : undefined,
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
          <h1>Sales orders</h1>
          <p>Confirm and dispatch are ADMIN actions enforced by the backend.</p>
        </div>
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
          options={['PENDING', 'CONFIRMED', 'DISPATCHED', 'CANCELLED'].map((item) => ({ value: item, label: item }))}
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
            empty={<EmptyState title="No sales orders" />}
            columns={[
              {
                key: 'no',
                header: 'Order',
                render: (row) => (
                  <button className="btn ghost" type="button" onClick={() => navigate(`/sales-orders/${row.id}`)}>
                    {row.orderNumber}
                  </button>
                ),
              },
              { key: 'cust', header: 'Customer', render: (row) => row.customer?.companyName ?? row.customerId },
              { key: 'qt', header: 'Quotation', render: (row) => <Link to={`/quotations/${row.quotationId}`}>{row.quotation?.quotationNumber ?? row.quotationId}</Link> },
              { key: 'date', header: 'Created', render: (row) => formatDate(row.createdAt) },
              { key: 'total', header: 'Total', render: (row) => formatMoney(row.grandTotal) },
              { key: 'st', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            ]}
          />
        </div>
      )}
    </section>
  )
}
