import { creditosIconos } from "@/lib/creditos";

export const metadata = {
  title: "Créditos",
};

export default function CreditosPage() {
  const listados = creditosIconos.filter((c) => !c.pendiente);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Créditos</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Koru usa iconos de{" "}
        <a
          href="https://www.flaticon.com"
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Flaticon
        </a>
        , bajo su licencia gratuita con atribución.
      </p>

      {listados.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">Aún no hay iconos registrados.</p>
      ) : (
        <ul className="mt-8 space-y-2 text-sm">
          {listados.map((c) => (
            <li key={c.archivo}>
              {c.nombre}: diseñado por{" "}
              <a href={c.url} className="underline" target="_blank" rel="noopener noreferrer">
                {c.autor}
              </a>{" "}
              en Flaticon
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
