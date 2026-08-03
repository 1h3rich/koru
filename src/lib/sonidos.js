// Efectos de sonido sintetizados con Web Audio API: sin ficheros de
// audio externos, sin licencias que gestionar. Solo efectos
// puntuales (nunca música de fondo continua, ver feedback del
// usuario sobre usarse mientras se cuida a niños reales).
export function reproducirDing() {
  if (typeof window === 'undefined') return
  const AudioContextRef = window.AudioContext || window.webkitAudioContext
  if (!AudioContextRef) return

  const ctx = new AudioContextRef()
  const notas = [523.25, 659.25, 783.99] // Do, Mi, Sol — acorde alegre

  notas.forEach((frecuencia, i) => {
    const inicio = ctx.currentTime + i * 0.08
    const oscilador = ctx.createOscillator()
    const ganancia = ctx.createGain()

    oscilador.type = 'sine'
    oscilador.frequency.value = frecuencia
    ganancia.gain.setValueAtTime(0, inicio)
    ganancia.gain.linearRampToValueAtTime(0.2, inicio + 0.02)
    ganancia.gain.exponentialRampToValueAtTime(0.001, inicio + 0.5)

    oscilador.connect(ganancia)
    ganancia.connect(ctx.destination)
    oscilador.start(inicio)
    oscilador.stop(inicio + 0.5)
  })

  setTimeout(() => ctx.close(), 800)
}
