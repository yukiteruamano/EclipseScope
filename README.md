# 🌑 EclipseScope · Calculador de Eclipses Solares

> Una página web que te dice cuándo serán los **próximos 15 eclipses solares**, qué tipo
> serán, si se verán desde tu país y, si quieres profundizar, **toda la física** detrás de
> cada uno: la trayectoria de la sombra sobre el mapa, las horas exactas de contacto y
> cuánto se oscurecerá el Sol.

Escrita para que la entienda cualquiera: **no hace falta saber de astronomía ni de
informática** para usarla (ni para leer este documento 😉).

---

## 1. Un poco de astronomía antes de empezar

### ¿Qué es un eclipse solar?

Un **eclipse solar** ocurre cuando la **Luna pasa por delante del Sol** y, desde algún punto
de la Tierra, tapa el disco solar (parcial o totalmente).

Fíjate en lo sorprendente de la naturaleza: el Sol es unas **400 veces más grande** que la
Luna, pero también está unas **400 veces más lejos**. Por eso, vistos desde la Tierra, los
dos discos parecen casi del mismo tamaño y la Luna puede tapar al Sol casi por completo.

### ¿Por qué no hay un eclipse cada mes?

La Luna da la vuelta a la Tierra una vez al mes, pero su órbita está **ligeramente
inclinada** (~5°) respecto al camino del Sol (la *eclíptica*). Normalmente, cuando hay Luna
nueva, la Luna pasa "por encima" o "por debajo" del Sol. Solo cuando los tres astros quedan
casi alineados se produce el eclipse. Eso pasa un par de veces al año, más o menos.

### Tipos de eclipse solar

- **Total**: la Luna cubre por completo el Sol. El día se oscurece de golpe y se ve la
  corona solar. Ocurre solo en una franja estrecha de la Tierra.
- **Anular**: la Luna está un poco más lejos y parece más pequeña; no llega a tapar el Sol
  del todo y se forma un "anillo de fuego".
- **Híbrido**: el mismo eclipse es anular en una parte del recorrido y total en otra.
- **Parcial**: la Luna solo tapa una parte del Sol.

### ¿Qué es el ciclo de Saros?

Cada **6585,32 días** (18 años, 11 días y 8 horas), el Sol, la Tierra y la Luna vuelven casi
a la misma posición. Resultado: un eclipse **casi idéntico** al de hace 18 años se repite.
A esa cadena de eclipses repetidos se la llama **familia de Saros**, y cada familia tiene un
**número** (según el catálogo de la NASA). Por ejemplo, el eclipse total del 8 de abril de
2024 y el del 29 de marzo de 2006 pertenecen a la familia **Saros 139**.

### ¿Qué son los "elementos besselianos"?

Es la **receta matemática** para calcular un eclipse con precisión. Se imagina un plano que
pasa por el centro de la Tierra y es perpendicular a la línea que une los centros del Sol y
la Luna (el **plano fundamental**). Sobre ese plano se miden:

| Símbolo | Significado (en cristiano) |
|---------|----------------------------|
| `x`, `y` | Dónde "apunta" el eje de la sombra sobre ese plano (en radios terrestres) |
| `d` | La inclinación (declinación) del eje de la sombra |
| `u` | El "ángulo horario": qué hora de rotación terrestre corresponde |
| `l1` / `l2` | El tamaño del cono de **penumbra** (sombra suave) y de **umbra** (sombra dura) |
| `f1` / `f2` | El ángulo de apertura de esos conos |

Con estos números, un programa puede calcular **dónde y cuándo** cae la sombra en cada punto
del planeta.

### Vocabulario útil

- **Gamma (γ)**: cuán cerca pasa el eje de la sombra del centro de la Tierra (en radios
  terrestres). Si es casi 0, el eclipse es muy central y probablemente total o anular.
- **Magnitud**: fracción del diámetro del Sol que queda tapada (1,00 = totalidad justa).
- **Oscurecimiento**: fracción del **área** del Sol que queda tapada.
- **Nodo ascendente / descendente**: por cuál de los dos cruces de la órbita lunar pasa el
  Sol cuando ocurre el eclipse.
