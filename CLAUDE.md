# Nexora Corporación · Frontend

React 18 + Vite 5 + Tailwind 3. API en `../nexora-corporacion-backend` (puerto 8091; Vite reenvía `/api`).

## Comandos

- `npm run dev` — :5181
- `npm test` — vitest
- `npm run build` — debe pasar sin errores antes de entregar

## Reglas

- Textos en español de México; formatos con `utils/format.js` (es-MX, MXN).
- Componentes base en `components/ui.jsx`; tablas con `DataTable` (se vuelven tarjetas en móvil).
- Colores de marca vía variables CSS (`brand-*`, `accent-*`), nunca hex sueltos para la marca.
- Productos, planes y colores salen del catálogo de la API: no se codifican.
- No se guarda el access token en almacenamiento del navegador.
- No se modifican los proyectos HOTEL originales.
