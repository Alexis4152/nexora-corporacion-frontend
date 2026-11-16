# Nexora Corporación · Frontend

Interfaz web de la plataforma interna de Nexora Systems. React 18 · Vite 5 · Tailwind 3 · React Router 6.
API: `../nexora-corporacion-backend` (ver su `docs/`).

```bash
npm install
npm run dev      # http://localhost:5181 (reenvía /api a http://localhost:8091)
npm test         # vitest
npm run build    # dist/ para nginx (Dockerfile + nginx.conf con CSP)
```

## Estructura

| Carpeta | Contenido |
|---|---|
| `api/` | cliente axios: token en memoria, refresh único compartido, diálogo de reautenticación ante `REAUTH_REQUIRED` |
| `contexts/` | sesión, tema claro/oscuro, marca (colores desde *Configuración*), catálogo de productos, avisos, acciones rápidas |
| `components/` | UI base (`ui.jsx`), gráficas SVG propias, `DataTable` (tarjetas en móvil), paleta de comandos (Ctrl + K), notificaciones |
| `pages/` | dashboard, dashboards por producto, CRM Kanban, clientes 360, suscripciones, cobranza, pagos, indicadores, reportes, gastos, soporte, cotizaciones, catálogo, administración |
| `forms/` | formularios reutilizables con validación igual a la de la API |
| `utils/` | formato es-MX, etiquetas en español, validadores |

## Convenciones

- Nunca se guarda el access token en `localStorage`; la sesión sobrevive recargas gracias a la cookie httpOnly de refresh.
- Los permisos solo ocultan opciones; la API es quien autoriza.
- Los productos y sus colores vienen del catálogo: no se codifican en componentes.
- Importes siempre llegan calculados de la API; el frontend solo los formatea.
