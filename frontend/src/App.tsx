import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { CustomersPage } from './pages/CustomersPage'
import { CustomerFormPage } from './pages/CustomerFormPage'
import { CustomerDetailPage } from './pages/CustomerDetailPage'
import { EnquiriesPage } from './pages/EnquiriesPage'
import { EnquiryFormPage } from './pages/EnquiryFormPage'
import { EnquiryDetailPage } from './pages/EnquiryDetailPage'
import { QuotationsPage } from './pages/QuotationsPage'
import { QuotationFormPage } from './pages/QuotationFormPage'
import { QuotationDetailPage } from './pages/QuotationDetailPage'
import { SalesOrdersPage } from './pages/SalesOrdersPage'
import { SalesOrderDetailPage } from './pages/SalesOrderDetailPage'
import { InventoryPage } from './pages/InventoryPage'

export const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/new" element={<CustomerFormPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
          <Route path="/enquiries" element={<EnquiriesPage />} />
          <Route path="/enquiries/new" element={<EnquiryFormPage />} />
          <Route path="/enquiries/:id" element={<EnquiryDetailPage />} />
          <Route path="/enquiries/:id/edit" element={<EnquiryFormPage />} />
          <Route path="/quotations" element={<QuotationsPage />} />
          <Route path="/quotations/new" element={<QuotationFormPage />} />
          <Route path="/quotations/:id" element={<QuotationDetailPage />} />
          <Route path="/sales-orders" element={<SalesOrdersPage />} />
          <Route path="/sales-orders/:id" element={<SalesOrderDetailPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
