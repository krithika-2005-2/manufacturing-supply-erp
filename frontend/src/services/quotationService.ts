import type { Quotation, QuotationPayload, QuotationStatus, SalesOrder } from '../types'
import { api, unwrap } from './api'
import { fetchPage } from './authService'

export const listQuotations = (params?: {
  status?: QuotationStatus
  enquiryId?: string
  page?: number
  limit?: number
}) => {
  return fetchPage<Quotation>('/quotations', params)
}

export const getQuotation = async (id: string): Promise<Quotation> => {
  const { data } = await api.get<{ success: true; data: Quotation }>(`/quotations/${id}`)
  return unwrap(data)
}

export const createQuotation = async (payload: QuotationPayload): Promise<Quotation> => {
  const { data } = await api.post<{ success: true; data: Quotation }>('/quotations', payload)
  return unwrap(data)
}

export const updateQuotationStatus = async (id: string, status: QuotationStatus): Promise<Quotation> => {
  const { data } = await api.patch<{ success: true; data: Quotation }>(`/quotations/${id}/status`, { status })
  return unwrap(data)
}

export const convertQuotation = async (id: string): Promise<SalesOrder> => {
  const { data } = await api.post<{ success: true; data: SalesOrder }>(`/quotations/${id}/convert`)
  return unwrap(data)
}
