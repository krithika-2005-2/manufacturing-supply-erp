import type { Customer, CustomerPayload } from '../types'
import { api, unwrap } from './api'
import { fetchPage } from './authService'

export const listCustomers = (params?: { search?: string; page?: number; limit?: number }) => {
  return fetchPage<Customer>('/customers', params)
}

export const getCustomer = async (id: string): Promise<Customer> => {
  const { data } = await api.get<{ success: true; data: Customer }>(`/customers/${id}`)
  return unwrap(data)
}

export const createCustomer = async (payload: CustomerPayload): Promise<Customer> => {
  const { data } = await api.post<{ success: true; data: Customer }>('/customers', payload)
  return unwrap(data)
}

export const updateCustomer = async (id: string, payload: Partial<CustomerPayload>): Promise<Customer> => {
  const { data } = await api.patch<{ success: true; data: Customer }>(`/customers/${id}`, payload)
  return unwrap(data)
}
