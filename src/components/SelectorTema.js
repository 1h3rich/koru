import { cookies } from 'next/headers'
import { guardarTema } from '@/app/acciones'
import { Button, Field, Select } from '@/components/ui'

// Selector de tema claro/oscuro/automático, compartido por /panel/mas
// y /mi-diario/mas — cookie en vez de columna de cuenta porque
// también lo usan los padres, que no tienen fila en "cuentas".
export async function SelectorTema({ destino }) {
  const cookieStore = await cookies()
  const tema = cookieStore.get('tema')?.value ?? 'auto'

  return (
    <form action={guardarTema} className="mt-3 flex gap-2">
      <input type="hidden" name="destino" value={destino} />
      <Field label="Tema">
        <Select name="tema" defaultValue={tema}>
          <option value="auto">Automático (según el móvil)</option>
          <option value="claro">Claro</option>
          <option value="oscuro">Oscuro</option>
        </Select>
      </Field>
      <Button type="submit" variant="secondary" className="mt-6 h-11">
        Guardar
      </Button>
    </form>
  )
}
