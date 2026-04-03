import { Link } from '@tanstack/react-router'

export function CookiePolicyContentRo() {
  return (
    <div className="mx-auto w-full max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Politica privind cookie-urile</h1>
        <p className="text-sm text-muted-foreground">Data intrării în vigoare: 3 aprilie 2026 · Versiunea: 3.0</p>
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Pe scurt</h2>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li>Stocarea esențială este necesară pentru funcționarea aplicației.</li>
          <li>Cookie-urile de autentificare sunt folosite dacă vă creați un cont.</li>
          <li>Analiza și raportarea avansată a erorilor sunt opționale.</li>
          <li>Gestionați preferințele oricând din <Link to="/cookies" className="underline">Setări cookie-uri</Link>.</li>
        </ul>
      </div>
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <h3>Tehnologiile pe care le folosim</h3>
        <p>Folosim cookie-uri și tehnologii de stocare în browser precum localStorage, sessionStorage și IndexedDB pentru a opera aplicația și, cu consimțământ, pentru a măsura utilizarea și a îmbunătăți fiabilitatea.</p>

        <h3>Categorii</h3>
        <ul>
          <li><strong>Esențiale</strong>: Preferințele de consimțământ și starea de bază a interfeței (întotdeauna active).</li>
          <li><strong>Autentificare (esențială, dacă aveți cont)</strong>: Cookie-uri de sesiune Clerk pentru autentificare sigură și gestionarea contului.</li>
          <li><strong>Analiză (opțional)</strong>: doar evenimente personalizate PostHog (fără autocaptură).</li>
          <li><strong>Raportare avansată a erorilor (opțional)</strong>: context opțional Sentry.</li>
        </ul>

        <h3>Defalcare detaliată</h3>

        <h4>Cookie-uri și Stocare Esențiale (întotdeauna active)</h4>
        <p>Acestea sunt necesare pentru ca Serviciul să funcționeze și nu pot fi dezactivate:</p>
        <ul>
          <li><strong>localStorage</strong>: Include elemente precum <code>cookie-consent</code> (preferințe de consimțământ), <code>saved-charts</code> și <code>chart-categories</code> (vizualizări salvate și organizarea lor), preferințe de limbă, temă, monedă și ajustare la inflație, entități recente, alerte, progres de învățare, progres de campanie, stare de onboarding și alte setări de funcționalitate sau schițe stocate local.</li>
          <li><strong>sessionStorage</strong>: Poate fi utilizat pentru stare temporară de runtime, fluxuri de recuperare sau funcționalități de transfer în cadrul unei sesiuni.</li>
          <li><strong>IndexedDB</strong>: Poate fi utilizat de funcționalități avansate, precum snapshot-urile locale ale hărților sau alte seturi de date client-side mai mari, necesare pentru comportament de tip draft sau offline-friendly.</li>
        </ul>

        <h4>Cookie-uri de Autentificare (esențiale dacă aveți cont)</h4>
        <p>Dacă vă creați un cont, Clerk setează următoarele cookie-uri pentru autentificare și gestionarea sesiunii:</p>
        <ul>
          <li><strong>__clerk_db_jwt</strong>: Token de sesiune pentru autentificare (httpOnly, secure).</li>
          <li><strong>__session</strong>: Identificator de sesiune (httpOnly, secure).</li>
          <li><strong>__clerk_*</strong>: Diverse cookie-uri Clerk pentru gestionarea contului și securitate.</li>
        </ul>
        <p>Aceste cookie-uri sunt esențiale pentru funcționalitatea contului. Dacă le ștergeți, veți fi deconectat(ă).</p>

        <h4>Cookie-uri de Analiză (doar opționale)</h4>
        <p>Setate doar dacă sunteți de acord cu analiza:</p>
        <ul>
          <li><strong>PostHog</strong>: Identificatori <code>ph_*</code> pentru analiza utilizării. Doar evenimente personalizate, fără autocaptură sau înregistrări de sesiune.</li>
        </ul>

        <h4>Raportarea Erorilor (doar opțională)</h4>
        <p>Setate doar dacă sunteți de acord cu raportarea îmbunătățită a erorilor:</p>
        <ul>
          <li><strong>Sentry</strong>: Chei de sesiune pentru contextul erorii și reluare, dacă sunt activate.</li>
        </ul>

        <h3>Durata cookie-urilor</h3>
        <ul>
          <li><strong>Stocare esențială în browser</strong>: Intrările din localStorage, sessionStorage și IndexedDB pot persista până când le ștergeți manual, până când funcționalitatea relevantă le suprascrie sau până când sunt eliminate de browser.</li>
          <li><strong>Cookie-uri de autentificare Clerk</strong>: Cookie-uri de sesiune (expiră la închiderea browserului) și cookie-uri persistente (până la 30 de zile pentru „ține-mă minte").</li>
          <li><strong>Analiză PostHog</strong>: Până la 1 an.</li>
          <li><strong>Sentry</strong>: Doar durata sesiunii, deși feedback-ul sau rapoartele de bug trimise pot fi păstrate server-side conform regulilor de retenție din Politica de confidențialitate.</li>
        </ul>

        <h3>Gestionarea preferințelor</h3>
        <p>Folosiți <Link to="/cookies" className="underline">Setările Cookie</Link> pentru a gestiona consimțământul pentru analize și raportarea erorilor, sau folosiți controalele browserului pentru a șterge datele site-ului.</p>
        <p>Notă: Ștergerea cookie-urilor de autentificare vă va deconecta din cont. Golirea localStorage, sessionStorage sau IndexedDB poate reseta graficele salvate, progresul, hărțile, alertele și alte preferințe sau schițe stocate local.</p>
        <p>Consultați și <Link to="/privacy" className="underline">Politica de confidențialitate</Link>.</p>
      </div>
    </div>
  )
}
