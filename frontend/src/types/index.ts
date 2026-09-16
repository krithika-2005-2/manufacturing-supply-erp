export type Role = 'ADMIN' | 'SALES_USER'

export type EnquiryStatus = 'NEW' | 'QUOTED' | 'WON' | 'LOST'
export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED'
export type SalesOrderStatus = 'PENDING' | 'CONFIRMED' | 'DISPATCHED' | 'CANCELLED'

export type User = {
  id: string
  email: string
  username: string
  role: Role
  createdAt?: string
  updatedAt?: string
}

export type LoginResponse = {
  token: string
  tokenType: string
  expiresIn: string
  user: User
}

export type ApiErrorBody = {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
    stack?: string
  }
}

export type Paginated<T> = {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    pageCount: number
  }
}

export type Customer = {
  id: string
  companyName: string
  contactPerson: string
  mobile: string
  email: string
  city: string
  createdById: string
  createdAt: string
  updatedAt: string
}

export type CustomerPayload = {
  companyName: string
  contactPerson: string
  mobile: string
  email: string
  city: string
}

export type Product = {
  id: string
  sku: string
  name: string
  category?: string
  basePrice?: string | number
  unit: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  inventory?: InventoryRecord | null
}

export type InventoryRecord = {
  id?: string
  productId: string
  physicalQuantity: string | number
  reservedQuantity: string | number
  availableQuantity?: string
  product?: Product
  updatedAt?: string
}

export type EnquiryItem = {
  id: string
  enquiryId: string
  productId: string
  quantity: string | number
  notes?: string | null
  product?: Product
}

export type Enquiry = {
  id: string
  enquiryNumber: string
  customerId: string
  customer?: Customer
  enquiryDate: string
  requiredDate: string
  notes?: string | null
  status: EnquiryStatus
  createdById: string
  createdAt: string
  updatedAt: string
  items: EnquiryItem[]
  quotations?: Quotation[]
}

export type EnquiryPayload = {
  customerId: string
  enquiryDate: string
  requiredDate: string
  notes?: string
  items: Array<{
    productId: string
    quantity: number
    notes?: string
  }>
}

export type QuotationItem = {
  id: string
  quotationId: string
  productId: string
  quantity: string | number
  unitPrice: string | number
  discountPercent: string | number
  gstPercent: string | number
  baseAmount: string | number
  discountAmount: string | number
  gstAmount: string | number
  lineTotal: string | number
  product?: Product
}

export type SalesOrderSummary = {
  id: string
  orderNumber: string
  status: SalesOrderStatus
}

export type Quotation = {
  id: string
  quotationNumber: string
  enquiryId: string
  enquiry?: Enquiry
  customerId: string
  customer?: Customer
  status: QuotationStatus
  grandTotal: string | number
  notes?: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  items: QuotationItem[]
  salesOrder?: SalesOrderSummary | null
}

export type QuotationPayload = {
  enquiryId: string
  notes?: string
  items: Array<{
    productId: string
    quantity: number
    unitPrice: number
    discountPercent?: number
    gstPercent?: number
  }>
}

export type SalesOrderItem = {
  id: string
  salesOrderId: string
  productId: string
  quantity: string | number
  unitPrice: string | number
  lineTotal: string | number
  product?: Product
}

export type DispatchItem = {
  id: string
  dispatchId: string
  productId: string
  quantity: string | number
  product?: Product
}

export type Dispatch = {
  id: string
  dispatchNumber: string
  salesOrderId: string
  dispatchDate: string
  vehicleNumber: string
  driverName: string
  createdById: string
  createdAt: string
  items: DispatchItem[]
  salesOrder?: SalesOrder
}

export type SalesOrder = {
  id: string
  orderNumber: string
  quotationId: string
  quotation?: Quotation
  customerId: string
  customer?: Customer
  status: SalesOrderStatus
  grandTotal: string | number
  createdById: string
  createdAt: string
  updatedAt: string
  items: SalesOrderItem[]
  dispatch?: Dispatch | null
}

export type DispatchPayload = {
  dispatchDate: string
  vehicleNumber: string
  driverName: string
  items: Array<{
    productId: string
    quantity: number
  }>
}