# WhatsApp AI Bot

Bot personal de WhatsApp conectado a agentes de IA (Claude) para uso estrictamente privado (2 usuarios). No es un producto comercial: sin SEO, sin usuarios externos, sin requisitos de escalado.

Cada usuario vincula el bot como dispositivo adicional en su **propio** WhatsApp (su propio número, su propio self-chat) — no existe un único número de bot compartido. Ambas sesiones corren en el mismo proceso y comparten base de datos, así que la lista de la compra sigue siendo común mientras que los datos de CrossFit quedan aislados por usuario.

## Funcionalidades (MVP)

- Transcripción de audios de WhatsApp
- Lista de la compra compartida
- Registro de entrenamientos de CrossFit (ejercicios, pesos, series, repeticiones)
- Dashboard PWA para visualizar los datos

**Fase 2 (aplazada):** PRs y tiempos de CrossFit, control de gastos y ahorro, integración con My Investor / Trade Republic.

## Stack

| Capa          | Tecnología                          | Motivo                                          |
| ------------- | ----------------------------------- | ----------------------------------------------- |
| WhatsApp      | Baileys                             | Uso personal, sin API de Meta, sin número extra |
| Runtime       | Node.js + TypeScript                | Tipado estricto                                 |
| IA            | Anthropic SDK (`claude-sonnet-4-6`) | Tool use nativo, mejor razonamiento             |
| Base de datos | SQLite + Drizzle ORM                | Sin servidor, suficiente para 2 usuarios        |
| Transcripción | OpenAI Whisper API                  | Mejor calidad, fácil de integrar                |
| Frontend      | React + Vite + Tailwind             | PWA simple, sin necesidad de SSR/SEO            |
| Monorepo      | npm workspaces                      | Sin sobre-ingeniería (sin Turborepo por ahora)  |

Toda la lógica y las decisiones de arquitectura están documentadas en [`AGENTS.MD`](./AGENTS.MD).

## Estructura del proyecto

```
whatsapp-agent/
├── packages/
│   ├── bot/     # Bot de WhatsApp + agente Claude + base de datos
│   └── web/     # Dashboard PWA
```

## Primer arranque

1. Instala las dependencias desde la raíz:

   ```bash
   npm install
   ```

2. Copia el fichero de variables de entorno y rellena las claves:

   ```bash
   cp .env.example .env
   ```

   ```env
   ANTHROPIC_API_KEY=
   OPENAI_API_KEY=               # para Whisper
   ALLOWED_PHONES=34612345678,34698765432   # whitelist de números autorizados
   WHATSAPP_SESSIONS=user1,user2          # una sesión (dispositivo vinculado) por usuario
   DB_PATH=./data/app.db
   ```

3. Crea la carpeta donde vivirá la base de datos SQLite (no se versiona):

   ```bash
   mkdir packages/bot/data
   ```

4. Genera las migraciones a partir del schema y aplícalas:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

   `db:generate` crea los ficheros SQL en `packages/bot/src/db/migrations/` (si no existen todavía) y `db:migrate` los aplica sobre `DB_PATH`.

5. Arranca el bot:

   ```bash
   npm run bot
   ```

   Aparecerá un código QR en la terminal **por cada nombre en `WHATSAPP_SESSIONS`**, etiquetado como `[whatsapp:<nombre>]`. Cada persona escanea el suyo desde su propio móvil: WhatsApp → Dispositivos vinculados → Vincular un dispositivo.

6. Cada sesión se guarda en `packages/bot/auth_sessions/<nombre>/` — no hace falta repetir el escaneo para ese usuario en los siguientes arranques.

## Cómo correr el proyecto

| Comando               | Descripción                                          |
| --------------------- | ---------------------------------------------------- |
| `npm run bot`         | Arranca el bot de WhatsApp en modo desarrollo        |
| `npm run web`         | Arranca el dashboard PWA en modo desarrollo          |
| `npm run db:generate` | Genera una nueva migración a partir del schema       |
| `npm run db:migrate`  | Aplica las migraciones pendientes a la base de datos |

## Seguridad

- `auth_sessions/` y `.env` nunca se versionan (están en `.gitignore`)
- Cada usuario tiene su propia sesión de WhatsApp vinculada a su propio número; nunca se enrutan mensajes de un usuario a través de la sesión de otro
- Todo mensaje entrante se valida contra `ALLOWED_PHONES` antes de procesarse; cualquier número no autorizado se ignora silenciosamente
- No se registra el contenido de los mensajes en producción

## Más información

Consulta [`AGENTS.MD`](./AGENTS.MD) para el modelo de datos completo, las convenciones de código, los principios del agente y el roadmap detallado.
