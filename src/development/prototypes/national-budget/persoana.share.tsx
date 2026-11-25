import { leiText, perPerson, useHundred, useOfficialTotals } from './persoana.data'
import { Note, usePersonYear } from './persoana.shell'

/**
 * The share card (owner's pick, 25 November 2026): the reader's share of
 * the year's public spending, as a 1200 × 630 picture for social media. The
 * prototype draws it in the page; the live one would be a server-made PNG,
 * like the entity pages' share images, behind the page's own link.
 */
export function ShareCard() {
  const { view } = usePersonYear()
  const totals = useOfficialTotals(view)
  const spending = useHundred(view, 'spending')
  const share = perPerson(totals.spending, view)
  const borrowed = perPerson(totals.deficit, view)
  const top = spending.lines.filter((line) => !line.rest).slice(0, 3)
  return (
    <div>
      <div className="@container mx-auto w-full max-w-[40rem]">
        <div
          className="relative flex aspect-[1200/630] flex-col justify-between overflow-hidden rounded-md p-[5cqw] text-white"
          style={{ backgroundColor: 'hsl(var(--choropleth-5))' }}
          role="img"
          aria-label={`Partea ta din cheltuielile publice în ${view.text}: ${leiText(share)}`}
        >
          <p className="flex items-center justify-between text-[2.6cqw] font-medium opacity-85">
            <span>Transparenta.eu · Bugetul național</span>
            <span className="tabular-nums">{view.text}</span>
          </p>
          <div>
            <p className="text-[3.6cqw] font-medium opacity-90">Partea ta din cheltuielile statului</p>
            <p className="mt-[0.5cqw] text-[13cqw] font-extrabold leading-[0.95] tracking-[-0.04em] tabular-nums">{leiText(share)}</p>
            <p className="mt-[1cqw] text-[3cqw] opacity-85">
              pe locuitor{borrowed ? `, din care ${leiText(borrowed)} împrumutați` : ''}
            </p>
          </div>
          <ul className="grid grid-cols-3 gap-[2.5cqw] border-t border-white/30 pt-[2.2cqw]">
            {top.map((line) => (
              <li key={line.key} className="min-w-0">
                <p className="truncate text-[2.4cqw] opacity-80">{line.label}</p>
                <p className="text-[3.6cqw] font-semibold tabular-nums">{leiText(perPerson(line.exact, view))}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Note className="mx-auto max-w-[40rem]">
        Cardul s-ar genera pe server ca imagine 1200 × 630, cu anul ales, și ar apărea când cineva distribuie pagina. Cifrele sunt ale paginii: cheltuielile publice împărțite la
        populația rezidentă de la 1 ianuarie.
      </Note>
    </div>
  )
}
