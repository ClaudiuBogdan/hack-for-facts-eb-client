import { Link } from '@tanstack/react-router'

/**
 * Long-form methodology page for the procurement value model (value-basis
 * wave, design v1.1). Romanian-only by decision (2026-07-24): this is
 * domain-locked explanatory prose for the RO audience; the in-app notices
 * carry the short versions and link here.
 *
 * The rules described here mirror the LOCKED data-layer design in
 * prod-db/PROCUREMENT_VALUE_BASIS_SERVING_DESIGN.md (scrapper repo) — update
 * BOTH when a rule changes.
 */

function Section({
  title,
  children,
}: {
  readonly title: string
  readonly children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-black tracking-tight text-[var(--pnrr-fg)]">
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-7 text-[var(--pnrr-muted)] [&_strong]:text-[var(--pnrr-fg)]">
        {children}
      </div>
    </section>
  )
}

export function ProcurementValueModelMethodology() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-10 px-4 py-10 sm:px-6">
      <header className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--pnrr-muted)]">
          Achiziții publice · Metodologie
        </p>
        <h1 className="text-3xl font-black tracking-tight text-[var(--pnrr-fg)]">
          Cum citim banii din achizițiile publice
        </h1>
        <p className="text-base leading-7 text-[var(--pnrr-muted)]">
          Un contract de achiziție publică nu are „o singură valoare”. Același
          dosar poate purta o valoare estimată, o valoare atribuită, un plafon
          de acord-cadru, contracte subsecvente și acte adiționale care schimbă
          suma. Fiecare răspunde la o întrebare diferită — iar amestecarea lor
          produce totaluri confidente și greșite, de ordinul miliardelor de
          lei. Această pagină explică fiecare logică de valoare servită de
          platformă, regulile de acceptare din spatele ei și de ce cifrele nu
          se adună între ele.
        </p>
      </header>

      <Section title="De ce nu există „totalul achizițiilor”">
        <p>
          Sursa oficială (SEAP / e-licitatie) publică mai multe tipuri de
          înregistrări cu granulații diferite: <strong>proceduri</strong> (licitații),{' '}
          <strong>contracte atribuite</strong>, <strong>achiziții directe</strong>,{' '}
          <strong>acorduri-cadru</strong>, <strong>contracte subsecvente</strong>{' '}
          (execuția de sub acorduri-cadru) și <strong>acte adiționale</strong>{' '}
          (modificări). Aceeași sumă de bani poate apărea legitim în mai multe
          locuri: plafonul unui acord-cadru acoperă contractele subsecvente
          semnate sub el, iar un act adițional re-declară valoarea contractului
          pe care îl modifică.
        </p>
        <p>
          De aceea platforma tratează fiecare logică de valoare ca o{' '}
          <strong>populație separată, cu propria regulă de acceptare</strong>, și
          refuză structural să le adune. Când o cifră nu poate fi servită
          onest, ea este reținută („—”) cu o explicație — niciodată înlocuită
          în tăcere cu altă cifră.
        </p>
      </Section>

      <Section title="1. Valoarea atribuită (implicit)">
        <p>
          <strong>Ce răspunde:</strong> cât s-a semnat — valoarea contractelor și a
          achizițiilor directe la momentul atribuirii, în lei.
        </p>
        <p>
          <strong>Reguli:</strong> intră doar înregistrările canonice (duplicatele
          dintre surse sunt unificate) cu o valoare care trece validarea
          stratului de date (monedă, magnitudine, coerență între surse).
          Acordurile-cadru sunt <strong>excluse</strong> din acest total: rândul lor
          poartă plafonul, nu o sumă cheltuită, și ar umfla totalul de câteva
          ori. Acoperirea măsurată a valorilor pe contracte este ~85%, deci
          totalul este servit ca <em>parțial</em> (sub pragul de acoperire
          totală, peste pragul de divulgare) — vezi secțiunea despre praguri.
        </p>
      </Section>

      <Section title="2. Valoarea estimată">
        <p>
          <strong>Ce răspunde:</strong> cât s-a bugetat — valoarea estimată publicată
          de autoritate înainte de atribuire.
        </p>
        <p>
          <strong>Reguli:</strong> estimările sunt cele mai fiabile pe{' '}
          <strong>proceduri</strong> (acoperire ~93%). Pe contracte, estimarea este
          adesea copia plafonului întregului acord-cadru sau al întregii
          proceduri, repetată pe fiecare rând — un total onest nu poate fi
          construit încă, așa că cifra <strong>se abține</strong> în loc să inducă în
          eroare. Valorile aberante dovedite (erori de introducere de ordinul
          sutelor de miliarde) sunt puse în carantină și dezvăluite, niciodată
          „corectate” pe ghicite.
        </p>
      </Section>

      <Section title="3. Plafoanele acordurilor-cadru">
        <p>
          <strong>Ce răspunde:</strong> care este angajamentul maxim de sub
          acordurile-cadru — o limită superioară, <strong>nu bani cheltuiți</strong>.
        </p>
        <p>
          <strong>Reguli:</strong> sursa repetă plafonul unui acord pe fiecare rând
          membru (fiecare furnizor semnatar), așa că însumarea naivă a
          rândurilor umflă totalul de ~3×. Platforma reconstruiește{' '}
          <strong>identitatea acordului</strong> (autoritate + anunț + număr de
          contract) și numără plafonul <strong>o singură dată</strong> per acord.
          Grupurile în care rândurile aceluiași acord declară valori diferite
          nu pot fi atribuite cu încredere și sunt puse în carantină —
          dezvăluite ca sumă separată, neservite.
        </p>
        <p>
          <strong>De ce nu există clasamente pe plafoane:</strong> în interiorul
          feliilor înguste (un singur cumpărător), acordurile repetate cu
          același plafon pot ajunge la ~22% din sumă — o ordine construită pe
          astfel de felii ar putea induce în eroare. Până când identitățile de
          acord pot fi grupate mai fin, servim doar totalul general și seria
          lunară.
        </p>
      </Section>

      <Section title="4. Contractele subsecvente (call-off)">
        <p>
          <strong>Ce răspunde:</strong> execuția de sub acordurile-cadru — contractele
          subsecvente raportate, cu valorile lor.
        </p>
        <p>
          <strong>Reguli:</strong> este o populație proprie (~63.000 de înregistrări,
          ~99,9% cu valoare). Raportarea subsecventelor este{' '}
          <strong>parțială prin construcție</strong> — multe acorduri nu au
          subsecvente raportate — deci totalul este o limită inferioară.
          Subsecventele <strong>nu se adună niciodată</strong> cu valorile atribuite
          ale contractelor: același ban ar fi numărat de două ori (o dată în
          contractul-umbrelă, o dată în execuție).
        </p>
      </Section>

      <Section title="5. Valoarea ajustată prin acte adiționale">
        <p>
          <strong>Ce răspunde:</strong> valoarea finală a contractului după
          modificările (actele adiționale) verificate.
        </p>
        <p>
          <strong>Reguli:</strong> un lanț de modificări este acceptat doar dacă{' '}
          <strong>ancorează</strong> (prima valoare „înainte” coincide cu valoarea
          atribuită) și este <strong>continuu</strong> (fiecare „după” devine
          următorul „înainte”, toleranță 1 ban). Se servește valoarea finală a
          lanțului, nu suma deltelor — deltele brute din sursă conțin erori
          dovedite de sute de miliarde. Contractele ale căror modificări nu pot
          fi ordonate fiabil sunt <strong>excluse</strong> din această cifră, nu
          servite pe tăcute ca valoare atribuită. Clasamentele și harta rămân
          pe valoarea atribuită.
        </p>
      </Section>

      <Section title="Modificările ca populație: doar numărate">
        <p>
          Actele adiționale pot fi analizate ca populație proprie (număr de
          modificări pe instituții, furnizori, categorii CPV), dar{' '}
          <strong>fără bani</strong>: aproape jumătate nu au dată, iar câmpurile
          brute de valoare conțin erori grosolane pe care stratul de date le
          etichetează, nu le însumează. Efectele verificate ale modificărilor
          se servesc exclusiv prin valoarea ajustată a contractelor (logica 5).
        </p>
      </Section>

      <Section title="Pragurile de acoperire și verdictele">
        <p>
          Fiecare cifră de bani are propriul <strong>verdict de acoperire</strong>,
          calculat pe datele reale la fiecare reconstrucție:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>servită</strong> — acoperirea valorilor depășeste pragul înalt
            (95%); cifra se afișează fără rezerve;
          </li>
          <li>
            <strong>parțială (divulgată)</strong> — acoperirea este între 75% și
            95%; cifra se afișează cu un avertisment explicit că subestimează;
          </li>
          <li>
            <strong>reținută</strong> — sub 75% sau fără verdict publicat; nu se
            afișează nimic și nu se substituie altă cifră.
          </li>
        </ul>
        <p>
          Aceleași verdicte guvernează și seriile de timp și geografia:
          înregistrările fără dată sau fără teritoriu cunoscut sunt dezvăluite
          ca atare, niciodată distribuite pe ghicite.
        </p>
      </Section>

      <Section title="Geografia: cum se reconciliază hărțile">
        <p>
          Harta cumpărătorilor și harta furnizorilor pornesc din aceiași bani,
          dar nu vor arăta niciodată identic — iar panoul de sub hartă arată
          exact de ce, ca cifrele să se închidă în fața cititorului:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Locația cumpărătorului</strong> este teritoriul
            administrativ al instituției; pentru companiile publice naționale
            (CNIR, CFR, Metrorex…) care nu au un teritoriu administrativ,
            folosim <strong>sediul social înregistrat la ONRC</strong> — banii
            lor apar deci în județul sediului (cel mai des București), nu acolo
            unde se execută lucrarea. Proveniența fiecărei atribuiri
            (administrativă vs. sediu) este înregistrată pe fiecare rând.
          </li>
          <li>
            <strong>Locația furnizorului</strong> este sediul social
            înregistrat; furnizorii străini sau nerezolvați rămân în categoria
            „fără locație cunoscută”, afișată sub hartă — niciodată pictată ca
            zero.
          </li>
          <li>
            <strong>Consorțiile (asocierile de firme)</strong> câștigă
            contracte fără să publice împărțirea internă a banilor. Suma lor —
            peste jumătate din banii contractelor din unii ani — este
            dezvăluită sub harta furnizorilor ca sumă globală{' '}
            <strong>neatribuibilă</strong> vreunui furnizor sau teritoriu,
            niciodată redistribuită pe ghicite.
          </li>
        </ul>
        <p>
          Procentele de acoperire se afișează în două ponderi: pe{' '}
          <strong>înregistrări</strong> și pe <strong>banii atribuiți</strong> —
          înregistrările fără teritoriu sunt puține, dar mari, deci cele două
          procente diferă substanțial și ambele sunt spuse.
        </p>
      </Section>

      <Section title="De ce diferă totalurile între logici">
        <p>
          Cele cinci logici măsoară lucruri diferite pe populații diferite:
          estimatul unei proceduri acoperă întreaga procedură (mai mare decât
          suma contractelor semnate), plafonul unui acord acoperă ani de
          execuție viitoare, subsecventele raportate sunt o fracțiune din
          execuția reală, iar valoarea ajustată diferă de cea atribuită doar
          pentru contractele cu modificări verificate. Compararea lor este
          informativă; <strong>însumarea lor este întotdeauna o eroare</strong> — de
          aceea interfața nu o permite.
        </p>
      </Section>

      <Section title="Proveniență și verificabilitate">
        <p>
          Fiecare înregistrare păstrează un drum navigabil către sursa
          oficială (SEAP / e-licitatie), iar fiecare răspuns agregat poartă
          plicul său de onestitate: verdictul, motivul, acoperirea măsurată și
          avertismentele. Regulile din această pagină sunt versionate împreună
          cu stratul de date; când o regulă se schimbă, pagina se actualizează
          odată cu ea.
        </p>
        <p>
          <Link
            to="/procurement"
            className="font-bold underline underline-offset-2"
          >
            Înapoi la analiza achizițiilor
          </Link>
        </p>
      </Section>
    </main>
  )
}
