import { createAdminClient } from '@/lib/supabase/admin'
import { cerrarSesion } from '@/app/acciones'
import { Button, Card } from '@/components/ui'
import { aprobarCuenta } from './actions'

export default async function AdminPage() {
  // Cliente admin (no el normal con RLS): la cuenta admin no es
  // propietaria de las cuentas ajenas, asi que la RLS de "cuentas"
  // (auth.uid() = id) le impediria ver nada con el cliente normal.
  const admin = createAdminClient()
  const { data: cuentas } = await admin
    .from('cuentas')
    .select('id, nombre_negocio, tipo, nombre_educador, edad, aprobada, created_at')
    .order('created_at', { ascending: false })

  const cuentasConEmail = await Promise.all(
    (cuentas ?? []).map(async (c) => {
      const { data } = await admin.auth.admin.getUserById(c.id)
      return { ...c, email: data?.user?.email ?? '(no disponible)' }
    })
  )

  // La cuenta de prueba del propio admin no es una cuidadora real que
  // revisar, se excluye de estas listas.
  const cuentasReales = cuentasConEmail.filter((c) => c.email !== process.env.ADMIN_EMAIL)
  const pendientes = cuentasReales.filter((c) => !c.aprobada)
  const aprobadas = cuentasReales.filter((c) => c.aprobada)

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <form action={cerrarSesion}>
          <Button variant="ghost" type="submit">
            Cerrar sesión
          </Button>
        </form>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        Usa el display flotante de abajo a la derecha para saltar entre las vistas de
        cuidador/a y padre/madre — tu propia cuenta tiene un niño de ejemplo para ambas.
      </p>

      <h2 className="mt-8 text-sm font-medium text-muted-foreground">
        Pendientes de aprobar ({pendientes.length})
      </h2>
      {pendientes.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No hay cuentas pendientes.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {pendientes.map((c) => (
            <li key={c.id}>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.nombre_negocio}</p>
                  <p className="text-sm text-muted-foreground">
                    {c.email} · {c.tipo === 'guarderia' ? 'Guardería' : 'Cuidadora individual'}
                  </p>
                  {c.nombre_educador && (
                    <p className="text-sm text-muted-foreground">
                      {c.nombre_educador}
                      {c.edad ? `, ${c.edad} años` : ''}
                    </p>
                  )}
                </div>
                <form action={aprobarCuenta}>
                  <input type="hidden" name="cuenta_id" value={c.id} />
                  <Button type="submit">Aprobar</Button>
                </form>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-sm font-medium text-muted-foreground">
        Aprobadas ({aprobadas.length})
      </h2>
      {aprobadas.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Ninguna todavía.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {aprobadas.map((c) => (
            <li key={c.id} className="rounded-2xl border border-border px-4 py-2.5 text-sm">
              {c.nombre_negocio} · {c.email}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
