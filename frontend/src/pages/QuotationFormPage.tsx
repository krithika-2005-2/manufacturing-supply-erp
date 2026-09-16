import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Enquiry, Product } from '../types'
import { listEnquiries } from '../services/enquiryService'
import { listProducts } from '../services/productService'
import { createQuotation } from '../services/quotationService'
import { Select, TextArea } from '../components/FormControls'
import { ProductItemRow, type LineItemDraft } from '../components/ProductItemRow'
import { ErrorMessage } from '../components/ErrorMessage'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { getApiErrorMessage } from '../utils/errors'
import { formatMoney } from '../utils/format'

const newLine = (): LineItemDraft => ({
  key: crypto.randomUUID(),
  productId: '',
  quantity: '1',
  unitPrice: '0',
  discountPercent: '0',
  gstPercent: '18',
})

const previewLine = (item: LineItemDraft): number => {
  const qty = Number(item.quantity)
  const price = Number(item.unitPrice)
  const disc = Number(item.discountPercent ?? 0)
  const gst = Number(item.gstPercent ?? 0)
  if (![qty, price, disc, gst].every(Number.isFinite) || qty <= 0 || price < 0) {
    return 0
  }
  const base = qty * price
  const afterDisc = base * (1 - disc / 100)
  return afterDisc * (1 + gst / 100)
}

export const QuotationFormPage = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [enquiryId, setEnquiryId] = useState(params.get('enquiryId') ?? '')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItemDraft[]>([newLine()])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [enquiryPage, productPage] = await Promise.all([
          listEnquiries({ limit: 100, page: 1 }),
          listProducts({ limit: 100, page: 1 }),
        ])
        setEnquiries(enquiryPage.data)
        setProducts(productPage.data)
      } catch (err) {
        setError(getApiErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const previewTotal = useMemo(
    () => items.reduce((sum, item) => sum + previewLine(item), 0),
    [items],
  )

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!enquiryId) {
      setError('Select an enquiry')
      return
    }
    const parsed = items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discountPercent: Number(item.discountPercent ?? 0),
      gstPercent: Number(item.gstPercent ?? 0),
    }))
    if (
      parsed.some(
        (item) =>
          !item.productId ||
          !(item.quantity > 0) ||
          !(item.unitPrice >= 0) ||
          item.discountPercent < 0 ||
          item.discountPercent > 100 ||
          item.gstPercent < 0 ||
          item.gstPercent > 100,
      )
    ) {
      setError('Each line needs product, positive quantity, and valid price/percentages')
      return
    }
    setBusy(true)
    try {
      const created = await createQuotation({
        enquiryId,
        notes: notes || undefined,
        items: parsed,
      })
      navigate(`/quotations/${created.id}`)
    } catch (err) {
      setError(getApiErrorMessage(err))
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
          <h1>New quotation</h1>
          <p>Preview total is approximate. The backend recalculates and stores the official grand total.</p>
        </div>
      </div>
      <ErrorMessage message={error} />
      <form className="card" onSubmit={onSubmit}>
        <Select
          label="Enquiry"
          name="enquiryId"
          value={enquiryId}
          onChange={setEnquiryId}
          required
          options={enquiries.map((enquiry) => ({
            value: enquiry.id,
            label: `${enquiry.enquiryNumber} — ${enquiry.customer?.companyName ?? ''}`,
          }))}
        />
        <TextArea label="Notes" name="notes" value={notes} onChange={setNotes} />
        <h3>Lines</h3>
        {items.map((item, index) => (
          <ProductItemRow
            key={item.key}
            pricing
            item={item}
            products={products}
            disableRemove={items.length === 1}
            onChange={(next) => setItems(items.map((row, rowIndex) => (rowIndex === index ? next : row)))}
            onRemove={() => setItems(items.filter((_, rowIndex) => rowIndex !== index))}
          />
        ))}
        <p>
          Display preview: <strong>{formatMoney(previewTotal)}</strong>
        </p>
        <div className="actions">
          <button type="button" className="btn" onClick={() => setItems([...items, newLine()])}>
            Add product
          </button>
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Create quotation'}
          </button>
        </div>
      </form>
    </section>
  )
}
