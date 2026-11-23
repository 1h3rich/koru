# Koru

Aplicación privada y local para registrar ingresos y gastos.

## Puesta en marcha

```bash
npm install
npm run dev
```

Koru pide una contraseña de acceso en cada nueva sesión. Conserva datos en el navegador y sincroniza un snapshot cifrado con AES-GCM. La sesión se mantiene en `sessionStorage` hasta cerrar la pestaña o pulsar «Cerrar sesión».

## Privacidad

- Los movimientos y el plan de ahorro se cifran en el dispositivo antes de sincronizarse mediante `/api/sync`.
- «Leer un ticket» utiliza exclusivamente Gemini: la fotografía se envía al proveedor solo al solicitar su lectura. Si falla, se muestra el error y no se utiliza OCR local.
- «Añadir con Gemini» lee capturas bancarias y conserva únicamente cargos con signo negativo visible. Los ingresos, abonos e importes sin signo se excluyen. «Añadir sin IA» es una opción local independiente, también limitada a negativos.
- Las capturas de una compra se almacenan una vez por fuente. Los campos antiguos con imágenes repetidas se compactan al guardar, conservando fuentes y valores.
- No hay recorte silencioso a 20/30 valores. Se prueban lectura, guardado y recuperación de 94 importes/productos. Una respuesta truncada de Gemini se rechaza y los fallos de espacio conservan el borrador.

## Ahorro a futuro

Debajo de «Dinero prestado» puedes planificar un ahorro mensual y ver qué margen queda:

`ingresos del mes − ahorro objetivo − gastos registrados − pagos pendientes`

Los ingresos registrados pueden sustituirse por una previsión manual, sin sumarla dos veces. Los pagos pendientes excluyen gastos ya registrados. El margen diario se reparte entre los días restantes del mes, incluido hoy, y se redondea hacia abajo a céntimos. Los déficits se muestran; el objetivo anual es el ahorro mensual multiplicado por doce, sin asumir rentabilidad. El plan se guarda localmente y dentro del snapshot cifrado, con su fecha de edición para resolver cambios entre dispositivos.

El enfoque se basa en reservar ahorro dentro del presupuesto personal, como recoge el [presupuestador de Finanzas para Todos](https://www.finanzasparatodos.es/herramientas/mipresupuesto). No se impone un porcentaje de ahorro.

## Comprobaciones

`npm test` verifica el filtro de signos, 94 valores, respuestas incompletas, tickets y fórmulas del presupuesto. `npm run build` y `npm run lint` comprueban tipos, compilación y estilo. Las pruebas usan respuestas controladas y datos propios; no acreditan la precisión de Gemini para cualquier fotografía.
