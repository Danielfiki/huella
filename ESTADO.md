# ESTADO.md — Proyecto Huella

## Stack técnico
- Frontend: React + Vite
- IA: API de Anthropic, modelo claude-sonnet-4-5
- Auth y DB: Supabase
- Deploy: Vercel (huella-theta.vercel.app)
- Repo: github.com/Danielfiki/huella
- Ruta local: C:\Users\dundu\OneDrive\Desktop\florecia

## Credenciales
> ⚠️ No escribir valores reales aquí — usar `.env` local y el dashboard de cada servicio.
- Anthropic API key: ver `.env` → `ANTHROPIC_API_KEY`
- Supabase URL: ver `.env` → `VITE_SUPABASE_URL`
- Supabase Anon Key: ver `.env` → `VITE_SUPABASE_ANON_KEY`
- GitHub token: ver settings de GitHub personal
- GitHub usuario: Danielfiki

## Comando para abrir Claude Code
```
$env:PATH += ";C:\Users\dundu\.local\bin"; cd C:\Users\dundu\OneDrive\Desktop\florecia; claude --dangerously-skip-permissions
```

---

## BASE TEÓRICA COMPLETA (debe estar íntegra en el system prompt)

El system prompt actual solo tiene 6 autores. Esto es INSUFICIENTE. La base real del producto es:

### Neurociencia del desarrollo
- **Daniel Siegel** — ventana de tolerancia, cerebro arriba/abajo, mano como modelo del cerebro, integración neural, neurobiología interpersonal
- **Bruce Perry** — secuencia neurosequencial del desarrollo, regulación antes de relación antes de razón, impacto del trauma en el cerebro en desarrollo
- **Bessel van der Kolk** — el cuerpo lleva el marcador, trauma complejo, regulación somática
- **Allan Schore** — regulación afectiva, hemisferio derecho, apego y neurobiología
- **Stephen Porges** — teoría polivagal, estado del sistema nervioso autónomo, seguridad como base de aprendizaje y conexión

### Teoría del apego
- **John Bowlby** — teoría del apego, base segura, modelos operativos internos
- **Mary Ainsworth** — patrones de apego (seguro, ansioso, evitativo, desorganizado), situación extraña
- **Dan Hughes** — PACE (Playfulness, Acceptance, Curiosity, Empathy), apego y trauma
- **Gordon Neufeld** — madurez, apego como base del desarrollo, por qué los niños necesitan a los adultos
- **Sue Johnson** — terapia focalizada en emociones, ciclos de apego

### Regulación emocional y conductual
- **Ross Greene** — modelo de habilidades no adquiridas, Plan B colaborativo, las explosiones ocurren cuando las demandas superan las habilidades
- **Stuart Shanker** — autorregulación, 5 dominios de estrés (biológico, emocional, cognitivo, social, prosocial), reencuadre conductual
- **Mona Delahooke** — perfil neurológico individual, conducta como comunicación, más allá de los puntos de recompensa
- **Stanley Greenspan** — DIR/Floortime, desarrollo emocional funcional, niveles de procesamiento

### Crianza respetuosa y disciplina positiva
- **Janet Lansbury** — crianza respetuosa desde el nacimiento, límites con empatía, el niño como persona completa
- **Alfie Kohn** — sin castigos ni recompensas, educación incondicional, motivación intrínseca
- **Laura Markham** — crianza pacífica, conexión antes de corrección, coaching emocional
- **Adele Faber** — comunicación con los hijos, cómo hablar para que los niños escuchen
- **Lawrence Cohen** — juego terapéutico, parenthood, reconexión a través del juego

### Desarrollo cognitivo y del aprendizaje
- **Lev Vygotsky** — zona de desarrollo próximo, aprendizaje social, andamiaje
- **Jean Piaget** — etapas del desarrollo cognitivo, pensamiento preoperacional, egocentrismo
- **Urie Bronfenbrenner** — modelo ecológico del desarrollo, sistemas que rodean al niño
- **Howard Gardner** — inteligencias múltiples, diversidad del aprendizaje
- **Alison Gopnik** — el niño como científico, aprendizaje por exploración, teoría de la mente

