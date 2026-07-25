# WhatsApp AI Bot

Bot personal de WhatsApp conectado a agentes de IA (Claude) para uso estrictamente privado (2 usuarios: Miguel y su pareja). No es un producto comercial: sin SEO, sin usuarios externos, sin requisitos de escalado.

## Funcionalidades (MVP)

- Transcripción de audios de WhatsApp
- Lista de la compra compartida
- Registro de entrenamientos de CrossFit (ejercicios, pesos, series, repeticiones)
- Dashboard PWA para visualizar los datos

**Fase 2 (aplazada):** PRs y tiempos de CrossFit, control de gastos y ahorro, integración con My Investor / Trade Republic.

## Stack

| Capa           | Tecnología                           | Motivo                                                   |
| -------------- | ------------------------------------ | --------------------------------------------------------- |
| WhatsApp       | Baileys                              | Uso personal, sin API de Meta, sin número extra           |
| Runtime        | Node.js + TypeScript                 | Tipado estricto                                            |
| IA             | Anthropic SDK (`claude-sonnet-4-6`)  | Tool use nativo, mejor razonamiento                        |
| Base de datos  | SQLite + Drizzle ORM                 | Sin servidor, suficiente para 2 usuarios                   |
| Transcripción  | OpenAI Whisper API                   | Mejor calidad, fácil de integrar                           |
| Frontend       | React + Vite + Tailwind              | PWA simple, sin necesidad de SSR/SEO                       |
| Monorepo       | npm workspaces                       | Sin sobre-ingeniería (sin Turborepo por ahora)             |

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
   DB_PATH=./data/app.db
   ```

3. Genera la base de datos SQLite a partir del schema:

   ```bash
   npm run db:migrate
   ```

4. Arranca el bot:

   ```bash
   npm run bot
   ```

   Aparecerá un código QR en la terminal. Ve a WhatsApp → Dispositivos vinculados → Vincular un dispositivo → escanea el QR.

5. La sesión se guarda en `packages/bot/auth_session/` — no hace falta repetir el escaneo en los siguientes arranques.

## Cómo correr el proyecto

| Comando               | Descripción                                      |
| ---------------------- | ------------------------------------------------- |
| `npm run bot`          | Arranca el bot de WhatsApp en modo desarrollo      |
| `npm run web`          | Arranca el dashboard PWA en modo desarrollo        |
| `npm run db:generate`  | Genera una nueva migración a partir del schema     |
| `npm run db:migrate`   | Aplica las migraciones pendientes a la base de datos |

## Seguridad

- `auth_session/` y `.env` nunca se versionan (están en `.gitignore`)
- Todo mensaje entrante se valida contra `ALLOWED_PHONES` antes de procesarse; cualquier número no autorizado se ignora silenciosamente
- No se registra el contenido de los mensajes en producción

## Más información

Consulta [`AGENTS.MD`](./AGENTS.MD) para el modelo de datos completo, las convenciones de código, los principios del agente y el roadmap detallado.
