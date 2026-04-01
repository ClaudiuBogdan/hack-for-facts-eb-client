import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/provocare_/termeni-si-conditii')({
  component: BudgetChallengeTermsPage,
})

export function BudgetChallengeTermsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">
          Termeni și condiții (în continuare „T&amp;C”)
        </h1>
      </div>

      <div className="prose prose-slate max-w-none dark:prose-invert">
        <h2>1. Organizatorul</h2>
        <p>
          1.1. Campania provocarea civică „Cu ochii pe bugetele locale 2026”,
          denumită în continuare „provocarea” este organizată de Funky Citizens,
          persoană juridică înființată conform OG nr. 26/2001 privind asociațiile
          și fundațiile, înregistrată în Registrul Asociațiilor și Fundațiilor sub
          nr. 65 / 22.05.2012, email{' '}
          <a href="mailto:weare@funky.ong">weare@funky.ong</a>, prin intermediul
          platformei{' '}
          <a href="https://transparenta.eu" rel="noreferrer" target="_blank">
            transparenta.eu
          </a>
          .
        </p>
        <p>
          1.2. Campania se desfășoară pe o perioadă de 60 de zile, calculate de
          la data lansării, și presupune parcurgerea unor module educative și
          interactive, incluzând transmiterea unei cereri de dezbatere a bugetului
          local, transmiterea unei contestații la bugetul local, educarea
          participanților cu privire la modul de funcționare a bugetelor publice
          din România, analiza execuțiilor bugetare.
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
        <p>
          3.1. Provocarea este deschisă tuturor cetățenilor români sau
          rezidenților în România, indiferent de nivelul de cunoștințe în
          domeniu. Înscrierea pe platforma transparenta.eu și participarea la
          provocare necesită vârsta minimă de 16 ani. Anumite provocări care
          implică transmiterea de documente oficiale către autorități publice
          (cereri de dezbatere, contestații) necesită vârsta minimă de 18 ani.
        </p>
        <p>
          3.2. Înscrierea se face prin crearea unui cont pe platforma
          transparenta.eu. Prin finalizarea înscrierii, participantul confirmă că
          a citit, înțeles și acceptat prezentele T&amp;C în totalitate.
        </p>
        <p>
          3.3. Participarea este voluntară și gratuită. Nu există nicio obligație
          de a finaliza toate provocările sau de a transmite solicitări ori
          amendamente către autorități.
        </p>
        <p>
          3.4. Înscrierea se poate realiza oricând pe parcursul celor 60 de zile,
          însă unele provocări devin indisponibile după expirarea termenelor
          legale bugetare (ex. contestațiile nu mai pot fi depuse după adoptarea
          bugetului local).
        </p>

        <h2>4. Contul pe transparenta.eu</h2>
        <p>
          4.1. Utilizarea platformei transparenta.eu în contextul provocării se
          supune următoarelor politici:
        </p>
        <ol>
          <li>
            <a href="https://transparenta.eu/terms" rel="noreferrer" target="_blank">
              T&amp;C de utilizare
            </a>{' '}
            și{' '}
            <a href="https://transparenta.eu/privacy" rel="noreferrer" target="_blank">
              politica de confidențialitate
            </a>{' '}
            ale platformei transparenta.eu – aplicabile tuturor utilizatorilor
            înregistrați pe platformă;
          </li>
          <li>
            <a href="https://funky.ong/privacy-policy/" rel="noreferrer" target="_blank">
              Politica de confidențialitate
            </a>{' '}
            a Funky Citizens – aplicabilă participanților la Provocarea civică,
            care se completează cu prevederile art. 5 și urm., pentru scopurile
            de prelucrare specifice acesteia.
          </li>
        </ol>
        <p>
          4.2. Participantul este responsabil pentru securitatea contului său și
          pentru toate acțiunile efectuate din contul respectiv.
        </p>

        <h2>5. Datele colectate în cadrul provocărilor</h2>
        <p>
          5.1. Pe parcursul provocărilor, participanții vor completa răspunsuri la
          quiz-uri, texte deschise, link-uri către documente publice și alte
          informații legate de bugetele locale ale localităților alese. Aceste
          date sunt utilizate de Funky Citizens pentru:
        </p>
        <ol>
          <li>verificarea și oferirea de feedback personalizat;</li>
          <li>
            documentarea impactului provocării și producerea de rapoarte
            agregate;
          </li>
          <li>îmbunătățirea resurselor educative și a platformei.</li>
        </ol>
        <p>
          5.2. Răspunsurile participanților la provocările avansate vor fi
          revizuite de experții Funky Citizens, care vor oferi feedback
          personalizat. Prin încărcarea răspunsurilor, participantul acceptă
          această revizuire.
        </p>
        <p>
          5.3. Datele despre localități, primării sau instituții publice introduse
          de participanți se referă exclusiv la informații publice. Participanții
          nu vor introduce date cu caracter personal ale unor terți (funcționari,
          cetățeni etc.).
        </p>

        <h2>6. Forumul</h2>
        <p>
          6.1. Forumul este accesibil în mod public pentru citire (fără cont).
          Pentru a posta, comenta sau interacționa, este necesar un cont activ pe
          platforma transparenta.eu.
        </p>
        <p>
          6.2. Utilizatorii pot posta folosind nickname-ul asociat contului lor de
          pe transparenta.eu sau pot activa modul anonim din setările profilului,
          caz în care postarea apare fără nicio identificare vizibilă în
          interfața platformei, atât față de ceilalți utilizatori, cât și față
          de administratori. Identitatea utilizatorului rămâne însă stocată în
          baza de date a platformei și poate fi accesată de operatorul
          transparenta.eu în situații justificate (ex. încălcarea regulilor
          forumului, obligații legale).
        </p>
        <p>
          6.3. Toate postările sunt vizibile tuturor participanților înscriși.
          Răspunsurile oficiale ale echipei Funky Citizens sunt marcate distinct
          față de contribuțiile celorlalți utilizatori.
        </p>
        <p>
          6.4. Participanții sunt responsabili pentru conținutul postat pe forum.
          Este interzisă publicarea de:
        </p>
        <ol>
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
        </ol>
        <p>
          6.5. Funky Citizens își rezervă dreptul de a elimina orice postare care
          încalcă regulile de mai sus și de a suspenda accesul participanților
          care le încalcă în mod repetat.
        </p>
        <p>
          6.6. Deținătorul platformei își rezervă dreptul de a modera conținutul
          cu ajutorul IA, caz în care vă rugăm să consultați T&amp;C al
          platformei transparenta.eu.
        </p>

        <h2>7. Provocările civice</h2>
        <p>7.1. Provocarea civică include opțiunea de a transmite:</p>
        <ol>
          <li>
            o cerere oficială de organizare a dezbaterii publice pe bugetul
            local, fie în numele propriei asociații, fie în numele Funky
            Citizens;
          </li>
          <li>o contestație la bugetul local, în nume propriu.</li>
        </ol>
        <p>
          7.2. Opțiunea de a trimite cererea prin platformă este condiționată de
          acordarea unui consimțământ explicit, prin intermediul unei căsuțe
          dedicate din formularul aferent acestei provocări, separat de
          prezentele T&amp;C. Consimțământul manifestat astfel reprezintă acordul
          de prelucrare a datelor cu caracter personal conținute de cerere de
          către Funky Citizens.
        </p>
        <p>7.3. Prin bifarea acelei căsuțe, participantul confirmă că:</p>
        <ol>
          <li>datele completate sunt corecte;</li>
          <li>
            înțelege că cererea va fi transmisă autorității publice locale ca
            document oficial emis sub umbrela Funky Citizens, respectiv în nume
            propriu;
          </li>
          <li>
            Funky Citizens va primi o copie a cererii, în vederea acordării de
            feedback, generării de rapoarte și statistici privind provocarea și
            îmbunătățirii platformei și resurselor, în condițiile art. 5.
          </li>
        </ol>
        <p>
          7.4. Funky Citizens nu răspunde pentru consecințele transmiterii unor
          date incorecte furnizate de participant în cadrul acestui formular.
        </p>

        <h2>8. Drepturile asupra materialelor produse</h2>
        <p>
          8.1. Materialele create de participanți (rezumate, postări, grafice,
          prezentări, contestații etc.) rămân în proprietatea autorilor.
        </p>
        <p>
          8.2. Prin participare, fiecare participant acordă Funky Citizens o
          licență neexclusivă, gratuită, de a utiliza, republica și promova
          aceste materiale în scopuri civice și educative, dacă acesta nu
          solicită altfel în mod explicit.
        </p>
        <p>
          8.3. Participanții garantează că materialele produse sunt originale, nu
          încalcă drepturi ale terților și nu conțin informații false sau
          calomnioase.
        </p>

        <h2>9. Prelucrarea datelor cu caracter personal</h2>
        <p>
          9.1. Participarea la provocare presupune, în primul rând, crearea unui
          cont de utilizator pe platforma transparenta.eu. Nu există un flux de
          înregistrare separat dedicat exclusiv provocării. Utilizatorii
          transparenta.eu care aleg să devină participanți la provocare sunt
          supuși unui dublu nivel de reglementare, conform art 4.1..
        </p>
        <p>
          9.2. Operatorul de date al platformei este transparenta.eu, în calitate
          de deținător al platformei și titular al relației cu participanții,
          care prelucrează datele în conformitate cu politicile prevăzute la art.
          4.1..
        </p>
        <p>
          9.3. Operatorul de date în cadrul campaniei „Provocarea civică” este
          Funky Citizens, care are acces la datele participanților exclusiv în
          scopul administrării acestei provocări și în temeiul consimțământului
          utilizatorului.
        </p>
        <p>
          9.3. Categoriile de date personale prelucrate și scopurile aferente –
          următoarele categorii de date sunt prelucrate pe baza consimțământului
          explicit al participantului, prevăzut la art. 6 alin. 1 lit. a) din
          Regulamentul (UE) 2016/679 (RGPD):
        </p>
        <p>a) Date de identificare (email, nume/prenume sau username):</p>
        <ol>
          <li>
            gestionarea contului de participant și comunicarea pe durata
            provocării;
          </li>
          <li>trimiterea de materiale informative relevante provocării;</li>
          <li>
            oferirea de feedback personalizat la provocările avansate.
          </li>
        </ol>
        <p>b) Date generate pe forum (întrebări, comentarii, postări):</p>
        <ol>
          <li>
            facilitarea schimbului de informații între participanți;
          </li>
          <li>oferirea de sprijin din partea echipei Funky Citizens;</li>
        </ol>
        <p>
          c) Date generate prin participarea la provocări (răspunsuri la
          quiz-uri, texte deschise, scoruri de transparență, link-uri către
          documente publice):
        </p>
        <ol>
          <li>
            verificarea răspunsurilor și oferirea de feedback personalizat;
          </li>
          <li>
            documentarea și raportarea impactului provocării, pe baza unor date
            agregate și anonimizate;
          </li>
          <li>
            promovarea provocării pe canalele Funky Citizens, exclusiv în formă
            anonimizată sau cu acordul explicit al participantului;
          </li>
          <li>
            transmitere de informații cu privire la campanii viitoare, în limita
            de timp prevăzută la art. 9.6..
          </li>
        </ol>
        <p>
          9.4. Datele cu caracter personal ale participanților nu vor fi vândute
          sau transmise unor terți în scop comercial. Funky Citizens, în calitate
          de persoană împuternicită, accesează doar categoriile de date enumerate
          la 9.3, strict în scopurile menționate, și nu le prelucrează în niciun
          alt scop.
        </p>
        <p>
          9.5. Participanții au dreptul de acces, rectificare, ștergere,
          restricționare, portabilitate și opoziție, exercitabile prin email la{' '}
          <a href="mailto:weare@funky.ong">weare@funky.ong</a>. Pentru
          drepturile legate de contul general pe transparenta.eu, participanții
          se vor adresa direct platformei.
        </p>
        <p>
          9.6. Datele specifice provocării vor fi păstrate pe durata acesteia și
          maximum 3 ani ulterior, dacă utilizatorul nu își retrage
          consimțământul între timp, după care vor fi șterse, respectiv
          anonimizate în vederea raportării de date statistice.
        </p>
        <p>
          9.7. Participantul poate retrage oricând consimțământul pentru
          scopurile specifice provocării, fără a afecta legalitatea prelucrării
          anterioare și fără a-i afecta contul general pe{' '}
          <a href="https://transparenta.eu" rel="noreferrer" target="_blank">
            transparenta.eu
          </a>
          .
        </p>
        <p>
          9.8. Dacă considerați că prelucrarea datelor dumneavoastră cu caracter
          personal încalcă prevederile Regulamentului (UE) 2016/679 (RGPD),
          aveți dreptul de a depune o plângere la{' '}
          <strong>
            Autoritatea Națională de Supraveghere a Prelucrării Datelor cu
            Caracter Personal (ANSPDCP)
          </strong>
          , cu sediul în Bd. Magheru nr. 28-30, sector 1, București, website:{' '}
          <a
            href="https://www.dataprotection.ro"
            rel="noreferrer"
            target="_blank"
          >
            www.dataprotection.ro
          </a>
          . Exercitarea acestui drept nu aduce atingere niciunei alte căi de atac
          administrative sau judiciare disponibile.
        </p>

        <h2>10. Răspundere</h2>
        <p>
          10.1. Funky Citizens pune la dispoziție resurse, ghiduri și asistență,
          dar nu garantează rezultate specifice (ex. adoptarea unui amendament de
          către autoritatea locală).
        </p>
        <p>
          10.2. Participanții acționează în nume propriu atunci când contactează
          autorități publice sau publică materiale pe canale proprii. Funky
          Citizens nu răspunde pentru acțiunile individuale față de terți.
        </p>
        <p>
          10.3. Funky Citizens nu răspunde pentru întreruperi tehnice ale
          platformei transparenta.eu sau pentru modificări ale calendarului
          bugetar legal care pot afecta disponibilitatea unor provocări.
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
