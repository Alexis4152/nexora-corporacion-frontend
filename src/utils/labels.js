/** Etiquetas y colores de estados (espejo de los enums del backend). */
export const SUBSCRIPTION_STATUS = {
  PENDING_ACTIVATION: ['Pendiente de activación', 'slate'],
  TRIAL: ['Prueba gratuita', 'sky'],
  ACTIVE: ['Activa', 'green'],
  GRACE: ['En gracia', 'amber'],
  SUSPENDED: ['Suspendida', 'red'],
  CANCEL_SCHEDULED: ['Cancelación programada', 'orange'],
  CANCELLED: ['Cancelada', 'slate'],
  EXPIRED: ['Expirada', 'slate'],
}
export const COLLECTION_STATUS = {
  CURRENT: ['Al corriente', 'green'],
  PENDING: ['Pago pendiente', 'slate'],
  DUE_SOON: ['Próximo a vencer', 'sky'],
  PARTIAL: ['Parcialmente pagado', 'violet'],
  OVERDUE: ['Vencido', 'red'],
  IN_COLLECTION: ['En gestión de cobranza', 'orange'],
}
export const RELATIONSHIP = {
  ACTIVE: ['Activo', 'green'], TRIAL: ['En prueba', 'sky'], SUSPENDED: ['Suspendido', 'red'], PENDING: ['Pendiente', 'slate'],
  CANCELLED: ['Cancelado', 'slate'], NO_SUBSCRIPTION: ['Sin suscripción', 'slate'], ARCHIVED: ['Archivado', 'slate'],
}
export const PAYMENT_STATUS = {
  CAPTURED: ['Capturado', 'amber'], CONFIRMED: ['Confirmado', 'green'], RECONCILED: ['Conciliado', 'brand'],
  REJECTED: ['Rechazado', 'red'], REVERSED: ['Revertido', 'red'],
}
export const CHARGE_STATUS = { OPEN: ['Pendiente', 'amber'], PARTIAL: ['Parcial', 'violet'], PAID: ['Pagado', 'green'], VOID: ['Anulado', 'slate'] }
export const CHARGE_TYPE = { SUBSCRIPTION: 'Suscripción', PRORATION: 'Prorrateo', SETUP: 'Implementación', SERVICE: 'Servicio', OTHER: 'Otro' }
export const METHODS = { SPEI: 'SPEI', TRANSFER: 'Transferencia', CASH: 'Efectivo', CARD: 'Tarjeta', DEPOSIT: 'Depósito', GATEWAY: 'Pasarela', OTHER: 'Otro' }
export const PERIODS = { MONTHLY: 'Mensual', QUARTERLY: 'Trimestral', SEMIANNUAL: 'Semestral', ANNUAL: 'Anual' }
export const PERIOD_SHORT = { MONTHLY: '/mes', QUARTERLY: '/trim', SEMIANNUAL: '/sem', ANNUAL: '/año' }
export const STAGES = {
  NEW: ['Nuevo', 'slate'], CONTACTED: ['Contactado', 'sky'], QUALIFIED: ['Calificado', 'brand'], DEMO_SCHEDULED: ['Demo programada', 'violet'],
  DEMO_DONE: ['Demo realizada', 'violet'], QUOTE_SENT: ['Cotización enviada', 'amber'], NEGOTIATION: ['Negociación', 'orange'],
  WON: ['Ganado', 'green'], LOST: ['Perdido', 'red'], DISCARDED: ['Descartado', 'slate'],
}
export const OPEN_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'DEMO_SCHEDULED', 'DEMO_DONE', 'QUOTE_SENT', 'NEGOTIATION']
export const SOURCES = { WEBSITE: 'Sitio web', REFERRAL: 'Referido', SOCIAL: 'Redes sociales', ADS: 'Publicidad', EVENT: 'Evento', COLD_CALL: 'Llamada en frío', WHATSAPP: 'WhatsApp', PARTNER: 'Socio', OTHER: 'Otro' }
export const LOST_REASONS = { PRICE: 'Precio', COMPETITOR: 'Eligió a la competencia', NO_BUDGET: 'Sin presupuesto', NO_RESPONSE: 'Dejó de responder', NOT_A_FIT: 'No es el perfil', TIMING: 'No es el momento', FEATURES: 'Faltan funciones', OTHER: 'Otro' }
export const CANCEL_REASONS = { PRICE: 'Precio', MISSING_FEATURES: 'Faltan funciones', COMPETITOR: 'Se fue con la competencia', CLOSED_BUSINESS: 'Cerró el negocio', NOT_USING: 'No lo usa', SERVICE_ISSUES: 'Problemas con el servicio', NON_PAYMENT: 'Falta de pago', OTHER: 'Otro' }
export const ACTIVITY_TYPES = { CALL: 'Llamada', MESSAGE: 'Mensaje', EMAIL: 'Correo', MEETING: 'Reunión', DEMO: 'Demostración', NOTE: 'Nota', COMMITMENT: 'Compromiso', STAGE_CHANGE: 'Cambio de etapa', CONVERSION: 'Conversión' }
export const TICKET_STATUS = { OPEN: ['Abierto', 'sky'], IN_REVIEW: ['En revisión', 'violet'], IN_PROGRESS: ['En proceso', 'amber'], WAITING_CUSTOMER: ['Espera del cliente', 'orange'], RESOLVED: ['Resuelto', 'green'], CLOSED: ['Cerrado', 'slate'] }
export const TICKET_PRIORITY = { LOW: ['Baja', 'slate'], MEDIUM: ['Media', 'sky'], HIGH: ['Alta', 'orange'], URGENT: ['Urgente', 'red'] }
export const TICKET_CATEGORY = { INCIDENT: 'Incidencia', QUESTION: 'Duda', REQUEST: 'Solicitud', BILLING: 'Facturación', TRAINING: 'Capacitación', BUG: 'Error del sistema' }
export const QUOTE_STATUS = { DRAFT: ['Borrador', 'slate'], SENT: ['Enviada', 'sky'], ACCEPTED: ['Aceptada', 'green'], REJECTED: ['Rechazada', 'red'], EXPIRED: ['Vencida', 'orange'], SUPERSEDED: ['Reemplazada', 'slate'] }
export const COLLECTION_ACTION = { CALL: 'Llamada', EMAIL: 'Correo', WHATSAPP: 'WhatsApp', VISIT: 'Visita', PROMISE: 'Promesa de pago', NOTE: 'Nota' }
export const NOTIFICATION_CATEGORY = { COLLECTION: 'Cobranza', PROSPECTS: 'Prospectos', SUBSCRIPTIONS: 'Suscripciones', PAYMENTS: 'Pagos', TRIALS: 'Pruebas gratuitas', CANCELLATIONS: 'Cancelaciones', SUPPORT: 'Soporte', SECURITY: 'Seguridad', ADMIN: 'Administración' }
export const DOC_CATEGORY = { CONTRACT: 'Contrato', RECEIPT: 'Comprobante', QUOTE: 'Cotización', EVIDENCE: 'Evidencia', INVOICE: 'Factura / CFDI', COMMERCIAL: 'Comercial', OTHER: 'Otro' }
export const ROLE_NAMES = { SUPER_ADMIN: 'Super administrador', ADMINISTRADOR: 'Administrador', FINANZAS: 'Finanzas', VENTAS: 'Ventas', SOPORTE: 'Soporte', AUDITOR: 'Auditor' }
export const MOVEMENTS = { NEW: ['New', 'green'], EXPANSION: ['Expansion', 'brand'], CONTRACTION: ['Contraction', 'amber'], CHURN: ['Churn', 'red'], REACTIVATION: ['Reactivation', 'sky'], NONE: ['—', 'slate'] }
export const EVENT_TYPES = {
  CREATED: 'Alta', ACTIVATED: 'Activación', TRIAL_CONVERTED: 'Prueba convertida', TRIAL_EXPIRED: 'Prueba expirada', TRIAL_EXTENDED: 'Prueba extendida', RENEWED: 'Renovación',
  PLAN_CHANGED: 'Cambio de plan', PLAN_CHANGE_SCHEDULED: 'Cambio programado', PLAN_CHANGE_CANCELLED: 'Cambio programado cancelado',
  DISCOUNT_CHANGED: 'Descuento', SUSPENDED: 'Suspensión', AUTO_SUSPENDED: 'Suspensión automática', REACTIVATED: 'Reactivación',
  CANCEL_SCHEDULED: 'Cancelación programada', CANCEL_REVERTED: 'Cancelación revertida', CANCELLED: 'Cancelación', EXPIRED: 'Expiración',
  GRACE_STARTED: 'Inicio de gracia', GRACE_RECOVERED: 'Regularizada', RENEWAL_CONFIRMED: 'Renovación confirmada',
}
export const label = (map, key) => (Array.isArray(map[key]) ? map[key][0] : map[key]) || key || '—'

