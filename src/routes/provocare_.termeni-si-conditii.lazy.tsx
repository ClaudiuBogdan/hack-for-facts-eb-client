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
        <p className="text-sm text-muted-foreground">
          * actualizate și publicate la 06.04.2026
        </p>
      </div>

      <div className="prose prose-slate max-w-none dark:prose-invert">
        <h2>1. Informații generale</h2>
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
        <p>
          1.3. În sensul prezentului contract și al clauzelor subsecvente,
          termenii de mai jos au următoarele înțelesuri:
        </p>
        <ul>
          <li>
            persoana vizată (utilizator) - orice persoană fizică identificată
            sau identificabilă ale cărei date cu caracter personal sunt
            prelucrate de Operator;
          </li>
          <li>
            operator - entitatea care determină scopurile și mijloacele
            prelucrării datelor cu caracter personal, astfel cum este
            identificată în preambulul contractului; Funky Citizens și
            platforma transparenta.eu au calitatea de operatori de date cu
            caracter personal, în condițiile art. 9;
          </li>
          <li>
            cerere de exercitare a drepturilor - orice solicitare transmisă de
            utilizator prin care aceasta înțelege să uzeze de unul sau mai multe
            dintre drepturile conferite de Regulamentul (UE) 2016/679
            („GDPR”);
          </li>
          <li>
            canal desemnat - mijlocul de comunicare pus la dispoziție de
            Operator pentru primirea și procesarea cererilor persoanelor vizate,
            detaliat la Art. 9.8.
          </li>
        </ul>

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
        <p>
          3.5. După înscriere, participantul poate primi comunicări unice sau
          ocazionale strict necesare pentru confirmarea participării în campanie,
          confirmarea unor acțiuni solicitate de acesta, securitatea contului ori
          informarea cu privire la modificări importante care afectează
          provocarea sau platforma. Notificările recurente privind actualizările
          campaniei sunt distincte de aceste comunicări și se gestionează prin
          preferințele de notificare disponibile în platformă.
        </p>
        <p>
          3.6. Prin acceptarea prezentelor T&amp;C pentru o anumită primărie din
          campanie, participantul activează implicit notificările recurente
          privind actualizările campaniei pentru primăria respectivă, inclusiv
          actualizări referitoare la corespondența pentru dezbaterea publică și
          alte etape relevante ale provocării. Aceste notificări pot fi
          dezactivate în orice moment din setările de notificare ale campaniei
          sau prin linkurile de dezabonare incluse în emailurile relevante.
        </p>

        <h2>4. Contul pe transparenta.eu</h2>
        <p>
          4.1. Utilizarea platformei transparenta.eu în contextul provocării se
          supune următoarelor politici:
        </p>
        <ul>
          <li>
            <a href="https://transparenta.eu/terms" rel="noreferrer" target="_blank">
              T&amp;C de utilizare și politica de confidențialitate ale platformei
              transparenta.eu
            </a>{' '}
            - aplicabile tuturor utilizatorilor înregistrați pe platformă;
          </li>
          <li>
            <a href="https://funky.ong/privacy-policy/" rel="noreferrer" target="_blank">
              Politica de confidențialitate a Funky Citizens
            </a>{' '}
            - aplicabilă participanților la Provocarea civică, care se
            completează cu prevederile art. 5 și urm., pentru scopurile de
            prelucrare specifice acesteia.
          </li>
        </ul>
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
        <ul>
          <li>verificarea și oferirea de feedback personalizat;</li>
          <li>
            documentarea impactului provocării și producerea de rapoarte
            agregate;
          </li>
          <li>îmbunătățirea resurselor educative și a platformei.</li>
        </ul>
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
          6.1. În contextul acestei provocări, participanții pot fi direcționați
          către forumul platformei transparenta.eu sau pot vedea componente de
          discuție integrate în acesta. Forumul este o componentă generală a
          platformei și poate fi utilizat atât pentru această provocare, cât și
          pentru alte campanii, lecții sau activități ale platformei.
        </p>
        <p>
          6.2. Accesul, publicarea, moderarea și prelucrarea datelor în cadrul
          forumului sunt guvernate de termenii de utilizare și politica de
          confidențialitate ale platformei transparenta.eu, precum și de regulile
          forumului aplicabile la nivelul platformei.
        </p>
        <p>
          6.3. Răspunsurile sau intervențiile echipei Funky Citizens în discuțiile
          asociate provocării au caracter informativ și civic. Moderarea
          conținutului forumului și administrarea conturilor de forum rămân
          supuse regulilor generale ale platformei.
        </p>
        <p>
          6.4. Utilizatorii pot posta folosind nickname-ul asociat contului lor
          de pe transparenta.eu sau pot activa modul anonim din setările
          profilului. În cazul în care este activat modul anonim, postarea apare
          fără nicio identificare vizibilă în interfața platformei față de
          ceilalți utilizatori și față de Funky Citizens. Identitatea
          utilizatorului rămâne însă stocată în baza de date a platformei și
          poate fi accesată de operatorul transparenta.eu în situații justificate
          (ex. încălcarea regulilor forumului, obligații legale).
        </p>
        <p>
          6.5. Toate postările sunt vizibile tuturor participanților înscriși.
          Răspunsurile oficiale ale echipei Funky Citizens sunt marcate distinct
          față de contribuțiile celorlalți utilizatori.
        </p>
        <p>
          6.6. Participanții sunt responsabili pentru conținutul postat pe forum.
          Este interzisă publicarea de:
        </p>
        <ul>
          <li>
            informații false sau calomnioase la adresa unor persoane sau
            instituții;
          </li>
          <li>date personale ale unor terți fără consimțământul acestora;</li>
          <li>
            conținut ofensator, discriminatoriu sau care încalcă legislația
            română în vigoare.
          </li>
        </ul>
        <p>
          6.7. Funky Citizens își rezervă dreptul de a elimina orice postare care
          încalcă regulile de mai sus și de a suspenda accesul participanților
          care le încalcă în mod repetat.
        </p>
        <p>
          6.8. Deținătorul platformei își rezervă dreptul de a modera conținutul
          cu ajutorul IA, caz în care vă rugăm să consultați T&amp;C al platformei
          transparenta.eu.
        </p>

        <h2>7. Provocările civice</h2>
        <p>7.1. Provocarea civică include opțiunea de a transmite:</p>
        <ul>
          <li>
            o cerere oficială de organizare a dezbaterii publice pe bugetul
            local, fie în numele propriei asociații, fie în numele Funky
            Citizens;
          </li>
          <li>o contestație la bugetul local, în nume propriu.</li>
        </ul>
        <p>
          7.2. Opțiunea de a trimite cererea prin platformă este condiționată de
          confirmarea expresă a participantului în fluxul relevant al formularului
          sau al mesajului pregătit. În funcție de opțiunea aleasă, platforma
          poate fie să pregătească mesajul pentru trimiterea din propriul client
          de email al participantului (adresa introdusă a asociației sau a
          utilizatorului), fie să transmită mesajul direct prin infrastructura
          platformei. Consimțământul manifestat astfel reprezintă acordul de
          prelucrare a datelor cu caracter personal conținute de cerere de către
          Funky Citizens sau de către transparenta.eu.
        </p>
        <p>
          7.3. În fluxurile în care mesajul este trimis de clientul propriu de
          email al participantului, platforma poate include o adresă de CC, un
          identificator de fir de corespondență (număr unic de înregistrare) sau
          alte elemente tehnice similare pentru a putea confirma trimiterea
          mesajului, a corela răspunsurile instituției și a urmări stadiul
          corespondenței. Dacă participantul păstrează aceste elemente în mesaj,
          transparenta.eu și/sau Funky Citizens pot primi și stoca o copie a
          mesajului trimis și a răspunsurilor aferente, precum și adresa cu care
          s-a trimis email-ul din partea asociației.
        </p>
        <p>
          7.4. Prin confirmarea acțiunii de corespondență prin apăsarea
          butonului &ldquo;Solicită trimiterea&rdquo;, participantul confirmă că:
        </p>
        <ul>
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
        </ul>
        <p>
          7.5. Funky Citizens nu răspunde pentru consecințele transmiterii unor
          date incorecte furnizate de participant în cadrul acestui formular.
        </p>
        <p>
          7.6. În administrarea provocării, transparenta.eu și/sau Funky Citizens
          pot utiliza instrumente automate, inclusiv instrumente bazate pe AI,
          pentru a sprijini procesarea documentelor, extragerea de informații,
          clasificarea, rezumarea, detectarea conținutului duplicat, moderarea,
          prioritizarea sau revizuirea materialelor trimise de participanți ori a
          documentelor publice analizate în cadrul provocării. Astfel de
          instrumente au rol de asistență și nu înlocuiesc, în mod necesar,
          verificarea sau decizia umană acolo unde aceasta este considerată
          necesară de operatorul relevant.
        </p>
        <p>
          7.7. Unele dintre instrumentele bazate pe AI utilizate în contextul
          provocării pot fi furnizate de terți. În funcție de furnizor, de
          configurarea serviciului și de termenii aplicabili acelui furnizor,
          materialele și output-urile transmise prin aceste funcționalități pot
          fi păstrate de furnizor și pot fi utilizate pentru îmbunătățirea
          serviciului, dezvoltarea modelului sau antrenare. Datele procesate de
          către AI aparținând unor terțe părți și se supun termenilor și
          condițiilor acestora. Prevederile art. 9 se aplică în mod
          corespunzător.
        </p>
        <p>
          7.8. Este interzisă utilizarea instrumentelor de corespondență ori a
          altor funcționalități ale provocării pentru spam, hărțuire, amenințări,
          doxing, intimidare, transmiterea abuzivă în masă de solicitări către
          instituții publice sau orice alt comportament ilegal ori abuziv. Funky
          Citizens și/sau transparenta.eu pot limita, suspenda, bloca, refuza sau
          raporta astfel de utilizări și pot păstra ori divulga date relevante
          atunci când legea o impune sau când acest lucru este rezonabil necesar
          pentru investigarea unor conduite ilegale ori abuzive.
        </p>

        <h2>8. Drepturile asupra materialelor produse</h2>
        <p>
          8.1. Materialele create de participanți (rezumate, postări, grafice,
          prezentări, contestații etc.) rămân în proprietatea autorilor.
        </p>
        <p>
          8.2. Prin participare, fiecare participant acordă transparenta.eu o
          licență neexclusivă și gratuită de a găzdui, stoca, reproduce, afișa,
          adapta și utiliza materialele respective în măsura necesară pentru
          operarea tehnică a platformei, securitate, moderare, suport, copii de
          siguranță, funcționare, îmbunătățire, dezvoltare, testare,
          documentare și promovare a platformei și a funcționalităților sale.
        </p>
        <p>
          8.3. Prin participare, fiecare participant acordă Funky Citizens o
          licență neexclusivă și gratuită, limitată la materialele legate de
          provocare, pentru utilizarea, reproducerea, republicarea și promovarea
          acestora exclusiv în scopuri legate de organizarea, administrarea,
          documentarea, raportarea, comunicarea publică și promovarea civică ori
          educativă a provocării și a activităților asociate acesteia.
        </p>
        <p>
          8.4. Dacă participantul alege să publice sau să distribuie materiale în
          mod public prin platformă, inclusiv pe forum sau prin alte
          funcționalități publice ale platformei, aceste materiale pot deveni
          accesibile publicului, pot fi indexate de motoarele de căutare și pot
          fi copiate sau redistribuite de terți.
        </p>
        <p>
          8.5. Participanții garantează că materialele produse sunt originale, nu
          încalcă drepturi ale terților și nu conțin informații false sau
          calomnioase.
        </p>

        <h2>9. Prelucrarea datelor cu caracter personal</h2>
        <p>
          9.1. Participarea la provocare presupune, în primul rând, crearea unui
          cont de utilizator pe platforma transparenta.eu. Nu există un flux de
          înregistrare separat dedicat exclusiv provocării. Utilizatorii
          transparenta.eu care aleg să devină participanți la provocare sunt
          supuși unui dublu nivel de reglementare, conform art. 4.1.
        </p>
        <p>
          9.2. În legătură cu datele prelucrate în contextul acestei provocări,
          transparenta.eu și Funky Citizens acționează ca operatori independenți,
          pentru scopuri distincte. Niciuna dintre părți nu acționează exclusiv în
          calitate de persoană împuternicită a celeilalte pentru toate
          prelucrările efectuate în cadrul provocării.
        </p>
        <p>
          9.3. Platforma transparenta.eu prelucrează datele participanților, în
          calitate de Operator, pentru scopuri care țin de funcționarea
          platformei, inclusiv: administrarea contului și autentificării;
          operarea platformei și a forumului; securitatea, prevenirea abuzurilor
          și păstrarea jurnalelor tehnice; administrarea infrastructurii de
          notificări și comunicări transmise prin platformă; gestionarea
          înregistrărilor tehnice privind participarea la provocare; precum și
          analizarea, dezvoltarea, testarea, îmbunătățirea și promovarea
          platformei și a funcționalităților sale, inclusiv prin reutilizarea
          datelor generate în contextul provocării, cu respectarea principiilor
          de minimizare a datelor și, după caz, în formă agregată sau anonimizată
          pentru utilizările publice.
        </p>
        <p>
          9.4. Funky Citizens prelucrează datele participanților, în calitate de
          operator, pentru scopuri care țin de organizarea și administrarea
          provocării, inclusiv: gestionarea participării în campanie; verificarea
          și evaluarea răspunsurilor; acordarea de feedback personalizat;
          comunicarea cu participanții în legătură cu campania; documentarea
          impactului provocării; realizarea de rapoarte, statistici și analize
          privind campania; și îmbunătățirea resurselor educative și civice
          dezvoltate de Funky Citizens.
        </p>
        <p>
          9.5. Datele relevante pentru participarea la provocare, menționate la
          pct. 9.6., pot fi comunicate între transparenta.eu și Funky Citizens în
          măsura necesară pentru scopurile proprii ale fiecărei părți descrise mai
          sus. Fiecare parte răspunde independent pentru legalitatea prelucrărilor
          pe care le efectuează în nume propriu, pentru informarea persoanelor
          vizate și pentru soluționarea cererilor privind drepturile aferente
          scopurilor proprii. În măsura în care o cerere vizează prelucrări
          efectuate de ambele părți, acestea vor coopera în mod rezonabil pentru
          soluționarea cererii.
        </p>
        <p>
          9.6. Categoriile de date personale prelucrate și scopurile aferente -
          următoarele categorii de date sunt prelucrate în măsura permisă de
          temeiurile juridice aplicabile, inclusiv consimțământul explicit al
          participantului atunci când acesta este necesar potrivit Regulamentului
          (UE) 2016/679 (RGPD):
        </p>
        <p>a) Date de identificare (email, nume/prenume sau username):</p>
        <ol type="i">
          <li>gestionarea contului de participant și comunicarea pe durata provocării;</li>
          <li>trimiterea de materiale informative relevante provocării;</li>
          <li>oferirea de feedback personalizat la provocările avansate.</li>
        </ol>
        <p>
          b) Date generate pe forum (întrebări, comentarii, postări, locația,
          adresa de email, username, fus orar):
        </p>
        <ol type="i">
          <li>facilitarea schimbului de informații între participanți;</li>
          <li>oferirea de sprijin din partea echipei Funky Citizens;</li>
          <li>combaterea spam, moderarea conținutului care încalcă T&amp;C de către AI.</li>
        </ol>
        <p>
          c) Date generate prin participarea la provocări (răspunsuri la
          quiz-uri, texte deschise, scoruri de transparență, link-uri către
          documente publice):
        </p>
        <ol type="i">
          <li>verificarea răspunsurilor și oferirea de feedback personalizat;</li>
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
            de timp prevăzută la art. 9.6.
          </li>
        </ol>
        <p>
          9.7. Datele cu caracter personal ale participanților nu vor fi vândute
          sau transmise unor terți în scop comercial. Platforma transparenta.eu
          și Funky Citizens pot accesa și utiliza categoriile de date enumerate
          mai sus numai în limitele scopurilor proprii descrise în prezentele
          T&amp;C și în politicile aplicabile.
        </p>
        <p>9.8. Operatorul garantează următoarele drepturi ale utilizatorilor:</p>
        <ul>
          <li>
            dreptul de acces (art. 15 GDPR) - persoana vizată are dreptul de a
            obține confirmarea că datele sale sunt sau nu sunt prelucrate și, în
            caz afirmativ, acces la datele respective, împreună cu toate
            informațiile prevăzute la Art. 15 alin. (1) lit. a)-h) GDPR. Prima
            copie a datelor se furnizează gratuit. Pentru copii suplimentare,
            Operatorul poate percepe un tarif rezonabil, bazat exclusiv pe
            costurile administrative, comunicat în prealabil persoanei vizate;
          </li>
          <li>
            dreptul la rectificare (art. 16 GDPR) - persoana vizată poate
            solicita rectificarea fără întârziere a datelor inexacte care o
            privesc. Luând în considerare scopurile prelucrării, persoana vizată
            are dreptul de a obține completarea datelor incomplete, inclusiv prin
            furnizarea unei declarații suplimentare;
          </li>
          <li>
            dreptul la ștergere („dreptul de a fi uitat”) (art. 17 GDPR) -
            Operatorul șterge datele cu caracter personal fără întârzieri
            nejustificate atunci când se aplică oricare dintre motivele enumerate
            exhaustiv la Art. 17 alin. (1) GDPR. Exercitarea acestui drept este
            exclusă în situațiile prevăzute la Art. 17 alin. (3) GDPR, Operatorul
            având obligația de a comunica motivul refuzului în scris, cu
            indicarea temeiului legal aplicabil;
          </li>
          <li>
            dreptul la restricționarea prelucrării (Art. 18 GDPR) Persoana
            vizată poate obține restricționarea prelucrării în oricare dintre
            următoarele situații:
            <ol type="i">
              <li>
                contestă exactitatea datelor, pe o perioadă care îi permite
                Operatorului să verifice exactitatea;
              </li>
              <li>
                prelucrarea este ilegală, iar persoana vizată se opune ștergerii,
                solicitând în schimb restricționarea;
              </li>
              <li>
                Operatorul nu mai are nevoie de date în scopul prelucrării, însă
                persoana vizată le solicită pentru constatarea, exercitarea sau
                apărarea unui drept în instanță;
              </li>
              <li>
                persoana vizată s-a opus prelucrării conform art. 21 GDPR, pentru
                intervalul de verificare a prevalenței motivelor legitime.
              </li>
            </ol>
          </li>
          <li>
            dreptul la portabilitatea datelor (art. 20 GDPR) - dreptul se
            exercită exclusiv față de datele furnizate de persoana vizată,
            prelucrate în baza consimțământului sau a unui contract, prin
            mijloace automate. Operatorul furnizează datele într-un format
            structurat, utilizat în mod curent și care poate fi citit automat. La
            solicitare explicită, Operatorul transmite datele direct către un alt
            operator, în măsura în care acest lucru este fezabil din punct de
            vedere tehnic.
          </li>
          <li>
            dreptul la opoziție (art. 21 GDPR) - persoana vizată se poate opune
            în orice moment prelucrării datelor sale în temeiul interesului
            legitim al Operatorului sau al unui terț (art. 6 alin. (1) lit. f)
            GDPR), inclusiv creării de profiluri. Operatorul încetează
            prelucrarea, cu excepția cazului în care demonstrează motive legitime
            și imperioase care prevalează asupra intereselor persoanei vizate.
            Opoziția față de prelucrarea în scop de marketing direct produce
            efecte imediate și absolute, fără posibilitate de derogare.
          </li>
          <li>
            dreptul de a nu face obiectul unei decizii automate (art. 22 GDPR) -
            persoana vizată are dreptul de a nu face obiectul unei decizii bazate
            exclusiv pe prelucrarea automată, inclusiv crearea de profiluri, care
            produce efecte juridice sau o afectează în mod similar semnificativ.
            Exceptările de la această regulă sunt limitate la situațiile
            prevăzute la art. 22 alin. (2) GDPR, cu respectarea garanțiilor
            minime obligatorii: dreptul de a obține o procesare efectuată de o
            persoană, de a-și exprima punctul de vedere și de a contesta decizia.
          </li>
          <li>
            dreptul de a retrage consimțământul (art. 7 alin. (3) GDPR) -
            retragerea consimțământului este posibilă în orice moment, prin
            aceeași facilitate prin care a fost acordat sau prin Canalul
            desemnat. Retragerea nu afectează legalitatea prelucrării anterioare.
            Operatorul nu condiționează retragerea de nicio formalitate excesivă.
          </li>
        </ul>
        <p>
          9.9. Exercitarea drepturilor prevăzute la art. 9.8. se realizează prin
          transmiterea unei solicitări scrise la adresa{' '}
          <a href="mailto:weare@funky.ong">weare@funky.ong</a>, în funcție de
          scopul prelucrării vizat de solicitare, pentru prelucrările efectuate
          de Funky Citizens. Pentru prelucrările la nivel de platformă,
          participanții se vor adresa direct platformei.
        </p>
        <p>
          9.10. Datele specifice provocării vor fi păstrate pe durata acesteia și
          maximum 3 ani ulterior, dacă utilizatorul nu își retrage consimțământul
          între timp, după care vor fi șterse, respectiv anonimizate în vederea
          raportării de date statistice.
        </p>
        <p>
          9.11. Participantul poate retrage oricând consimțământul pentru
          scopurile specifice provocării, fără a afecta legalitatea prelucrării
          anterioare și fără a-i afecta contul general pe transparenta.eu.
        </p>
        <p>
          9.12. Dacă considerați că prelucrarea datelor dumneavoastră cu caracter
          personal încalcă prevederile Regulamentului (UE) 2016/679 (RGPD), aveți
          dreptul de a depune o plângere la Autoritatea Națională de
          Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), cu
          sediul în Bd. Magheru nr. 28-30, sector 1, București, website:{' '}
          <a
            href="https://www.dataprotection.ro"
            rel="noreferrer"
            target="_blank"
          >
            www.dataprotection.ro
          </a>
          . Exercitarea acestui drept nu aduce atingere niciunei alte căi de
          atac administrative sau judiciare disponibile.
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
          Funky Citizens -{' '}
          <a href="mailto:weare@funky.ong">weare@funky.ong</a> |{' '}
          <a href="https://funky.ong" rel="noreferrer" target="_blank">
            funky.ong
          </a>
        </p>
      </div>
    </div>
  )
}
