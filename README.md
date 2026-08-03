# Koru — Diario de guardería

App web (Next.js + Supabase) para que guarderías y familias compartan el
diario diario de cada niño/a: asistencia, horarios, fotos, calendario de
eventos, mensajes y más.

Este README es solo el punto de entrada técnico (cómo arrancarlo en local).
El contexto de producto, decisiones de diseño y roadmap viven en otros
documentos del repo — no los repite ni los sustituye:

| Documento | Qué contiene |
|---|---|
| `notas/` | Notas de producto, visión y decisiones de UX acumuladas |
| `auditoria-calidad/README.md` | Auditoría de calidad del proyecto |
| `.security/` | Configuración de seguridad del repo |
| `supabase/migrations/` | Historial completo del esquema de base de datos (orden cronológico) |

## Stack

- **Next.js 16** (App Router) + **React 19**, Tailwind CSS 4.
- **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`) para base de
  datos Postgres, autenticación y almacenamiento de fotos.
- **Resend** para envío de emails.
- `motion` (Framer Motion) para animaciones, `canvas-confetti` para
  celebraciones puntuales en la UI.

## Cómo arrancarlo en local

Requisitos: Node.js, y una CLI de Supabase si quieres levantar la base de
datos en local (`npx supabase start`) en vez de apuntar a un proyecto en
la nube.

1. `npm install`
2. Duplica la plantilla de variables de entorno del repo (el archivo cuyo
   nombre termina en "example" en la raíz del proyecto) en un archivo
   nuevo con el mismo nombre pero sin el sufijo "example" — ese será tu
   fichero de configuración local, ya excluido del control de versiones.
   Rellénalo con la URL y las claves de tu proyecto Supabase
   (`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`) y el resto
   de valores que pida la plantilla (Resend, etc.).
3. `npm run dev`

Abre [http://localhost:3000](http://localhost:3000).

Si usas Supabase local en vez de un proyecto en la nube:

```bash
npx supabase start        # levanta Postgres/Auth/Storage local (Docker)
npx supabase db reset     # aplica todas las migraciones de supabase/migrations/
```

## Estructura

- `src/app/` — rutas (App Router). Entre otras: `login`, `registro`,
  `pendiente` (cuentas a la espera de aprobación), `panel` (vista de
  administración/educadoras), `mi-diario` (vista de familia), `admin`,
  `bienvenida`.
- `src/components/` — componentes de UI compartidos.
- `src/lib/supabase/` — clientes de Supabase (browser/servidor).
- `supabase/migrations/` — todo el esquema de base de datos, en orden. Para
  entender qué tablas/políticas RLS existen, es la fuente de verdad.

## Comandos

```bash
npm run dev     # servidor de desarrollo
npm run build   # build de producción
npm run start   # servir el build de producción
npm run lint    # eslint (incluye reglas de seguridad y accesibilidad)
```

## Notas de flujo de cuentas

Las cuentas nuevas quedan en estado pendiente hasta que alguien con
permisos las aprueba (ver migración `20260802203128_aprobacion_cuentas.sql`
y la ruta `src/app/pendiente/`) — si una cuenta recién registrada no puede
entrar todavía, es ese flujo funcionando como debe, no un fallo.
