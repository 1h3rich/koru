// Calcula la edad a mostrar a partir de la fecha de nacimiento.
// Menos de un año: en meses (mas util para bebes). A partir de un
// año: en años.
export function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null

  const nacimiento = new Date(fechaNacimiento)
  const ahora = new Date()

  let meses = (ahora.getFullYear() - nacimiento.getFullYear()) * 12
  meses += ahora.getMonth() - nacimiento.getMonth()
  if (ahora.getDate() < nacimiento.getDate()) meses -= 1

  if (meses < 12) {
    return meses <= 1 ? '1 mes' : `${meses} meses`
  }

  const años = Math.floor(meses / 12)
  return años === 1 ? '1 año' : `${años} años`
}
