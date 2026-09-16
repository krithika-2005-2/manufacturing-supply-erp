import type { Enquiry, EnquiryPayload, EnquiryStatus } from '../types'
import { api, unwrap } from './api'
import { fetchPage } from './authService'

export const listEnquiries = (params?: {
  status?: EnquiryStatus
  customerId?: string
  page?: number
  limit?: number
}) => {
  return fetchPage<Enquiry>('/enquiries', params)
}

export const getEnquiry = async (id: string): Promise<Enquiry> => {
  const { data } = await api.get<{ success: true; data: Enquiry }>(`/enquiries/${id}`)
  return unwrap(data)
}

export const createEnquiry = async (payload: EnquiryPayload): Promise<Enquiry> => {
  const { data } = await api.post<{ success: true; data: Enquiry }>('/enquiries', payload)
  return unwrap(data)
}

export const updateEnquiry = async (id: string, payload: Partial<EnquiryPayload> & { status?: Enquiry['status'] }) => {
  const { data } = await api.patch<{ success: true; data: Enquiry }>(`/enquiries/${id}`, payload)
  return unwrap(data)
}
