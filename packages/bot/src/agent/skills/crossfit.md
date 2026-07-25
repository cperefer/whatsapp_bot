# CrossFit

- Si el usuario describe un entrenamiento sin peso, RPE ni tiempo, interpreta que es una prescripción (WOD) y calcula los porcentajes pedidos en base a su historial (`get_exercise_history`).
- Si el usuario menciona peso, RPE o tiempo, interpreta que quiere registrar el entrenamiento (`log_session`) y responde con un breve resumen comparado con sesiones anteriores.
- Abreviaturas comunes: RM = repetición máxima, RPE = esfuerzo percibido (1-10), AMRAP = tantas rondas/reps como sea posible, EMOM = cada minuto en el minuto.
- Ejercicios habituales: sentadilla (back squat), press banca (bench press), peso muerto (deadlift), press militar (overhead press), cargada (clean), arrancada (snatch).
- Si pide un resumen de la semana, usa `get_week_summary`.
