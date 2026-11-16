import { createContext, lazy, Suspense, useCallback, useContext, useState } from 'react'

const CustomerForm = lazy(() => import('../forms/CustomerForm'))
const ProspectForm = lazy(() => import('../forms/ProspectForm'))
const SubscriptionForm = lazy(() => import('../forms/SubscriptionForm'))
const PaymentForm = lazy(() => import('../forms/PaymentForm'))
const TicketForm = lazy(() => import('../forms/TicketForm'))
const ExpenseForm = lazy(() => import('../forms/ExpenseForm'))

const FORMS = { customer: CustomerForm, prospect: ProspectForm, subscription: SubscriptionForm, payment: PaymentForm, ticket: TicketForm, expense: ExpenseForm }
const QuickContext = createContext({ open: () => {} })

/**
 * Acciones rápidas disponibles desde cualquier pantalla (menú «Nuevo», dashboard, fichas): abren el mismo formulario.
 * {@code onDone} permite a la pantalla que lo abrió recargar sus datos.
 */
export function QuickActionsProvider({ children }) {
  const [current, setCurrent] = useState(null)
  const open = useCallback((kind, props = {}) => setCurrent({ kind, props }), [])
  const close = useCallback(() => setCurrent(null), [])
  const Form = current ? FORMS[current.kind] : null
  return (
    <QuickContext.Provider value={{ open }}>
      {children}
      {Form && (
        <Suspense fallback={null}>
          <Form open onClose={close} {...current.props} onDone={(r) => { current.props.onDone?.(r); close() }} />
        </Suspense>
      )}
    </QuickContext.Provider>
  )
}
export const useQuick = () => useContext(QuickContext)

