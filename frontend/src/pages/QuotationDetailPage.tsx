import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Quotation, QuotationStatus } from '../types'
import { convertQuotation, getQuotation, updateQuotationStatus } from '../services/quotationService'
import { DataTable } from '../components/DataTable'
import { ErrorMessage } from '../components/ErrorMessage'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { StatusBadge } from '../components/StatusBadge'
import { ConfirmationDialog } from '../components/FormControls'
import { getApiErrorMessage } from '../utils/errors'
import { formatMoney, formatQty } from '../utils/format'

const nextStatuses = (status: QuotationStatus): QuotationStatus[] => {
  if (status === 'DRAFT') {
    return ['SENT']
  }
  if (status === 'SENT') {
    return ['ACCEPTED', 'REJECTED']
  }
  return []
}

export const QuotationDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [confirmConvert, setConfirmConvert] = useState(false)

  useEffect(() => {
    const run = async () => {
      if (!id) {
        setLoading(false)
        return
      }
      try {
        setQuotation(await getQuotation(id))
      } catch (err) {
        setError(getApiErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [id])

  const changeStatus = async (status: QuotationStatus) => {
    if (!id) {
      return
    }
    setBusy(true)
    setError('')
    try {
      setQuotation(await updateQuotationStatus(id, status))
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const onConvert = async () => {
    if (!id) {
      return
    }
    setBusy(true)
    setError('')
    try {
      const order = await convertQuotation(id)
      setConfirmConvert(false)
      navigate(`/sales-orders/${order.id}`)
    } catch (err) {
      setError(getApiErrorMessage(err))
      setConfirmConvert(false)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  const canConvert = quotation?.status === 'ACCEPTED' && !quotation.salesOrder

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>{quotation?.quotationNumber ?? 'Quotation'}</h1>
          <p>
            {quotation?.customer?.companyName} · Enquiry {quotation?.enquiry?.enquiryNumber ?? quotation?.enquiryId}
          </p>
        </div>
        <div className="actions">
          {quotation
            ? nextStatuses(quotation.status).map((status) => (
                <button key={status} className="btn" type="button" disabled={busy} onClick={() => void changeStatus(status)}>
                  Mark {status}
                </button>
              ))
            : null}
          {canConvert ? (
            <button className="btn primary" type="button" onClick={() => setConfirmConvert(true)}>
              Convert to sales order
            </button>
          ) : null}
        </div>
      </div>
      <ErrorMessage message={error} />
      {quotation ? (
        <>
          <div className="detail-grid">
            <div><small>Status</small><StatusBadge status={quotation.status} /></div>
            <div><small>Grand total (backend)</small>{formatMoney(quotation.grandTotal)}</div>
            <div><small>Sales order</small>{quotation.salesOrder ? quotation.salesOrder.orderNumber : 'None'}</div>
            <div><small>Notes</small>{quotation.notes || '—'}</div>
          </div>
          <div className="card">
            <DataTable
              rows={quotation.items}
              rowKey={(row) => row.id}
              empty={<p>No lines</p>}
              columns={[
                { key: 'p', header: 'Product', render: (row) => row.product?.name ?? row.productId },
                { key: 'q', header: 'Qty', render: (row) => formatQty(row.quantity) },
                { key: 'up', header: 'Unit price', render: (row) => formatMoney(row.unitPrice) },
                { key: 'd', header: 'Disc %', render: (row) => String(row.discountPercent) },
                { key: 'g', header: 'GST %', render: (row) => String(row.gstPercent) },
                { key: 't', header: 'Line total', render: (row) => formatMoney(row.lineTotal) },
              ]}
            />
          </div>
        </>
      ) : null}
      <ConfirmationDialog
        open={confirmConvert}
        title="Convert quotation"
        message="The backend will create a PENDING sales order. DRAFT/REJECTED quotations and duplicates are rejected by the API."
        confirmLabel="Convert"
        busy={busy}
        onCancel={() => setConfirmConvert(false)}
        onConfirm={() => void onConvert()}
      />
      <p><Link to="/quotations">Back to quotations</Link></p>
    </section>
  )
}
