import api from './client'

const d = (p) => p.then((r) => r.data.data)
const clean = (params) => Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== '' && v !== null && v !== undefined))
const get = (url, params) => d(api.get(url, { params: clean(params) }))
const post = (url, body) => d(api.post(url, body ?? {}))
const put = (url, body) => d(api.put(url, body))
const del = (url) => d(api.delete(url))

export const authApi = {
  login: (email, password) => post('/auth/login', { email, password }),
  mfa: (mfaToken, code) => post('/auth/mfa', { mfaToken, code }),
  logout: () => api.post('/auth/logout'),
  me: () => get('/auth/me'),
  reauth: (password) => post('/auth/reauth', { password }),
  forgot: (email) => api.post('/auth/forgot-password', { email }).then((r) => r.data),
  reset: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }).then((r) => r.data),
  changePassword: (currentPassword, newPassword) => post('/auth/change-password', { currentPassword, newPassword }),
}

export const accountApi = {
  mfaSetup: () => post('/account/mfa/setup'),
  mfaEnable: (code) => post('/account/mfa/enable', { code }),
  mfaDisable: (code) => post('/account/mfa/disable', { code }),
  recoveryCodes: () => post('/account/mfa/recovery-codes'),
  sessions: () => get('/account/sessions'),
  revokeSession: (id) => del(`/account/sessions/${id}`),
  revokeOthers: () => post('/account/sessions/revoke-others'),
}

export const settingsApi = {
  branding: () => get('/settings/branding'),
  all: () => get('/settings'),
  save: (changes) => put('/settings', changes),
  jobs: () => get('/jobs'),
  runCycle: () => post('/subscriptions/run-cycle'),
}

export const usersApi = {
  list: () => get('/users'),
  directory: () => get('/users/directory'),
  create: (b) => post('/users', b),
  update: (id, b) => put(`/users/${id}`, b),
  active: (id, active) => post(`/users/${id}/active`, { active }),
  resetPassword: (id) => post(`/users/${id}/reset-password`),
  resetMfa: (id) => post(`/users/${id}/reset-mfa`),
  unlock: (id) => post(`/users/${id}/unlock`),
  sessions: (id) => get(`/users/${id}/sessions`),
  revokeSessions: (id) => post(`/users/${id}/revoke-sessions`),
  roles: () => get('/roles'),
  permissions: () => get('/permissions'),
  createRole: (b) => post('/roles', b),
  updateRole: (id, b) => put(`/roles/${id}`, b),
  deleteRole: (id) => del(`/roles/${id}`),
}

export const catalogApi = {
  products: (includeInactive = false) => get('/products', { includeInactive }),
  product: (id) => get(`/products/${id}`),
  productByCode: (code) => get(`/products/by-code/${code}`),
  createProduct: (b) => post('/products', b),
  updateProduct: (id, b) => put(`/products/${id}`, b),
  productActive: (id, active) => post(`/products/${id}/active`, { active }),
  createPlan: (b) => post('/plans', b),
  updatePlan: (id, b) => put(`/plans/${id}`, b),
  changePrice: (id, b) => post(`/plans/${id}/prices`, b),
  retirePrice: (id, period) => del(`/plans/${id}/prices/${period}`),
  priceHistory: (id) => get(`/plans/${id}/prices`),
  coupons: () => get('/coupons'),
  createCoupon: (b) => post('/coupons', b),
  couponActive: (id, active) => post(`/coupons/${id}/active`, { active }),
}

export const customersApi = {
  list: (p) => get('/customers', p),
  get: (id) => get(`/customers/${id}`),
  overview: (id) => get(`/customers/${id}/overview`),
  timeline: (id) => get(`/customers/${id}/timeline`),
  statement: (id) => get(`/customers/${id}/statement`),
  health: (id) => get(`/customers/${id}/health`),
  atRisk: (limit = 10) => get('/health/at-risk', { limit }),
  create: (b) => post('/customers', b),
  update: (id, b) => put(`/customers/${id}`, b),
  archive: (id, archived) => post(`/customers/${id}/archive`, { archived }),
  contacts: (id) => get(`/customers/${id}/contacts`),
  addContact: (id, b) => post(`/customers/${id}/contacts`, b),
  updateContact: (id, cid, b) => put(`/customers/${id}/contacts/${cid}`, b),
  deleteContact: (id, cid) => del(`/customers/${id}/contacts/${cid}`),
  notes: (id) => get(`/customers/${id}/notes`),
  addNote: (id, b) => post(`/customers/${id}/notes`, b),
  pinNote: (id, nid) => post(`/customers/${id}/notes/${nid}/pin`),
  deleteNote: (id, nid) => del(`/customers/${id}/notes/${nid}`),
  setTags: (id, tagIds) => put(`/customers/${id}/tags`, { tagIds }),
  activities: (id) => get(`/customers/${id}/activities`),
  addActivity: (id, b) => post(`/customers/${id}/activities`, b),
  tags: () => get('/tags'),
  createTag: (b) => post('/tags', b),
}

export const crmApi = {
  list: (p) => get('/prospects', p),
  board: (p) => get('/prospects/board', p),
  get: (id) => get(`/prospects/${id}`),
  create: (b) => post('/prospects', b),
  update: (id, b) => put(`/prospects/${id}`, b),
  stage: (id, b) => post(`/prospects/${id}/stage`, b),
  addActivity: (id, b) => post(`/prospects/${id}/activities`, b),
  completeActivity: (id, outcome) => post(`/activities/${id}/complete`, { outcome }),
  upcoming: (days = 14) => get('/activities/upcoming', { days }),
  convert: (id, b) => post(`/prospects/${id}/convert`, b),
}

