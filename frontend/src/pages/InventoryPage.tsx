import { useEffect, useState } from 'react'
import type { InventoryRecord } from '../types'
import { listInventory, updateInventory } from '../services/inventoryService'
import { createProduct } from '../services/productService'
import { DataTable } from '../components/DataTable'
import { EmptyState } from '../components/EmptyState'
import { ErrorMessage } from '../components/ErrorMessage'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { FormInput, Modal } from '../components/FormControls'
import { RoleGuard } from '../routes/RoleGuard'
import { getApiErrorMessage } from '../utils/errors'
import { formatQty } from '../utils/format'

export const InventoryPage = () => {
  const [rows, setRows] = useState<InventoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [sku, setSku] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [basePrice, setBasePrice] = useState('0')
  const [physical, setPhysical] = useState('0')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await listInventory()
      setRows(result)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const savePhysical = async (productId: string) => {
    const raw = edits[productId]
    const physicalQuantity = Number(raw)
    if (!Number.isFinite(physicalQuantity) || physicalQuantity < 0) {
      setError('Physical quantity must be zero or positive')
      return
    }
    setBusyId(productId)
    setError('')
    try {
      await updateInventory(productId, { physicalQuantity })
      await load()
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Inventory</h1>
          <p>Available quantity is physical minus reserved, as returned by the backend.</p>
        </div>
        <RoleGuard roles={['ADMIN']}>
          <button className="btn primary" type="button" onClick={() => setCreateOpen(true)}>
            New product
          </button>
        </RoleGuard>
        <button className="btn" type="button" onClick={() => void load()}>
          Refresh
        </button>
      </div>
      <ErrorMessage message={error} />
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="card">
          <DataTable
            rows={rows}
            rowKey={(row) => row.productId}
            empty={<EmptyState title="No inventory records" />}
            columns={[
              { key: 'sku', header: 'SKU', render: (row) => row.product?.sku ?? '—' },
              { key: 'name', header: 'Product', render: (row) => row.product?.name ?? row.productId },
              { key: 'phys', header: 'Physical', render: (row) => formatQty(row.physicalQuantity) },
              { key: 'res', header: 'Reserved', render: (row) => formatQty(row.reservedQuantity) },
              { key: 'avail', header: 'Available', render: (row) => formatQty(row.availableQuantity) },
              {
                key: 'admin',
                header: 'ADMIN update physical',
                render: (row) => (
                  <RoleGuard roles={['ADMIN']} fallback={<span>—</span>}>
                    <span className="toolbar">
                      <input
                        style={{ width: 90 }}
                        value={edits[row.productId] ?? String(row.physicalQuantity)}
                        onChange={(event) => setEdits({ ...edits, [row.productId]: event.target.value })}
                      />
                      <button
                        className="btn"
                        type="button"
                        disabled={busyId === row.productId}
                        onClick={() => void savePhysical(row.productId)}
                      >
                        Save
                      </button>
                    </span>
                  </RoleGuard>
                ),
              },
            ]}
          />
        </div>
      )}
      <Modal title="Create product" open={createOpen} onClose={() => setCreateOpen(false)}>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void (async () => {
              if (sku.trim().length < 1 || name.trim().length < 2) {
                setError('SKU and name are required')
                return
              }
              if (category.trim().length < 1) {
                setError('Category is required')
                return
              }
              const price = Number(basePrice)
              if (!Number.isFinite(price) || price < 0) {
                setError('Base price must be zero or positive')
                return
              }
              const physicalQuantity = Number(physical)
              if (!Number.isFinite(physicalQuantity) || physicalQuantity < 0) {
                setError('Opening physical quantity must be zero or positive')
                return
              }
              try {
                await createProduct({
                  sku: sku.trim(),
                  name: name.trim(),
                  category: category.trim(),
                  basePrice: price,
                  physicalQuantity,
                })
                setCreateOpen(false)
                setSku('')
                setName('')
                setCategory('')
                setBasePrice('0')
                setPhysical('0')
                await load()
              } catch (err) {
                setError(getApiErrorMessage(err))
              }
            })()
          }}
        >
          <FormInput label="SKU" name="sku" value={sku} onChange={setSku} required />
          <FormInput label="Name" name="name" value={name} onChange={setName} required />
          <FormInput label="Category" name="category" value={category} onChange={setCategory} required />
          <FormInput label="Base price" name="basePrice" value={basePrice} onChange={setBasePrice} required />
          <FormInput label="Opening physical qty" name="physical" value={physical} onChange={setPhysical} />
          <div className="actions">
            <button className="btn primary" type="submit">
              Create
            </button>
          </div>
        </form>
      </Modal>
    </section>
  )
}