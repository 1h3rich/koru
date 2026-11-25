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

## Meses, gastos fijos y ahorro a futuro

El «Disponible del ciclo» suma los ingresos recibidos y resta los gastos registrados en el periodo activo. El corte configurable abre el mes siguiente el día 25 o el cuarto día hábil desde el final del mes. El corte hábil descuenta los fines de semana y los festivos que añadas. Los periodos anteriores se consultan en «Movimientos → Historial por periodo».

En «Meses» puedes añadir cobros pendientes recurrentes, nóminas de un solo mes o ingresos extra. Al confirmar un cobro puedes crear un movimiento con la fecha y el importe reales o vincular uno anotado anteriormente. El resumen de Meses cuenta las nóminas y los recurrentes cobrados y resta los gastos registrados. Los ingresos extra cobrados cuentan para el disponible del ciclo.

En «Gastos fijos» puedes marcar cada cobro como pagado y consultar su historial. Un gasto del día 4 vuelve a estar pendiente el día 4 de su siguiente ciclo. Los avisos aparecen dentro de Koru durante los siete días previos. Los gastos sin fecha usan el mes natural y van sin aviso.

«Ahorro a futuro» usa el total de ingresos recurrentes del mes seleccionado y resta la suma de gastos fijos activos. Para un objetivo total, divide el objetivo entre ese margen y redondea hacia arriba a meses completos. La estimación parte de cero y supone que ahorras el margen íntegro cada mes. Los ingresos planificados, las marcas de pago y el objetivo se guardan en la copia cifrada que sincroniza Koru.

## Comprobaciones

`npm test` verifica el filtro de signos, 94 valores, respuestas incompletas, tickets y fórmulas del presupuesto. `npm run build` y `npm run lint` comprueban tipos, compilación y estilo. Las pruebas usan respuestas controladas y datos propios; no acreditan la precisión de Gemini para cualquier fotografía.
