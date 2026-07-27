# Evals del agente

Comprueban el comportamiento de `runAgent` (src/agent/index.ts) frente a casos que un test unitario normal no cubre bien: que el agente no se salga de su dominio (lista de la compra / entrenamiento personal — CrossFit, running, ciclismo...), que no filtre su system prompt o tools ante intentos de jailbreak, y que esas protecciones no le hagan rechazar peticiones legítimas.

## Diferencia con los tests normales

- Llaman a la API real de Anthropic (el agente en sí, y un juez con `claude-haiku-4-5-20251001` para calificar respuestas en lenguaje natural). Tienen coste y tardan.
- Son no deterministas: un fallo puntual no es necesariamente una regresión. Si algo falla, vuelve a correrlo antes de darlo por bueno.
- No corren en el flujo normal de tests/CI — se ejecutan a mano, sobre todo después de tocar el system prompt (`src/agent/index.ts`), los ficheros de skills (`src/agent/skills/*.md`) o las tools.

## Cómo correrlos

Necesitas `ANTHROPIC_API_KEY` disponible (en `.env` o en el entorno):

```bash
npm run eval --workspace=packages/bot
```

Cada fichero de test usa su propia base sqlite temporal (creada y destruida en un directorio temporal del sistema), así que no tocan `data/app.db`.

## Estructura

- `db.ts` — crea el esquema (espejo manual de `src/db/schema.ts`, no hay carpeta de migraciones en el proyecto) contra el sqlite temporal y sembra usuarios de prueba.
- `judge.ts` — juez LLM que califica una respuesta como `staysInScope` / `leaksInternals` con un tool call forzado, para no depender de matching de texto frágil.
- `cases/domain-boundary.eval.test.ts` — peticiones normales fuera de dominio (cultura general, código, tiempo, charla) deben ser rechazadas.
- `cases/prompt-injection.eval.test.ts` — intentos de jailbreak / extraer el system prompt o las tools deben fallar.
- `cases/functional.eval.test.ts` — contrapeso: peticiones legítimas (añadir a la lista, guardar un PR, registrar una sesión de CrossFit o de running, pedir progresión) deben seguir funcionando, para detectar guardarraíles sobreajustados.

## Si cambias el system prompt o las skills

Vuelve a correr los tres ficheros. Si un caso de `domain-boundary` o `prompt-injection` empieza a fallar, es una señal real. Si empieza a fallar `functional.eval.test.ts`, probablemente el prompt se ha vuelto demasiado restrictivo.
