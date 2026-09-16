import type { Dispatch, DispatchPayload, SalesOrder, SalesOrderStatus } from '../types'
import { api, unwrap } from './api'
import { fetchPage } from './authService'

export const listSalesOrders = (params?: {
  status?: SalesOrderStatus
  customerId?: string
  page?: number
  limit?: number
}) => {
  return fetchPage<SalesOrder>('/sales-orders', params)
}

export const getSalesOrder = async (id: string): Promise<SalesOrder> => {
  const { data } = await api.get<{ success: true; data: SalesOrder }>(`/sales-orders/${id}`)
  return unwrap(data)
}

export const confirmSalesOrder = async (id: string): Promise<SalesOrder> => {
  const { data } = await api.post<{ success: true; data: SalesOrder }>(`/sales-orders/${id}/confirm`)
  return unwrap(data)
}

export const dispatchSalesOrder = async (id: string, payload: DispatchPayload): Promise<Dispatch> => {
  const { data } = await api.post<{ success: true; data: Dispatch }>(`/sales-orders/${id}/dispatch`, payload)
  return unwrap(data)
}
