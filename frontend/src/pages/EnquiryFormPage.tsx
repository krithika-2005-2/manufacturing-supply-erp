import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Customer, Product } from '../types'
import { listCustomers } from '../services/customerService'
import { listProducts } from '../services/productService'
import { createEnquiry, getEnquiry, updateEnquiry } from '../services/enquiryService'
import { DateInput, Select, TextArea } from '../components/FormControls'
import { ProductItemRow, type LineItemDraft } from '../components/ProductItemRow'
import { ErrorMessage } from '../components/ErrorMessage'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { getApiErrorMessage } from '../utils/errors'
import { toDateInput } from '../utils/format'

const newLine = (): LineItemDraft => ({
  key: crypto.randomUUID(),
  productId: '',
  quantity: '1',
  notes: '',
})

export const EnquiryFormPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customerId, setCustomerId] = useState('')
  const [enquiryDate, setEnquiryDate] = useState(toDateInput(new Date().toISOString()))
  const [requiredDate, setRequiredDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItemDraft[]>([newLine()])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [customerPage, productPage] = await Promise.all([
          listCustomers({ limit: 100, page: 1 }),
          listProducts({ limit: 100, page: 1 }),
        ])
        setCustomers(customerPage.data)
        setProducts(productPage.data)
        if (id) {
          const enquiry = await getEnquiry(id)
          setCustomerId(enquiry.customerId)
          setEnquiryDate(toDateInput(enquiry.enquiryDate))
          setRequiredDate(toDateInput(enquiry.requiredDate))
          setNotes(enquiry.notes ?? '')
          setItems(
            enquiry.items.map((item) => ({
              key: item.id,
              productId: item.productId,
              quantity: String(item.quantity),
              notes: item.notes ?? '',
            })),
          )
        }
      } catch (err) {
        setError(getApiErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!customerId) {
      setError('Select a customer')
      return
    }
    if (!enquiryDate || !requiredDate) {
      setError('Enquiry date and required date are required')
      return
    }
    if (requiredDate < enquiryDate) {
      setError('Required date cannot be before enquiry date')
      return
    }
    const parsedItems = items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      notes: item.notes || undefined,
    }))
    if (parsedItems.some((item) => !item.productId || !(item.quantity > 0))) {
      setError('Each line needs a product and a positive quantity')
      return
    }
    setBusy(true)
    try {
      const payload = {
        customerId,
        enquiryDate,
        requiredDate,
        notes: notes || undefined,
        items: parsedItems,
      }
      const saved = id ? await updateEnquiry(id, payload) : await createEnquiry(payload)
      navigate(`/enquiries/${saved.id}`)
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
          <h1>{isEdit ? 'Edit enquiry' : 'New enquiry'}</h1>
          <p>Select customers and products from existing backend records.</p>
        </div>
      </div>
      <ErrorMessage message={error} />
      <form className="card" onSubmit={onSubmit}>
        <div className="form-grid">
          <Select
            label="Customer"
            name="customerId"
            value={customerId}
            onChange={setCustomerId}
            required
            options={customers.map((customer) => ({ value: customer.id, label: customer.companyName }))}
          />
          <DateInput label="Enquiry date" name="enquiryDate" value={enquiryDate} onChange={setEnquiryDate} required />
          <DateInput label="Required date" name="requiredDate" value={requiredDate} onChange={setRequiredDate} required />
        </div>
        <TextArea label="Notes" name="notes" value={notes} onChange={setNotes} />
        <h3>Products</h3>
        {items.map((item, index) => (
          <ProductItemRow
            key={item.key}
            item={item}
            products={products}
            disableRemove={items.length === 1}
            onChange={(next) => setItems(items.map((row, rowIndex) => (rowIndex === index ? next : row)))}
            onRemove={() => setItems(items.filter((_, rowIndex) => rowIndex !== index))}
          />
        ))}
        <div className="actions">
          <button type="button" className="btn" onClick={() => setItems([...items, newLine()])}>
            Add product
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save enquiry'}
          </button>
        </div>
      </form>
    </section>
  )
}
