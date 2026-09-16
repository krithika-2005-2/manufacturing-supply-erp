import type { Product } from '../types'
import { api, unwrap } from './api'
import { fetchPage } from './authService'

export const listProducts = (params?: { search?: string; page?: number; limit?: number }) => {
  return fetchPage<Product>('/products', params)
}

export const getProduct = async (id: string): Promise<Product> => {
  const { data } = await api.get<{ success: true; data: Product }>(`/products/${id}`)
  return unwrap(data)
}

export const createProduct = async (payload: {
  sku: string
  name: string
  category: string
  basePrice: number
  unit?: string
  physicalQuantity?: number
}): Promise<Product> => {
  const { data } = await api.post<{ success: true; data: Product }>('/products', payload)
  return unwrap(data)
}