### Trauma, resiliencia y regulación somática
- **Peter Levine** — trauma como energía atrapada, Somatic Experiencing, ciclo de activación-descarga
- **Gabor Maté** — trauma no es lo que te pasa sino lo que pasa dentro, conexión mente-cuerpo, raíces del TDAH y otras condiciones
- **Tina Payne Bryson** — cerebro del niño en 12 estrategias (coescrita con Siegel), el cerebro del sí, conexión antes de dirección

---

## Módulos implementados ✅

### 1. Registro de episodios
Formulario completo con:
- Tipo de episodio: rabieta, llanto, agresividad, miedo, dificultad para dormir, rechazo social, desconexión, otro
- Intensidad del 1 al 5 con slider
- Campo de contexto libre
- Selección de gatillantes: hambre, cansancio, cambio de rutina, conflicto con pares, pantallas, transiciones, enfermedad, estrés familiar
- Campo de estado emocional del padre
- Botón "Guardar y obtener orientación"

### 2. Orientación de IA
- Responde inmediatamente tras guardar el episodio *(bug crítico corregido 2026-04-18)*
- Estructura: Qué está pasando / Qué hacer ahora / Qué evitar / (cuando corresponde) Si esto sigue
- System prompt con 6 autores base (INSUFICIENTE — ampliar es tarea prioritaria #0)
- Al final muestra en itálica: "Marco aplicado: [Autor] — [concepto]"
- Disclaimer: "Esta orientación se basa en evidencia del desarrollo infantil y no constituye un diagnóstico clínico."
- Modelo: claude-sonnet-4-5
- Archivo: src/services/anthropic.js
- En dev local, `vite.config.js` sirve `/api/anthropic` vía middleware (requiere `ANTHROPIC_API_KEY` en `.env`)

### 3. Panel de inicio
- Saludo "Hola / Esto es lo que está pasando con tu hijo"
- Botón destacado "Registrar episodio"
- Card "Últimos 7 días": episodios, intensidad promedio, tipo más frecuente
- Card "Análisis de patrones": aparece cuando hay 3+ episodios
- Card "Empieza registrando"

### 4. Estrategias proactivas
- El padre elige habilidad: autorregulación emocional, resiliencia ante la frustración, tolerancia a los cambios, habilidades sociales, manejo del miedo, concentración y calma
- Campo de contexto adicional opcional
- La IA genera un plan (funcionalidad parcial — ver módulos parciales)

### 5. Hitos positivos
- Categorías: se calmó solo, mostró empatía, pidió disculpas, toleró un "no", avance social, otro avance
- Campo de descripción libre
- Botón "Guardar hito"

### 6. Navegación
- Barra inferior fija: Inicio, Registrar, Estrategias, Hitos, Historial
- Diseño tipo app móvil, centrado, ancho limitado, colores pastel cálidos

### 7. Sistema de autenticación
- Login con email y contraseña
- Registro con email y contraseña
- Confirmación de email via Supabase (el usuario debe confirmar antes de ingresar)
- Rutas protegidas — redirige a /login si no hay sesión
- Cerrar sesión desde PerfilPage

### 8. Base de datos Supabase
Tablas creadas con Row Level Security activo:
- `hijos`: id, user_id, nombre, edad, created_at
- `episodios`: id, user_id, tipo, intensidad, contexto, gatillantes[], estado_padre, fecha
- `hitos`: id, user_id, categoria, descripcion, fecha
- `estrategias`: id, user_id, habilidad, descripcion, plan, fecha_inicio, semana_actual

### 9. Vista detalle de estrategias *(completado 2026-04-18)*
- Plan parseado semana a semana con estrategia e indicador por semana
- Semana activa resaltada, semanas completadas con checkmark, próximas bloqueadas
- Botón "Avanzar a semana N" persiste en Supabase
- Banner de plan completado al terminar semana 4
- Lista con barra de progreso y badge de estado

---

## Módulos parciales ⚠️

### ~~Guardado en Supabase~~ ✅ Verificado y corregido 2026-04-18
- Sin uso de localStorage para datos de la app (verificado)
- Los datos SÍ van a Supabase via HuellaContext
- Corregido: fallo silencioso en inserts — ahora hacen rollback en el reducer y lanzan error que las páginas capturan y muestran al usuario
- Corregido: loadUserData tenía try-catch faltante — ya no deja el spinner colgado si Supabase falla

### Panel visual con gráficos
La página existe y muestra números pero NO tiene gráficos reales. Falta implementar visualizaciones con frecuencia por semana, intensidad en el tiempo, gatillantes más frecuentes. Nota: recharts fue eliminado como dependencia el 2026-04-18 — reinstalar o usar implementación custom.

### ~~Historial~~ ✅ Completado 2026-04-18
- Episodios agrupados por día (Hoy / Ayer / fecha)
- Cada card: tipo con emoji, hora, badge de intensidad, contexto, gatillantes
- Botón expandible "Ver orientación de Huella" (si existe)
- La orientación de IA ahora se guarda en Supabase (columna `orientacion_ia`)
- **Requiere migración SQL**: `alter table public.episodios add column if not exists orientacion_ia text;`

### Estrategias con seguimiento
El formulario existe y la vista detalle semana a semana está implementada. Falta: seguimiento semanal con indicadores observables, evaluación de avance a fecha definida.

### Perfil del hijo
PerfilPage muestra email y botón de cerrar sesión. Falta: nombre del hijo, edad, fecha de nacimiento, configuración guardada en tabla `hijos` de Supabase.

---

## Módulos sin empezar ❌

### Modo pareja
Dos cuentas vinculadas al mismo hijo. Ambos padres registran, ambos ven el historial, la IA sintetiza perspectivas. Requiere tabla de vínculos entre usuarios.

### Historial clínico exportable (PDF)
PDF con historial completo: episodios, patrones, gatillantes, estrategias aplicadas, evolución. Para llevar al pediatra, psicólogo o colegio. Costo: $5 USD por generación (modelo de negocio).

### Notificaciones inteligentes
Detectar patrones nuevos, recordar registrar si llevan tiempo sin hacerlo, avisar fechas de evaluación de estrategias.

### Voz a texto
Botón de micrófono que transcribe y estructura el registro automáticamente. Reduce la fricción a cero en el momento del episodio.

### Análisis de patrones real
Actualmente es un placeholder. Debe leer datos reales de Supabase, detectar patrones (horarios de concentración de episodios, gatillantes recurrentes, evolución de intensidad) y la IA debe interpretarlos periódicamente.

### Directorio de especialistas
Suscripción mensual para profesionales (psicólogos, pediatras). Fase 2 del modelo de negocio.

---

## Orden de trabajo recomendado para próxima sesión

**Prioridad 0 — System prompt completo**
Reescribir src/services/anthropic.js con los 35+ referentes completos. El producto actual tiene solo 6 autores, lo cual es insuficiente para la propuesta de valor.

**~~Prioridad 1 — Verificar guardado en Supabase~~** ✅ Listo 2026-04-18

**~~Prioridad 2 — Historial funcional~~** ✅ Listo 2026-04-18

**Prioridad 3 — Perfil del hijo**
Formulario para ingresar nombre y edad del hijo, guardado en tabla `hijos`.

**Prioridad 4 — Panel visual con gráficos reales**
Implementar visualizaciones: frecuencia semanal, intensidad en el tiempo, gatillantes más frecuentes.

**Prioridad 5 — PDF exportable**
Historial clínico completo en PDF descargable.

**Prioridad 6 — Modo pareja**

**Prioridad 7 — Voz a texto**

---

## Diseño y UX
- Colores pastel cálidos, fondo salmón/crema
- Tipografía limpia, lenguaje humano sin jerga clínica
- Diseño tipo app móvil centrado en pantalla
- Nunca diagnostica, siempre orienta
- Cada respuesta termina con disclaimer clínico

---

*Este archivo se actualiza al final de cada sesión de trabajo.*
