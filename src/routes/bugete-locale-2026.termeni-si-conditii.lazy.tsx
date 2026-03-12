import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/bugete-locale-2026/termeni-si-conditii')({
  component: BudgetChallengeTermsPage,
})

export function BudgetChallengeTermsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Termeni și condiții</h1>
        <p className="text-sm text-muted-foreground">
          Termeni și condiții specifice provocării Bugete Locale 2026.
        </p>
      </div>

      <div className="prose prose-slate max-w-none dark:prose-invert">
        <h2>1. Organizatorul</h2>
        <p>
          Provocarea este organizată de Funky Citizens, prin intermediul
          platformei transparenta.eu.
        </p>

        <h2>2. Perioada și scopul provocării</h2>
        <p>
          Provocarea se desfășoară timp de 60 de zile de la publicarea în
          Monitorul Oficial a Legii bugetului de stat pentru 2026, în cadrul
          ciclului bugetar local reglementat de Legea nr. 273/2006. Scopul ei
          este educativ și civic: să sprijine cetățenii în înțelegerea,
          analizarea și implicarea în procesul de adoptare a bugetelor locale.
        </p>

        <h2>3. Condiții de participare și eligibilitate</h2>
        <h3>3.1.</h3>
        <p>
          Provocarea este deschisă tuturor cetățenilor români sau rezidenților
          în România, indiferent de nivelul de cunoștințe în domeniu.
          Înscrierea pe platforma transparenta.eu și participarea la provocare
          necesită vârsta minimă de 16 ani. Anumite provocări care implică
          transmiterea de documente oficiale către autorități publice (cereri
          de dezbatere, contestații) necesită vârsta minimă de 18 ani.
        </p>
        <h3>3.2.</h3>
        <p>
          Înscrierea se face prin crearea unui cont pe platforma transparenta.eu.
          Prin finalizarea înscrierii, participantul confirmă că a citit,
          înțeles și acceptat prezentele T&amp;C în totalitate.
        </p>
        <h3>3.3.</h3>
        <p>
          Participarea este voluntară și gratuită. Nu există nicio obligație de
          a finaliza toate provocările sau de a transmite solicitări ori
          amendamente către autorități.
        </p>
        <h3>3.4.</h3>
        <p>
          Înscrierea se poate realiza oricând pe parcursul celor 60 de zile,
          însă unele provocări devin indisponibile după expirarea termenelor
          legale bugetare (ex. contestațiile nu mai pot fi depuse după adoptarea
          bugetului local).
        </p>

        <h2>4. Contul pe transparenta.eu</h2>
        <h3>4.1.</h3>
        <p>
          Utilizarea platformei transparenta.eu în contextul provocării este
          guvernată atât de prezentele T&amp;C, cât și de Termenii și Condițiile
          de utilizare ale platformei transparenta.eu, disponibili pe aceasta.
        </p>
        <h3>4.2.</h3>
        <p>
          Participantul este responsabil pentru securitatea contului său și
          pentru toate acțiunile efectuate din contul respectiv.
        </p>

        <h2>5. Datele colectate în cadrul provocărilor</h2>
        <h3>5.1.</h3>
        <p>
          Pe parcursul provocărilor, participanții vor completa răspunsuri la
          quiz-uri, texte deschise, link-uri către documente publice și alte
          informații legate de bugetele locale ale localităților alese. Aceste
          date sunt utilizate de Funky Citizens pentru:
        </p>
        <ul>
          <li>verificarea și oferirea de feedback personalizat;</li>
          <li>
            documentarea impactului provocării și producerea de rapoarte
            agregate;
          </li>
          <li>
            îmbunătățirea resurselor educative și a platformei.
          </li>
        </ul>
        <h3>5.2.</h3>
        <p>
          Răspunsurile participanților la provocările avansate vor fi revizuite
          de experții Funky Citizens, care vor oferi feedback personalizat. Prin
          submiterea răspunsurilor, participantul acceptă această revizuire.
        </p>
        <h3>5.3.</h3>
        <p>
          Datele despre localități, primării sau instituții publice introduse de
          participanți se referă exclusiv la informații publice. Participanții
          nu vor introduce date cu caracter personal ale unor terți
          (funcționari, cetățeni etc.).
        </p>

        <h2>6. Forumul</h2>
        <h3>6.1.</h3>
        <p>
          Forumul este accesibil în mod public pentru citire (fără cont). Pentru
          a posta, comenta sau interacționa, este necesar un cont activ pe
          platforma transparenta.eu.
        </p>
        <h3>6.2.</h3>
        <p>
          Utilizatorii pot posta folosind nickname-ul asociat contului lor de pe
          transparenta.eu sau pot activa modul anonim din setările profilului,
          caz în care postarea apare fără nicio identificare, inclusiv față de
          administratorii platformei și față de Funky Citizens. Prin urmare,
          Funky Citizens nu are acces la identitatea reală a utilizatorilor care
          postează anonim.
        </p>
        <h3>6.3.</h3>
        <p>
          Toate postările sunt vizibile tuturor participanților înscriși.
          Răspunsurile oficiale ale echipei Funky Citizens sunt marcate distinct
          față de contribuțiile celorlalți utilizatori.
        </p>
        <h3>6.4.</h3>
        <p>
          Participanții sunt responsabili pentru conținutul postat pe forum.
          Este interzisă publicarea de:
        </p>
        <ul>
          <li>
            informații false sau calomnioase la adresa unor persoane sau
            instituții;
          </li>
          <li>
            date personale ale unor terți fără consimțământul acestora;
          </li>
          <li>
            conținut ofensator, discriminatoriu sau care încalcă legislația
            română în vigoare.
          </li>
        </ul>
        <h3>6.5.</h3>
        <p>
          Funky Citizens își rezervă dreptul de a elimina orice postare care
          încalcă regulile de mai sus și de a suspenda accesul participanților
          care le încalcă în mod repetat.
        </p>

        <h2>7. Cererea de dezbatere publică în numele Funky Citizens</h2>
        <h3>7.1.</h3>
        <p>
          Provocarea civică include opțiunea de a transmite o cerere oficială de
          organizare a dezbaterii publice pe bugetul local, fie în numele
          propriei asociații, fie în numele Funky Citizens.
        </p>
        <h3>7.2.</h3>
        <p>
          Opțiunea de a trimite cererea în numele Funky Citizens este
          condiționată de bifarea unui checkbox de consimțământ explicit,
          disponibil în formularul aferent acestei provocări, separat de
          prezentele T&amp;C.
        </p>
        <h3>7.3.</h3>
        <p>
          Prin bifarea acelui checkbox, participantul confirmă că datele
          completate sunt corecte și că înțelege că cererea va fi transmisă
          autorității publice locale ca document oficial emis sub umbrela Funky
          Citizens.
        </p>
        <h3>7.4.</h3>
        <p>
          Funky Citizens nu răspunde pentru consecințele transmiterii unor date
          incorecte furnizate de participant în cadrul acestui formular.
        </p>

        <h2>8. Drepturile asupra materialelor produse</h2>
        <h3>8.1.</h3>
        <p>
          Materialele create de participanți (rezumate, postări, grafice,
          prezentări, contestații etc.) rămân în proprietatea autorilor.
        </p>
        <h3>8.2.</h3>
        <p>
          Prin participare, fiecare participant acordă Funky Citizens o licență
          neexclusivă, gratuită, de a utiliza, republica și promova aceste
          materiale în scopuri civice și educative, dacă acesta nu solicită
          altfel explicit.
        </p>
        <h3>8.3.</h3>
        <p>
          Participanții garantează că materialele produse sunt originale, nu
          încalcă drepturi ale terților și nu conțin informații false sau
          calomnioase.
        </p>

        <h2>9. Protecția datelor personale</h2>
        <h3>9.1.</h3>
        <p>
          Participarea la provocare presupune, în primul rând, crearea unui cont
          de utilizator pe platforma transparenta.eu. Nu există un flux de
          înregistrare separat dedicat exclusiv provocării. Utilizatorii
          transparenta.eu care aleg să devină participanți la provocare sunt
          supuși unui dublu nivel de reglementare:
        </p>
        <ul>
          <li>
            Termenii și Condițiile generale ale platformei transparenta.eu,
            aplicabili tuturor utilizatorilor înregistrați;
          </li>
          <li>
            Prezentele T&amp;C specifice provocării, aplicabile suplimentar
            utilizatorilor care se înscriu în provocare, pentru scopurile de
            prelucrare suplimentare descrise mai jos.
          </li>
        </ul>
        <h3>9.2.</h3>
        <p>
          Operatorul de date pentru scopurile specifice acestei provocări este
          Funky Citizens. Transparenta.eu acționează în calitate de persoană
          împuternicită de operator, prelucrând datele participanților exclusiv
          pe baza instrucțiunilor Funky Citizens și în scopurile agreate.
          Relația dintre cei doi este guvernată de un acord de prelucrare a
          datelor, conform Art. 28 RGPD.
        </p>
        <h3>9.2.</h3>
        <p>
          Datele sunt prelucrate de Funky Citizens în calitate de operator, în
          temeiul consimțământului explicit al participantului (Art. 6 alin. 1
          lit. a, RGPD).
        </p>
        <h3>9.3.</h3>
        <p>Scopurile de prelucrare specifice provocării sunt:</p>
        <ul>
          <li>
            gestionarea participării și comunicarea cu participanții pe durata
            provocării;
          </li>
          <li>
            oferirea de feedback personalizat la provocările avansate;
          </li>
          <li>
            documentarea și raportarea impactului provocării, inclusiv promovarea
            acesteia pe canalele Funky Citizens, pe baza unor date agregate și
            anonimizate (ex. număr de participanți, localități adoptate, scoruri
            de transparență), fără utilizarea datelor cu caracter personal în
            materiale de promovare
          </li>
          <li>trimiterea de materiale informative relevante provocării.</li>
        </ul>
        <h3>9.4.</h3>
        <p>
          Datele cu caracter personal ale participanților nu vor fi vândute sau
          transmise unor terți în scop comercial. Accesul transparenta.eu la
          aceste date este limitat la rolul de persoană împuternicită, strict
          pentru operarea tehnică a platformei în contextul provocării.
        </p>
        <h3>9.5.</h3>
        <p>
          Participanții au dreptul de acces, rectificare, ștergere,
          restricționare, portabilitate și opoziție, exercitabile prin email la
          weare@funky.ong. Pentru drepturile legate de contul general pe
          transparenta.eu, participanții se vor adresa direct platformei.
        </p>
        <h3>9.6.</h3>
        <p>
          Datele specifice provocării vor fi păstrate pe durata acesteia și
          maximum 3 ani ulterior, după care vor fi șterse sau anonimizate.
        </p>
        <h3>9.7.</h3>
        <p>
          Participantul poate retrage oricând consimțământul pentru scopurile
          specifice provocării, fără a afecta legalitatea prelucrării anterioare
          și fără a-i afecta contul general pe transparenta.eu.
        </p>

        <h2>10. Răspundere</h2>
        <h3>10.1.</h3>
        <p>
          Funky Citizens pune la dispoziție resurse, ghiduri și asistență, dar
          nu garantează rezultate specifice (ex. adoptarea unui amendament de
          către autoritatea locală).
        </p>
        <h3>10.2.</h3>
        <p>
          Participanții acționează în nume propriu atunci când contactează
          autorități publice sau publică materiale pe canale proprii. Funky
          Citizens nu răspunde pentru acțiunile individuale față de terți.
        </p>
        <h3>10.3.</h3>
        <p>
          Funky Citizens nu răspunde pentru întreruperi tehnice ale platformei
          transparenta.eu sau pentru modificări ale calendarului bugetar legal
          care pot afecta disponibilitatea unor provocări.
        </p>

        <h2>11. Modificarea și încetarea provocării</h2>
        <p>
          Funky Citizens poate modifica structura, calendarul sau condițiile
          provocării în cazul unor circumstanțe excepționale (ex. modificări
          legislative majore, amânarea aprobării bugetului de stat), cu
          notificarea prealabilă a participanților înscriși.
        </p>

        <h2>12. Legea aplicabilă</h2>
        <p>
          Prezentele T&amp;C sunt guvernate de legea română. Orice litigiu va fi
          soluționat pe cale amiabilă, iar în caz contrar, de instanțele
          competente din România.
        </p>

        <h2>13. Contact</h2>
        <p>
          Funky Citizens –{' '}
          <a href="mailto:weare@funky.ong">weare@funky.ong</a> |{' '}
          <a href="https://funky.ong" rel="noreferrer" target="_blank">
            funky.ong
          </a>
        </p>
      </div>
    </div>
  )
}