- **Línea central**: la trayectoria que pinta la sombra total/anular sobre el mapa del mundo.
- **Contactos**: las "marcas" del eclipse en un lugar concreto:
  - **P1** — empieza el eclipse parcial.
  - **C2** — empieza la totalidad o anularidad.
  - **C3** — termina la totalidad o anularidad.
  - **P4** — termina el eclipse parcial.

---

## 2. ¿Qué hace la aplicación?

La aplicación calcula los **próximos 15 eclipses solares** a partir de una fecha que tú
eliges y te los muestra de dos maneras (dos pestañas):

### Pestaña "Ciclo de Saros" (fácil)

Una tabla (o tarjetas en el móvil) con los eclipses y su número de Saros, tipo, gamma y si
son visibles desde tu país. Si pulsas en una fila, se despliega la **serie completa de esa
familia**: las fechas de la misma familia en el pasado y el futuro (cada 18 años, 11 días y
8 horas). Puedes **ordenar** por cualquier columna y **filtrar** por tipo.

### Pestaña "Elementos Besselianos" (detallado)

El cálculo físico completo de cada eclipse. Al expandir una fila ves:

- **Circunstancias locales**: las horas P1/C2/C3/P4 en la capital de tu país, la magnitud,
  el oscurecimiento y la altitud del Sol en el máximo.
- **Elementos besselianos**: los valores exactos de `x, y, d, u, l1, l2, f1, f2`.
- **Línea central**: la trayectoria de la sombra dibujada sobre un **minimapa del mundo**,
  con tu país marcado. Naranja = total, ámbar = anular.

Encima de las tablas hay además una **línea de tiempo** con los próximos eclipses: un punto
relleno = visible desde tu país; un punto con contorno = no visible.

### Cómo se usa

1. Elige una **fecha de referencia** (por defecto, hoy).
2. Elige tu **país** (puedes buscarlo escribiendo).
3. Pulsa **"Calcular eclipses"** (o espera un segundo: se recalcula solo).

La app recuerda tu fecha y tu país: la próxima vez que la abras, volverá con la misma
configuración.

---

## 3. ¿Cómo funciona por dentro? (para curiosos de la informática)

### Es 100 % en tu navegador

Toda la magia ocurre **en tu propio ordenador/móvil**. No hay servidores ni peticiones a
internet en tiempo de ejecución: la página funciona incluso estando totalmente sin conexión.
Esto se llama una aplicación **estática** y es muy barata y fiable de desplegar.

### Las piezas

- **React** (TypeScript): el framework que dibuja la interfaz. La interfaz es un conjunto de
  "componentes" que se actualizan cuando cambian los datos.
- **astronomy-engine**: una librería (¡gratuita y de código abierto!) que ya sabe calcular
  las posiciones exactas del Sol y la Luna (las *efemérides*) y buscar eclipses. Nosotros la
  usamos como "motor astronómico".
- **Nuestro código** (`src/core/`): la lógica que une todo — asigna números de Saros,
  calcula los elementos besselianos, la línea central sobre el elipsoide terrestre (modelo
  WGS84) y las circunstancias locales.
- **Tailwind CSS**: estilos (el tema oscuro espacial).
- **Vite**: la herramienta que construye el sitio final optimizado.

### Cómo se calcula un eclipse, paso a paso

1. **Buscar los próximos eclipses**: `astronomy-engine` recorre el tiempo y encuentra las
   fechas de máxima magnitud de los próximos 15 eclipses.
2. **Asignar el número de Saros**: con la fecha y la gamma, el código agrupa los eclipses en
   "temporadas" (~173 días) y, usando una referencia calibrada contra el catálogo de la
   NASA, asigna a cada uno su familia de Saros.
3. **Elementos besselianos**: para el instante de máxima magnitud se calculan `x, y, d, u,
   l1, l2, f1, f2` a partir de las posiciones geocéntricas del Sol y la Luna.
4. **Línea central**: se "lanza" el eje de la sombra contra el elipsoide de la Tierra
   (WGS84) cada ~2 minutos alrededor del máximo y se apuntan los puntos de contacto: eso
   dibuja la trayectoria en el mapa.
5. **Circunstancias locales**: para la capital de tu país se busca cuándo entra/sale de la
   penumbra y de la umbra (eso da P1/C2/C3/P4), y en el máximo se calcula magnitud,
   oscurecimiento y altitud del Sol.
