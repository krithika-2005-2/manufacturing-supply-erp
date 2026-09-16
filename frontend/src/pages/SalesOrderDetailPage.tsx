import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { InventoryRecord, SalesOrder } from '../types'
import { confirmSalesOrder, dispatchSalesOrder, getSalesOrder } from '../services/salesOrderService'
import { listInventory } from '../services/inventoryService'
import { DataTable } from '../components/DataTable'
import { ErrorMessage } from '../components/ErrorMessage'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { StatusBadge } from '../components/StatusBadge'
import { ConfirmationDialog, DateInput, FormInput, Modal } from '../components/FormControls'
import { RoleGuard } from '../routes/RoleGuard'
import { getApiErrorMessage } from '../utils/errors'
import { formatDate, formatMoney, formatQty, toDateInput } from '../utils/format'

export const SalesOrderDetailPage = () => {
  const { id } = useParams()
  const [order, setOrder] = useState<SalesOrder | null>(null)
  const [inventory, setInventory] = useState<InventoryRecord[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [dispatchOpen, setDispatchOpen] = useState(false)
  const [dispatchDate, setDispatchDate] = useState(toDateInput(new Date().toISOString()))
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [driverName, setDriverName] = useState('')

  const refresh = async () => {
    if (!id) {
      return
    }
    const [nextOrder, stock] = await Promise.all([getSalesOrder(id), listInventory()])
    setOrder(nextOrder)
    setInventory(stock)
  }

  useEffect(() => {
    const run = async () => {
      if (!id) {
        setLoading(false)
        return
      }
      try {
        const [nextOrder, stock] = await Promise.all([getSalesOrder(id), listInventory()])
        setOrder(nextOrder)
        setInventory(stock)
      } catch (err) {
        setError(getApiErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [id])

  const onConfirm = async () => {
    if (!id) {
      return
    }
    setBusy(true)
    setError('')
    try {
      await confirmSalesOrder(id)
      await refresh()
      setConfirmOpen(false)
    } catch (err) {
      setError(getApiErrorMessage(err))
      setConfirmOpen(false)
    } finally {
      setBusy(false)
    }
  }

  const onDispatch = async (event: FormEvent) => {
    event.preventDefault()
    if (!id || !order) {
      return
    }
    if (!vehicleNumber.trim() || driverName.trim().length < 2) {
      setError('Vehicle number and driver name are required')
      return
    }
    setBusy(true)
    setError('')
    try {
      await dispatchSalesOrder(id, {
        dispatchDate,
        vehicleNumber: vehicleNumber.trim(),
        driverName: driverName.trim(),
        items: order.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
        })),
      })
      setDispatchOpen(false)
      await refresh()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  const stockByProduct = new Map(inventory.map((row) => [row.productId, row]))

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>{order?.orderNumber ?? 'Sales order'}</h1>
          <p>{order?.customer?.companyName}</p>
        </div>
        <RoleGuard roles={['ADMIN']}>
          <div className="actions">
            {order?.status === 'PENDING' ? (
              <button className="btn primary" type="button" onClick={() => setConfirmOpen(true)}>
                Confirm &amp; reserve stock
              </button>
            ) : null}
            {order?.status === 'CONFIRMED' ? (
              <button className="btn accent" type="button" onClick={() => setDispatchOpen(true)}>
                Dispatch
              </button>
            ) : null}
          </div>
        </RoleGuard>
      </div>
      <ErrorMessage message={error} />
      {order ? (
        <>
          <div className="detail-grid">
            <div><small>Status</small><StatusBadge status={order.status} /></div>
            <div><small>Created</small>{formatDate(order.createdAt)}</div>
            <div><small>Quotation</small><Link to={`/quotations/${order.quotationId}`}>{order.quotation?.quotationNumber ?? order.quotationId}</Link></div>
            <div><small>Total</small>{formatMoney(order.grandTotal)}</div>
            <div><small>Dispatch</small>{order.dispatch?.dispatchNumber ?? 'Not dispatched'}</div>
          </div>
          <div className="card">
            <h3>Lines &amp; live inventory</h3>
            <DataTable
              rows={order.items}
              rowKey={(row) => row.id}
              empty={<p>No items</p>}
              columns={[
                { key: 'p', header: 'Product', render: (row) => row.product?.name ?? row.productId },
                { key: 'q', header: 'Ordered', render: (row) => formatQty(row.quantity) },
                { key: 't', header: 'Line total', render: (row) => formatMoney(row.lineTotal) },
                {
                  key: 'avail',
                  header: 'Available now',
                  render: (row) => formatQty(stockByProduct.get(row.productId)?.availableQuantity),
                },
                {
                  key: 'phys',
                  header: 'Physical',
                  render: (row) => formatQty(stockByProduct.get(row.productId)?.physicalQuantity),
                },
                {
                  key: 'res',
                  header: 'Reserved',
                  render: (row) => formatQty(stockByProduct.get(row.productId)?.reservedQuantity),
                },
              ]}
            />
          </div>
        </>
      ) : null}

      <ConfirmationDialog
        open={confirmOpen}
        title="Confirm sales order"
        message="The backend will lock inventory and increase reserved quantity. Physical stock is not reduced until dispatch."
        confirmLabel="Confirm"
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void onConfirm()}
      />

      <Modal title="Dispatch order" open={dispatchOpen} onClose={() => setDispatchOpen(false)}>
        <form onSubmit={onDispatch}>
          <p>Dispatch quantities default to the ordered (reserved) quantities. Inventory math is performed by the API.</p>
          <DateInput label="Dispatch date" name="dispatchDate" value={dispatchDate} onChange={setDispatchDate} required />
          <FormInput label="Vehicle number" name="vehicleNumber" value={vehicleNumber} onChange={setVehicleNumber} required />
          <FormInput label="Driver name" name="driverName" value={driverName} onChange={setDriverName} required />
          <div className="actions">
            <button type="button" className="btn ghost" onClick={() => setDispatchOpen(false)}>
              Cancel
            </button>
            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? 'Dispatching…' : 'Dispatch'}
            </button>
          </div>
        </form>
      </Modal>
      <p><Link to="/sales-orders">Back to sales orders</Link></p>
    </section>
  )
}
