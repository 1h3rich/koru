// Genera eventos de cumpleaños "virtuales" a partir de
// ninos.fecha_nacimiento, en vez de tener que crearlos a mano cada
// año en "eventos" — se recalculan en cada visita al calendario, así
// que nunca hay que mantenerlos. Un niño en un aula hace que su
// cumpleaños aparezca en el calendario de esa aula para todos, no
// solo para su propia familia (marcados con automatico:true para
// que la cuidadora no pueda "borrarlos" desde el calendario).
export function eventosCumpleanos(ninos, { desde, hasta }) {
  const eventos = []
  for (const nino of ninos) {
    if (!nino.fecha_nacimiento) continue
    const nacimiento = new Date(nino.fecha_nacimiento)
    for (let anio = desde; anio <= hasta; anio++) {
      const fecha = new Date(anio, nacimiento.getMonth(), nacimiento.getDate())
      eventos.push({
        id: `cumple-${nino.id}-${anio}`,
        aula: nino.aula ?? null,
        fecha: fecha.toISOString().slice(0, 10),
        tipo: 'cumpleanos',
        titulo: `🎂 Cumpleaños de ${nino.nombre}`,
        nota: null,
        automatico: true,
      })
    }
  }
  return eventos
}
