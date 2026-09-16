import { useEffect, useState } from 'react'
import { listCustomers } from '../services/customerService'
import { listEnquiries } from '../services/enquiryService'
import { listQuotations } from '../services/quotationService'
import { listSalesOrders } from '../services/salesOrderService'
import { listInventory } from '../services/inventoryService'
import { ErrorMessage } from '../components/ErrorMessage'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { getApiErrorMessage } from '../utils/errors'
import { formatQty } from '../utils/format'

type Counts = {
  customers: number
  enquiries: number
  quotations: number
  pending: number
  confirmed: number
  dispatched: number
  inventoryRows: number
}

export const DashboardPage = () => {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [customers, enquiries, quotations, pending, confirmed, dispatched, inventory] = await Promise.all([
          listCustomers({ limit: 1, page: 1 }),
          listEnquiries({ limit: 1, page: 1 }),
          listQuotations({ limit: 1, page: 1 }),
          listSalesOrders({ status: 'PENDING', limit: 1, page: 1 }),
          listSalesOrders({ status: 'CONFIRMED', limit: 1, page: 1 }),
          listSalesOrders({ status: 'DISPATCHED', limit: 1, page: 1 }),
          listInventory(),
        ])
        setCounts({
          customers: customers.meta.total,
          enquiries: enquiries.meta.total,
          quotations: quotations.meta.total,
          pending: pending.meta.total,
          confirmed: confirmed.meta.total,
          dispatched: dispatched.meta.total,
          inventoryRows: inventory.length,
        })
      } catch (err) {
        setError(getApiErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) {
    return <LoadingSpinner label="Loading dashboard" />
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Counts come from live GET APIs. Inventory reservation happens only on the backend.</p>
        </div>
      </div>
      <ErrorMessage message={error} />
      {counts ? (
        <div className="stats">
          <article className="card stat"><small>Customers</small><strong>{formatQty(counts.customers)}</strong></article>
          <article className="card stat"><small>Enquiries</small><strong>{formatQty(counts.enquiries)}</strong></article>
          <article className="card stat"><small>Quotations</small><strong>{formatQty(counts.quotations)}</strong></article>
          <article className="card stat"><small>Pending orders</small><strong>{formatQty(counts.pending)}</strong></article>
          <article className="card stat"><small>Confirmed orders</small><strong>{formatQty(counts.confirmed)}</strong></article>
          <article className="card stat"><small>Dispatched</small><strong>{formatQty(counts.dispatched)}</strong></article>
          <article className="card stat"><small>Inventory SKUs</small><strong>{formatQty(counts.inventoryRows)}</strong></article>
        </div>
      ) : null}
    </section>
  )
}