export const subscriptionsApi = {
  list: (p) => get('/subscriptions', p),
  get: (id) => get(`/subscriptions/${id}`),
  create: (b) => post('/subscriptions', b),
  activate: (id) => post(`/subscriptions/${id}/activate`),
  convertTrial: (id) => post(`/subscriptions/${id}/convert-trial`),
  extendTrial: (id, b) => post(`/subscriptions/${id}/extend-trial`, b),
  changePlan: (id, b) => post(`/subscriptions/${id}/change-plan`, b),
  cancelPending: (id) => post(`/subscriptions/${id}/cancel-pending-change`),
  discount: (id, b) => post(`/subscriptions/${id}/discount`, b),
  terms: (id, b) => put(`/subscriptions/${id}/terms`, b),
  seller: (id, b) => put(`/subscriptions/${id}/seller`, b),
  renew: (id) => post(`/subscriptions/${id}/renew`),
  suspend: (id, reason) => post(`/subscriptions/${id}/suspend`, { reason }),
  reactivate: (id) => post(`/subscriptions/${id}/reactivate`),
  cancel: (id, b) => post(`/subscriptions/${id}/cancel`, b),
  undoCancel: (id) => post(`/subscriptions/${id}/undo-cancel`),
}

export const billingApi = {
  charges: (p) => get('/charges', p),
  charge: (id) => get(`/charges/${id}`),
  createCharge: (b) => post('/charges', b),
  voidCharge: (id, reason) => post(`/charges/${id}/void`, { reason }),
  adjust: (id, b) => post(`/charges/${id}/adjustments`, b),
  payments: (p) => get('/payments', p),
  payment: (id) => get(`/payments/${id}`),
  register: (b, key) => d(api.post('/payments', b, { headers: { 'Idempotency-Key': key } })),
  apply: (id, allocations) => post(`/payments/${id}/apply`, { allocations }),
  unapply: (allocationId, reason) => post(`/payments/allocations/${allocationId}/reverse`, { reason }),
  confirm: (id) => post(`/payments/${id}/confirm`),
  reconcile: (id) => post(`/payments/${id}/reconcile`),
  reject: (id, reason) => post(`/payments/${id}/reject`, { reason }),
  reverse: (id, reason) => post(`/payments/${id}/reverse`, { reason }),
  refund: (id, b) => post(`/payments/${id}/refunds`, b),
  aging: () => get('/receivables/aging'),
  receivables: (p) => get('/receivables', p),
  actions: (p) => get('/collection-actions', p),
  addAction: (b) => post('/collection-actions', b),
}

export const analyticsApi = {
  dashboard: (p) => get('/dashboard', p),
  product: (id, p) => get(`/dashboard/products/${id}`, p),
  saas: (p) => get('/metrics/saas', p),
  cohorts: (p) => get('/metrics/cohorts', p),
  reports: () => get('/reports'),
  report: (type, p) => get(`/reports/${type}`, p),
  calendar: (from, to) => get('/calendar', { from, to }),
  search: (q) => get('/search', { q }),
}

export const opsApi = {
  expenses: (p) => get('/expenses', p),
  createExpense: (b) => post('/expenses', b),
  updateExpense: (id, b) => put(`/expenses/${id}`, b),
  voidExpense: (id, reason) => post(`/expenses/${id}/void`, { reason }),
  categories: () => get('/expense-categories'),
  createCategory: (b) => post('/expense-categories', b),
  updateCategory: (id, b) => put(`/expense-categories/${id}`, b),
  tickets: (p) => get('/tickets', p),
  ticketMetrics: (p) => get('/tickets/metrics', p),
  ticket: (id) => get(`/tickets/${id}`),
  createTicket: (b) => post('/tickets', b),
  updateTicket: (id, b) => put(`/tickets/${id}`, b),
  ticketStatus: (id, b) => post(`/tickets/${id}/status`, b),
  assignTicket: (id, userId) => post(`/tickets/${id}/assign`, { userId }),
  comment: (id, body) => post(`/tickets/${id}/comments`, { body }),
  quotes: (p) => get('/quotes', p),
  quote: (id) => get(`/quotes/${id}`),
  createQuote: (b) => post('/quotes', b),
  updateQuote: (id, b) => put(`/quotes/${id}`, b),
  quoteStatus: (id, status) => post(`/quotes/${id}/status`, { status }),
  quoteVersion: (id) => post(`/quotes/${id}/new-version`),
  documents: (ownerType, ownerId) => get('/documents', { ownerType, ownerId }),
  upload: (form) => d(api.post('/documents', form)),
  deleteDocument: (id) => del(`/documents/${id}`),
}

export const notificationsApi = {
  list: (p) => get('/notifications', p),
  summary: () => get('/notifications/summary'),
  read: (id) => post(`/notifications/${id}/read`),
  readAll: () => post('/notifications/read-all'),
  preferences: () => get('/notification-preferences'),
  savePreferences: (prefs) => put('/notification-preferences', prefs),
  templates: () => get('/notification-templates'),
  saveTemplate: (code, b) => put(`/notification-templates/${code}`, b),
  previewTemplate: (code, b) => post(`/notification-templates/${code}/preview`, b),
  deliveries: (p) => get('/notification-deliveries', p),
  retryDelivery: (id) => post(`/notification-deliveries/${id}/retry`),
}

export const adminApi = {
  audit: (p) => get('/audit', p),
  auditModules: () => get('/audit/modules'),
  integrations: () => get('/integrations'),
  saveSmtp: (b) => put('/integrations/smtp', b),
  testSmtp: () => post('/integrations/smtp/test'),
  apiKeys: () => get('/integrations/api-keys'),
  createKey: (b) => post('/integrations/api-keys', b),
  revokeKey: (id) => del(`/integrations/api-keys/${id}`),
}

