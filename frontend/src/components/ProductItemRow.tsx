import type { Product } from '../types'

export type LineItemDraft = {
  key: string
  productId: string
  quantity: string
  notes?: string
  unitPrice?: string
  discountPercent?: string
  gstPercent?: string
}

type ProductItemRowProps = {
  item: LineItemDraft
  products: Product[]
  onChange: (item: LineItemDraft) => void
  onRemove: () => void
  pricing?: boolean
  disableRemove?: boolean
}

export const ProductItemRow = ({
  item,
  products,
  onChange,
  onRemove,
  pricing = false,
  disableRemove = false,
}: ProductItemRowProps) => {
  return (
    <div className="item-row">
      <label className="field">
        <span>Product</span>
        <select
          value={item.productId}
          onChange={(event) => onChange({ ...item, productId: event.target.value })}
        >
          <option value="">Select product</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.sku} — {product.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Quantity</span>
        <input
          type="number"
          min="0.0001"
          step="any"
          value={item.quantity}
          onChange={(event) => onChange({ ...item, quantity: event.target.value })}
        />
      </label>
      {pricing ? (
        <>
          <label className="field">
            <span>Unit price</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={item.unitPrice ?? ''}
              onChange={(event) => onChange({ ...item, unitPrice: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Discount %</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={item.discountPercent ?? '0'}
              onChange={(event) => onChange({ ...item, discountPercent: event.target.value })}
            />
          </label>
          <label className="field">
            <span>GST %</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={item.gstPercent ?? '0'}
              onChange={(event) => onChange({ ...item, gstPercent: event.target.value })}
            />
          </label>
        </>
      ) : (
        <label className="field">
          <span>Line notes</span>
          <input
            value={item.notes ?? ''}
            onChange={(event) => onChange({ ...item, notes: event.target.value })}
          />
        </label>
      )}
      <button type="button" className="btn danger" onClick={onRemove} disabled={disableRemove}>
        Remove
      </button>
    </div>
  )
}
