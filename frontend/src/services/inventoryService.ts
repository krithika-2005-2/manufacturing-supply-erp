import type { InventoryRecord } from '../types'
import { api, unwrap } from './api'

export const listInventory = async (): Promise<InventoryRecord[]> => {
  const { data } = await api.get<{ success: true; data: InventoryRecord[] }>('/inventory')
  return unwrap(data)
}

export const getInventory = async (productId: string): Promise<InventoryRecord> => {
  const { data } = await api.get<{ success: true; data: InventoryRecord }>(`/inventory/${productId}`)
  return unwrap(data)
}

export const updateInventory = async (
  productId: string,
  payload: { physicalQuantity?: number; reservedQuantity?: number },
): Promise<InventoryRecord> => {
  const { data } = await api.patch<{ success: true; data: InventoryRecord }>(
    `/inventory/${productId}`,
    payload,
  )
  return unwrap(data)
}
