import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Enquiry } from '../types'
import { getEnquiry } from '../services/enquiryService'
import { DataTable } from '../components/DataTable'
import { ErrorMessage } from '../components/ErrorMessage'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { StatusBadge } from '../components/StatusBadge'
import { getApiErrorMessage } from '../utils/errors'
import { formatDate, formatQty } from '../utils/format'

export const EnquiryDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      return
    }
    const load = async () => {
      try {
        setEnquiry(await getEnquiry(id))
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

  const canEdit = enquiry && enquiry.status !== 'WON' && enquiry.status !== 'LOST'

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>{enquiry?.enquiryNumber ?? 'Enquiry'}</h1>
          <p>{enquiry?.customer?.companyName}</p>
        </div>
        <div className="actions">
          {canEdit && id ? (
            <button className="btn" type="button" onClick={() => navigate(`/enquiries/${id}/edit`)}>
              Edit
            </button>
          ) : null}
          {enquiry ? (
            <button className="btn primary" type="button" onClick={() => navigate(`/quotations/new?enquiryId=${enquiry.id}`)}>
              Create quotation
            </button>
          ) : null}
        </div>
      </div>
      <ErrorMessage message={error} />
      {enquiry ? (
        <>
          <div className="detail-grid">
            <div><small>Status</small><StatusBadge status={enquiry.status} /></div>
            <div><small>Enquiry date</small>{formatDate(enquiry.enquiryDate)}</div>
            <div><small>Required date</small>{formatDate(enquiry.requiredDate)}</div>
            <div><small>Notes</small>{enquiry.notes || '—'}</div>
          </div>
          <div className="card">
            <DataTable
              rows={enquiry.items}
              rowKey={(row) => row.id}
              empty={<p>No items</p>}
              columns={[
                { key: 'product', header: 'Product', render: (row) => row.product?.name ?? row.productId },
                { key: 'qty', header: 'Quantity', render: (row) => formatQty(row.quantity) },
                { key: 'notes', header: 'Notes', render: (row) => row.notes || '—' },
              ]}
            />
          </div>
        </>
      ) : null}
      <p><Link to="/enquiries">Back to enquiries</Link></p>
    </section>
  )
}
