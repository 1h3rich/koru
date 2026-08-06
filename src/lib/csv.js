// CSV generado a mano (sin librería): con comas, comillas y saltos
// de línea escapados es suficiente para el caso de uso, no hace
// falta una dependencia para esto.
export function aCsv(filas, columnas) {
  const escapar = (valor) => {
    const texto = valor == null ? '' : String(valor)
    return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
  }
  const cabecera = columnas.map((c) => escapar(c.etiqueta)).join(',')
  const lineas = filas.map((fila) => columnas.map((c) => escapar(fila[c.clave])).join(','))
  return [cabecera, ...lineas].join('\n')
}