6. **Sin bloquear**: el cálculo se hace en "tandas" (asíncrono), de eclipse en eclipse, para
   que la página siga respondiendo mientras se muestra la barra de progreso.

### Detalles técnicos

- El modelo de la Tierra es un **elipsoide WGS84** (no una esfera perfecta): radio ecuatorial
  6378,137 km y polar 6356,752 km. Eso permite que la línea central sea mucho más precisa.
- Los tiempos de contacto coinciden con los catálogos de la NASA con una tolerancia de
  **≈ 1 minuto**.
- Las horas se muestran en **UTC** (la hora universal) y en la **hora local** de tu país
  (usa la zona horaria IANA, ej. `Europe/Madrid`).
- La app cumple la **accesibilidad WCAG 2.2 AA**: se puede usar solo con teclado, los
  lectores de pantalla anuncian el progreso y los colores tienen buen contraste.

---

## 4. Estructura del código

```
src/
  core/                 # El "motor": lógica de cálculo pura (sin interfaz)
    constants.ts        #   Constantes (radios de la Tierra/Sol/Luna, Saros…)
    earth.ts            #   Elipsoide WGS84, conversión de coordenadas
    eclipseSearch.ts    #   Busca los próximos eclipses (astronomy-engine)
    saros.ts            #   Asigna números de Saros y familias
    besselian.ts        #   Elementos besselianos (el corazón del cálculo)
    localCircumstances.ts #  Circunstancias locales y línea central
    engine.ts           #   Orquestador: une todo y calcula sin bloquear
  data/countries.ts     # ~195 países (capital, coordenadas, zona horaria)
  components/           # Los componentes de la interfaz (React + Tailwind)
    Controls.tsx        #   Selector de fecha + país + botón de calcular
    SarosPanel.tsx      #   Pestaña "Ciclo de Saros"
    BesselianPanel.tsx  #   Pestaña "Elementos Besselianos"
    EclipseTimeline.tsx #   Línea de tiempo de los próximos eclipses
    Skeleton.tsx        #   Cargas provisionales ("skeletons")
    badges.tsx          #   Insignias, chips, filtros y cabeceras ordenables
  lib/                  # Utilidades auxiliares
    time.ts             #   Formatear fechas/horas/duraciones
    export.ts           #   Exportar a CSV / JSON
    labels.ts           #   Etiquetas de los tipos de eclipse
    keyboard.ts         #   Cierre con la tecla Escape
  main.tsx / App.tsx    # Punto de entrada y componente raíz
validate/validate.ts    # Comprueba la exactitud contra datos reales de la NASA
scripts/a11y.ts         # Auditoría automática de accesibilidad
```

---

## 5. Para desarrolladores: cómo probarlo

Necesitas **Node.js 20+** y **pnpm**.

```bash
pnpm install     # instala las dependencias
pnpm dev         # servidor de desarrollo (con recarga automática)
pnpm build       # crea la versión final en dist/
pnpm preview     # sirve la versión final para probarla
```

Comandos de calidad:

```bash
pnpm validate    # comprueba la exactitud astronómica frente a la NASA (88/88)
pnpm a11y        # auditoría de accesibilidad (WCAG 2.2) con axe-core
pnpm lint        # revisa el estilo del código
```

### Desplegar en Coolify

1. Añade este repositorio en Coolify.
2. Tipo de despliegue: **Dockerfile**.
3. Puerto: **80**.
4. (Opcional) Configura tu dominio y el HTTPS automático.

El `Dockerfile` construye la app y la sirve con **nginx** (compresión, caché de activos y
cabeceras de seguridad).

---

## 6. Limitaciones honestas

- El **punto de máxima magnitud** y la **línea central** se calculan con un muestreo
  (cada ~2 minutos); son muy precisos pero no exactos al segundo.
- Las **circunstancias locales** se calculan para la **capital** del país elegido. En un país
  grande, otras ciudades pueden ver algo distinto (aunque el tipo casi siempre coincide).
- Los tiempos de contacto tienen una tolerancia de **~1 minuto** frente a las efemérides
  oficiales de la NASA.
- Recuerda: **nunca mires al Sol directamente** durante un eclipse. Usa gafas de eclipse
  certificadas (ISO 12312-2).
