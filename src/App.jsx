import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { AuthProvider } from './context/AuthContext'
import { BrandingProvider } from './context/BrandingContext'
import { CatalogProvider } from './context/CatalogContext'
import { ReauthProvider } from './context/ReauthContext'
import { QuickActionsProvider } from './context/QuickActions'
import { FullPageLoader, RequireAuth, RequirePermission } from './components/guards'

const AppLayout = lazy(() => import('./layouts/AppLayout'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const ForgotPage = lazy(() => import('./pages/auth/ForgotPage'))
const ResetPage = lazy(() => import('./pages/auth/ResetPage'))
const ChangePasswordPage = lazy(() => import('./pages/auth/ChangePasswordPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProductDashboardPage = lazy(() => import('./pages/ProductDashboardPage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const CrmPage = lazy(() => import('./pages/crm/CrmPage'))
const CustomersPage = lazy(() => import('./pages/customers/CustomersPage'))
const CustomerPage = lazy(() => import('./pages/customers/CustomerPage'))
const SubscriptionsPage = lazy(() => import('./pages/subscriptions/SubscriptionsPage'))
const SubscriptionPage = lazy(() => import('./pages/subscriptions/SubscriptionPage'))
const PaymentsPage = lazy(() => import('./pages/billing/PaymentsPage'))
const PaymentPage = lazy(() => import('./pages/billing/PaymentPage'))
const ReceivablesPage = lazy(() => import('./pages/billing/ReceivablesPage'))
const ChargesPage = lazy(() => import('./pages/billing/ChargesPage'))
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'))
const MetricsPage = lazy(() => import('./pages/MetricsPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const TicketsPage = lazy(() => import('./pages/support/TicketsPage'))
const TicketPage = lazy(() => import('./pages/support/TicketPage'))
const QuotesPage = lazy(() => import('./pages/quotes/QuotesPage'))
const QuotePage = lazy(() => import('./pages/quotes/QuotePage'))
const CatalogPage = lazy(() => import('./pages/catalog/CatalogPage'))
const UsersPage = lazy(() => import('./pages/admin/UsersPage'))
const RolesPage = lazy(() => import('./pages/admin/RolesPage'))
const AuditPage = lazy(() => import('./pages/admin/AuditPage'))
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'))
const IntegrationsPage = lazy(() => import('./pages/admin/IntegrationsPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

const guard = (any, el) => <RequirePermission any={any}>{el}</RequirePermission>

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<FullPageLoader />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/recuperar" element={<ForgotPage />} />
                <Route path="/restablecer/:token" element={<ResetPage />} />
                <Route path="/cambiar-password" element={<RequireAuth><ChangePasswordPage /></RequireAuth>} />
                <Route element={<RequireAuth><BrandingProvider><CatalogProvider><ReauthProvider><QuickActionsProvider><AppLayout /></QuickActionsProvider></ReauthProvider></CatalogProvider></BrandingProvider></RequireAuth>}>
                  <Route index element={<DashboardPage />} />
                  <Route path="productos/:code" element={guard(['dashboard.read'], <ProductDashboardPage />)} />
                  <Route path="calendario" element={guard(['calendar.read'], <CalendarPage />)} />
                  <Route path="crm" element={guard(['prospects.read'], <CrmPage />)} />
                  <Route path="clientes" element={guard(['customers.read'], <CustomersPage />)} />
                  <Route path="clientes/:id" element={guard(['customers.read'], <CustomerPage />)} />
                  <Route path="suscripciones" element={guard(['subscriptions.read'], <SubscriptionsPage />)} />
                  <Route path="suscripciones/:id" element={guard(['subscriptions.read'], <SubscriptionPage />)} />
                  <Route path="cobranza/pagos" element={guard(['payments.read'], <PaymentsPage />)} />
                  <Route path="cobranza/pagos/:id" element={guard(['payments.read'], <PaymentPage />)} />
                  <Route path="cobranza/cartera" element={guard(['collections.read'], <ReceivablesPage />)} />
                  <Route path="cobranza/cargos" element={guard(['charges.read'], <ChargesPage />)} />
                  <Route path="gastos" element={guard(['expenses.read'], <ExpensesPage />)} />
                  <Route path="metricas" element={guard(['reports.financial_read'], <MetricsPage />)} />
                  <Route path="reportes" element={guard(['reports.commercial_read', 'reports.financial_read'], <ReportsPage />)} />
                  <Route path="soporte" element={guard(['support.read'], <TicketsPage />)} />
                  <Route path="soporte/:id" element={guard(['support.read'], <TicketPage />)} />
                  <Route path="cotizaciones" element={guard(['quotes.read'], <QuotesPage />)} />
                  <Route path="cotizaciones/:id" element={guard(['quotes.read'], <QuotePage />)} />
                  <Route path="catalogo" element={guard(['products.read'], <CatalogPage />)} />
                  <Route path="usuarios" element={guard(['users.read', 'users.manage'], <UsersPage />)} />
                  <Route path="roles" element={guard(['roles.manage'], <RolesPage />)} />
                  <Route path="auditoria" element={guard(['audit.read'], <AuditPage />)} />
                  <Route path="integraciones" element={guard(['integrations.manage'], <IntegrationsPage />)} />
                  <Route path="configuracion" element={guard(['settings.read', 'settings.manage'], <SettingsPage />)} />
                  <Route path="notificaciones" element={<NotificationsPage />} />
                  <Route path="cuenta" element={<AccountPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  )
}

