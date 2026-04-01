export function PrivacyContentRo() {
  return (
    <div className="mx-auto w-full max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Politica de confidențialitate</h1>
        <p className="text-sm text-muted-foreground">Data intrării în vigoare: 1 mai 2026 · Versiunea: 3.0</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Pe scurt</h2>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li>Local-first: graficele și preferințele sunt stocate în browserul dumneavoastră.</li>
          <li>Conturi de utilizator opționale pentru buletine informative, notificări, acces la forum și cercetare AI.</li>
          <li>Forum comunitar integrat cu contul dumneavoastră; datele forumului stocate în UE.</li>
          <li>Instrumentele de corespondență trimit emailuri de la o adresă a platformei în numele dumneavoastră.</li>
          <li>Funcțiile de cercetare AI procesează doar date publice (opt-in).</li>
          <li>Analiză și raportare îmbunătățită a erorilor doar cu consimțământul dumneavoastră.</li>
          <li>Nu vindem date personale.</li>
          <li>Jurnalele de securitate de bază sunt păstrate pe o perioadă scurtă pentru protejarea conturilor.</li>
        </ul>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Ce s-a schimbat în versiunea 3.0</h2>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li>S-au adăugat informări privind colectarea și prelucrarea datelor de forum (integrarea Discourse).</li>
          <li>S-a adăugat colectarea datelor de corespondență pentru emailurile trimise prin platformă către instituții.</li>
          <li>S-au adăugat informări privind prelucrarea datelor de cercetare AI.</li>
          <li>S-a adăugat Discourse ca sub-operator de date.</li>
          <li>S-a extins consimțământul pentru notificări pentru a acoperi toate tipurile noi de notificări.</li>
          <li>S-a actualizat programul de păstrare a datelor pentru datele de forum, corespondență și AI.</li>
          <li>S-a consolidat procedura de notificare pentru modificări substanțiale ale politicii.</li>
        </ul>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <h3>Cine suntem</h3>
        <p>Operator: Claudiu Constantin Bogdan, persoana fizică. Contact: contact@transparenta.eu</p>
        <p>Pentru prelucrarea datelor specifice campaniilor (cum ar fi provocarea civică „Cu ochii pe bugetele locale"), Funky Citizens acționează în calitate de operator de date, iar Transparenta.eu acționează în calitate de persoană împuternicită conform unui acord de prelucrare a datelor în baza Articolului 28 RGPD. Consultați termenii și condițiile specifice campaniei pentru detalii.</p>

        <h3>Ce date personale colectăm</h3>
        <p>Colectăm diferite tipuri de informații în funcție de modul în care utilizați Serviciul nostru:</p>

        <h4>Date colectate fără cont:</h4>
        <ul>
          <li><strong>Date tehnice esențiale:</strong> Tipul browserului, tipul dispozitivului, adresa IP (anonimizată) și locația generală (nivel de țară) pentru securitate și furnizarea serviciului (interese legitime conform RGPD Art. 6(1)(f)).</li>
          <li><strong>Preferințe de consimțământ:</strong> Alegerile dumneavoastră privind cookie-urile și analiza, stocate în localStorage-ul browserului.</li>
          <li><strong>Date din LocalStorage:</strong> Grafice, adnotări, filtre și preferințe stocate local în browserul dumneavoastră. Aceste date nu părăsesc dispozitivul dumneavoastră decât dacă le exportați explicit.</li>
          <li><strong>Analiză utilizare (opt-in):</strong> Dacă consimțiți, colectăm evenimente de utilizare personalizate prin PostHog pentru a înțelege cum sunt utilizate funcțiile. Fără capturare automată sau înregistrări de sesiuni.</li>
          <li><strong>Rapoarte de erori (opt-in):</strong> Dacă consimțiți, context îmbunătățit de erori prin Sentry pentru a ne ajuta să remediem problemele. Fără consimțământ, se colectează doar telemetrie minimală de erori.</li>
          <li><strong>Jurnale de acces server:</strong> Adresa IP, user agent, URL-ul solicitat, referrer și marca temporală pentru detectarea abuzurilor, asigurarea fiabilității și securizarea Serviciului (interese legitime conform RGPD Art. 6(1)(f)).</li>
        </ul>

        <h4>Date colectate cu un cont:</h4>
        <ul>
          <li><strong>Informații cont:</strong> ID utilizator (atribuit de Clerk), adresă de email, prenume, nume de familie. Temei juridic: RGPD Art. 6(1)(b) (executarea contractului) și Art. 6(1)(a) (consimțământ pentru notificări).</li>
          <li><strong>Date de autentificare:</strong> Marca temporală a autentificării, adresa IP de autentificare, detalii dispozitiv (ex. user agent), jetoane de autentificare (gestionate de Clerk) și informații de sesiune pentru securitatea contului.</li>
          <li><strong>Preferințe de notificare:</strong> Alegerile dumneavoastră de abonare pentru toate tipurile de notificări (rapoarte bugetare, actualizări campanie, actualizări platformă, alerte cercetare AI, alerte date), inclusiv entitățile pe care le urmăriți și tipurile de notificări pe care le-ați activat.</li>
          <li><strong>Istoric notificări:</strong> Înregistrări ale notificărilor trimise către dumneavoastră, inclusiv starea livrării și acțiunile de dezabonare, pentru conformitate și optimizarea livrării.</li>
          <li><strong>Înregistrări de acceptare a termenilor:</strong> Versiunea Termenilor de utilizare și a Politicii de confidențialitate pe care ați acceptat-o, marca temporală a acceptării și metadatele asociate, pentru conformitatea cu cerințele Art. 7(1) RGPD de a demonstra consimțământul.</li>
        </ul>

        <h4>Date colectate prin forum:</h4>
        <ul>
          <li><strong>Profil forum:</strong> ID-ul de utilizator, adresa de email și numele afișat sunt transmise forumului Discourse prin DiscourseConnect SSO când accesați forumul. Forumul poate stoca informații suplimentare de profil pe care alegeți să le furnizați.</li>
          <li><strong>Activitate forum:</strong> Postări, răspunsuri, aprecieri, marcaje, istoric de citire, preferințe de urmărire a subiectelor și metrici de participare. Aceste date sunt stocate de sistemul forumului Discourse.</li>
          <li><strong>Date de moderare forum:</strong> Adrese IP, user agent și marca temporală asociate acțiunilor pe forum, păstrate pentru moderarea conținutului și prevenirea abuzurilor (interese legitime conform RGPD Art. 6(1)(f)).</li>
          <li><strong>Notificări forum:</strong> Preferințele dumneavoastră de notificare din forum (rezumate email, notificări de răspuns, alerte de mențiune) sunt gestionate în sistemul Discourse separat de preferințele de notificare ale platformei.</li>
        </ul>

        <h4>Date colectate prin instrumentele de corespondență:</h4>
        <ul>
          <li><strong>Înregistrări de corespondență:</strong> Când trimiteți un email către o instituție publică prin platformă, stocăm instituția destinatară, data, subiectul, conținutul emailului și starea livrării. Temei juridic: RGPD Art. 6(1)(b) (executarea contractului, deoarece ați solicitat serviciul) și Art. 6(1)(f) (interese legitime pentru păstrarea înregistrărilor de conformitate).</li>
          <li><strong>Informații expeditor:</strong> Numele dumneavoastră și, după caz, autorizația de a trimite sub umbrela Funky Citizens. Aceste informații sunt dezvăluite instituției destinatare în corpul emailului.</li>
        </ul>

        <h4>Date colectate prin funcțiile bazate pe AI:</h4>
        <ul>
          <li><strong>Preferințe cercetare AI:</strong> Entitățile pentru care ați optat să fie monitorizate de agenții de cercetare AI și preferințele dumneavoastră de configurare a alertelor. Temei juridic: RGPD Art. 6(1)(a) (consimțământ explicit).</li>
          <li><strong>Rezultate cercetare AI:</strong> Rezultatele generate de agenții AI pentru entitățile pe care le urmăriți. Acestea sunt derivate exclusiv din date disponibile public și nu conțin datele dumneavoastră personale ca input.</li>
        </ul>

        <h3>Cum folosim datele dumneavoastră</h3>
        <ul>
          <li><strong>Furnizarea serviciului:</strong> Pentru a opera Serviciul, a furniza vizualizări și a asigura securitatea platformei (interese legitime, RGPD Art. 6(1)(f)).</li>
          <li><strong>Gestionarea contului:</strong> Pentru a crea și menține contul dumneavoastră, a autentifica accesul și a furniza asistență legată de cont (executarea contractului, RGPD Art. 6(1)(b)).</li>
          <li><strong>Livrarea notificărilor:</strong> Pentru a vă trimite actualizări privind execuția bugetară, notificări de campanie, actualizări ale platformei, alerte de cercetare AI și alerte de date la care v-ați abonat explicit (consimțământ, RGPD Art. 6(1)(a)). Puteți retrage consimțământul și vă puteți dezabona oricând.</li>
          <li><strong>Operarea forumului:</strong> Pentru a opera forumul comunitar, a autentifica accesul dumneavoastră prin SSO, a afișa contribuțiile și a modera conținutul (executarea contractului, RGPD Art. 6(1)(b), și interese legitime, RGPD Art. 6(1)(f)).</li>
          <li><strong>Facilitarea corespondenței:</strong> Pentru a trimite emailuri către instituțiile publice în numele dumneavoastră când utilizați instrumentele de corespondență (executarea contractului, RGPD Art. 6(1)(b), deoarece ați inițiat acțiunea).</li>
          <li><strong>Cercetare AI:</strong> Pentru a efectua cercetare proactivă bazată pe AI asupra entităților pe care le urmăriți și a vă livra rezultatele cercetării (consimțământ, RGPD Art. 6(1)(a)).</li>
          <li><strong>Comunicare:</strong> Pentru a trimite comunicări esențiale legate de cont (ex. alerte de securitate, actualizări ale termenilor) necesare pentru executarea contractului și interese legitime.</li>
          <li><strong>Analiză și îmbunătățire:</strong> Cu consimțământul dumneavoastră, pentru a înțelege tiparele de utilizare și a îmbunătăți Serviciul (consimțământ, RGPD Art. 6(1)(a)).</li>
          <li><strong>Detectarea și rezolvarea erorilor:</strong> Cu consimțământul dumneavoastră, pentru a identifica și remedia problemele tehnice (consimțământ, RGPD Art. 6(1)(a)).</li>
        </ul>

        <h3>Temeiurile juridice pentru prelucrare</h3>
        <ul>
          <li><strong>Interese legitime (Art. 6(1)(f)):</strong> Operarea și securizarea Serviciului, prevenirea fraudei și abuzurilor, moderarea forumului, păstrarea înregistrărilor de conformitate pentru corespondență.</li>
          <li><strong>Executarea contractului (Art. 6(1)(b)):</strong> Furnizarea funcțiilor de cont și a serviciilor pe care le-ați solicitat, inclusiv accesul la forum și trimiterea corespondenței.</li>
          <li><strong>Consimțământ (Art. 6(1)(a)):</strong> Abonamente la rapoarte bugetare, notificări de actualizare campanie, notificări de actualizare platformă, alerte de cercetare AI, alerte de date, rezumate email forum, analiză și raportare îmbunătățită a erorilor. Puteți retrage consimțământul oricând.</li>
          <li><strong>Obligații legale (Art. 6(1)(c)):</strong> Conformitatea cu legislația și reglementările aplicabile, inclusiv cerințele de arhivare a corespondenței.</li>
        </ul>

        <h3>Consimțământul pentru notificări și comunicări</h3>
        <ul>
          <li><strong>Opt-in granular:</strong> Fiecare tip de notificare este opt-in separat. Vă trimitem un anumit tip de notificare doar dacă vă abonați explicit la acesta. Nu vi se cere niciodată să vă abonați la vreun tip de notificare pentru a utiliza Serviciul.</li>
          <li><strong>Categorii de notificări:</strong> Rapoarte bugetare (lunare, trimestriale, anuale) pentru entitățile pe care le urmăriți. Actualizări de campanie pentru campaniile la care participați. Actualizări ale platformei despre funcții noi și modificări. Alerte de cercetare AI pentru rezultatele proactive ale agenților. Alerte de date pentru monitorizarea condițiilor seturilor de date. Notificări forum pentru răspunsuri, mențiuni și rezumate (gestionate prin setările forumului).</li>
          <li><strong>Dezabonare:</strong> Vă puteți dezabona de la orice tip de notificare în orice moment prin click pe linkul de dezabonare din orice email, prin gestionarea preferințelor din setările contului sau ale forumului, sau contactându-ne la contact@transparenta.eu.</li>
          <li><strong>Fără consimțământ cumulat:</strong> Nu condiționăm accesul la Serviciu sau la vreo funcție de acceptarea tuturor tipurilor de notificări. Fiecare consimțământ este independent.</li>
          <li><strong>Fără marketing:</strong> Nu trimitem emailuri promoționale sau de marketing. Toate comunicările sunt actualizări informative pe care le-ați solicitat sau comunicări esențiale legate de cont.</li>
          <li><strong>Fără partajare:</strong> Nu vindem, închiriem sau partajăm niciodată adresa dumneavoastră de email cu terți în scopuri de marketing.</li>
        </ul>

        <h3>Sursele de date și licențiere</h3>
        <p>Informații din sectorul public de la Ministerul Finanțelor. Fără afiliere guvernamentală.</p>

        <h3>Partajarea datelor și operatorii</h3>
        <p>Partajăm date cu următorii furnizori de servicii de încredere care prelucrează datele în numele nostru:</p>
        <ul>
          <li><strong>Clerk (Autentificare):</strong> Gestionează autentificarea utilizatorilor și datele de cont. UE/SUA cu clauze contractuale standard.</li>
          <li><strong>Discourse (Forum comunitar):</strong> Instanță Discourse auto-găzduită în Uniunea Europeană. Prelucrează datele de profil forum, postările și activitatea prin DiscourseConnect SSO. Datele rămân în UE.</li>
          <li><strong>PostHog (Analiză):</strong> Prelucrează analiza utilizării dacă consimțiți. Opțiune de găzduire în UE disponibilă.</li>
          <li><strong>Sentry (Raportare erori):</strong> Prelucrează jurnalele de erori dacă consimțiți. Prioritate UE cu controale de rezidență a datelor.</li>
          <li><strong>Furnizor de servicii email:</strong> Livrează notificări, buletine informative și emailurile de corespondență pe care le-ați inițiat.</li>
          <li><strong>Furnizori de găzduire:</strong> Stochează și servesc datele aplicației și bazele de date în UE.</li>
        </ul>
        <p>Toți operatorii sunt obligați prin acorduri de protecție a datelor și garanții conforme cu RGPD, inclusiv clauze contractuale standard pentru transferurile internaționale, după caz.</p>
        <p>Când trimiteți corespondență către o instituție publică prin platformă, conținutul emailului (inclusiv numele dumneavoastră, identificat în corpul emailului) este transmis instituției destinatare. Instituțiile publice sunt operatori de date independenți pentru orice date personale pe care le primesc.</p>

        <h3>Păstrarea datelor</h3>
        <ul>
          <li><strong>LocalStorage:</strong> Stocate în browserul dumneavoastră până când le ștergeți manual.</li>
          <li><strong>Date de cont:</strong> Păstrate atâta timp cât contul dumneavoastră este activ sau atât cât este necesar pentru furnizarea serviciilor. Șterse în termen de 90 de zile de la cererea de ștergere a contului.</li>
          <li><strong>Abonamente la notificări:</strong> Păstrate cât sunt active. Șterse soft (marcate inactive) când vă dezabonați, cu ștergere completă după 1 an pentru conformitate și scopuri anti-spam.</li>
          <li><strong>Înregistrări de livrare a buletinelor și notificărilor:</strong> Păstrate timp de 2 ani pentru depanarea livrării și conformitate.</li>
          <li><strong>Înregistrări de acceptare a termenilor:</strong> Păstrate pe durata contului dumneavoastră și timp de 3 ani după ștergerea contului în scopuri de conformitate.</li>
          <li><strong>Date forum:</strong> Păstrate cât timp contul dumneavoastră este activ. Postările și datele de profil sunt șterse în termen de 90 de zile de la ștergerea contului. Postările anonime sunt păstrate fără nicio legătură cu identitatea dumneavoastră.</li>
          <li><strong>Înregistrări de corespondență:</strong> Păstrate timp de 5 ani pentru conformitatea cu cerințele de arhivare românești pentru corespondența oficială. Puteți solicita ștergerea anticipată contactându-ne.</li>
          <li><strong>Rezultate cercetare AI:</strong> Păstrate timp de 1 an, apoi șterse automat. Puteți solicita ștergerea anticipată oricând.</li>
          <li><strong>Date de analiză:</strong> Păstrate timp de 12 luni, apoi șterse automat sau anonimizate.</li>
          <li><strong>Jurnale de erori:</strong> Păstrate timp de 90 de zile pentru depanare, apoi șterse automat.</li>
          <li><strong>Jurnale de acces server:</strong> Păstrate până la 90 de zile pentru securitate și fiabilitate, apoi șterse automat.</li>
        </ul>

        <h3>Drepturile dumneavoastră conform RGPD</h3>
        <p>Ca persoană vizată conform RGPD, aveți următoarele drepturi:</p>
        <ul>
          <li><strong>Dreptul de acces (Art. 15):</strong> Solicitați o copie a datelor personale pe care le deținem despre dumneavoastră, inclusiv datele stocate în sistemul forumului.</li>
          <li><strong>Dreptul la rectificare (Art. 16):</strong> Solicitați corectarea datelor personale inexacte.</li>
          <li><strong>Dreptul la ștergere (Art. 17):</strong> Solicitați ștergerea datelor dumneavoastră personale („dreptul de a fi uitat"), inclusiv datele forumului și înregistrările de corespondență.</li>
          <li><strong>Dreptul la restricționare (Art. 18):</strong> Solicitați limitarea prelucrării în anumite circumstanțe.</li>
          <li><strong>Dreptul la portabilitatea datelor (Art. 20):</strong> Primiți datele dumneavoastră într-un format structurat, ușor de citit automat, inclusiv postările de pe forum și înregistrările de corespondență.</li>
          <li><strong>Dreptul la opoziție (Art. 21):</strong> Opuneți-vă prelucrării bazate pe interese legitime, inclusiv prelucrării datelor de moderare a forumului.</li>
          <li><strong>Dreptul de retragere a consimțământului (Art. 7(3)):</strong> Retrageți consimțământul pentru orice tip de notificare, cercetare AI, analiză sau raportare a erorilor în orice moment, fără a afecta legalitatea prelucrării anterioare retragerii.</li>
          <li><strong>Dreptul de a depune o plângere:</strong> Depuneți o plângere la autoritatea de supraveghere din România (ANSPDCP) la anspdcp.ro.</li>
        </ul>
        <p>Pentru a exercita oricare dintre aceste drepturi, contactați-ne la contact@transparenta.eu. Vom răspunde în termen de 30 de zile. Pentru drepturile legate de datele specifice campaniei prelucrate de Funky Citizens, contactați weare@funky.ong.</p>

        <h3>Securitatea datelor</h3>
        <ul>
          <li><strong>Criptare:</strong> Datele în tranzit sunt criptate folosind TLS/SSL. Datele stocate sunt criptate în bazele noastre de date.</li>
          <li><strong>Controale de acces:</strong> Controale stricte de acces limitează accesul la datele personale doar la personalul autorizat.</li>
          <li><strong>Autentificare:</strong> Accesul la cont securizat prin Clerk cu practici de securitate standard din industrie.</li>
          <li><strong>Securitate forum:</strong> Instanța forumului Discourse este auto-găzduită în UE cu actualizări regulate de securitate și controale de acces.</li>
          <li><strong>Monitorizare:</strong> Monitorizare de securitate și jurnalizare pentru detectarea și răspunsul la potențiale breșe.</li>
        </ul>

        <h3>Transferuri internaționale de date</h3>
        <p>Unii furnizori de servicii pot prelucra date în afara UE/SEE. Toate transferurile sunt protejate prin garanții adecvate, inclusiv:</p>
        <ul>
          <li>Clauze contractuale standard (CCS) aprobate de Comisia Europeană</li>
          <li>Decizii de adecvare, după caz</li>
          <li>Măsuri tehnice și organizatorice suplimentare</li>
        </ul>
        <p>Instanța forumului Discourse este găzduită integral în UE. Nicio dată de forum nu este transferată în afara UE/SEE.</p>

        <h3>Luarea automată a deciziilor</h3>
        <p>Nu utilizăm luarea automată a deciziilor sau profilarea care produce efecte juridice sau vă afectează în mod similar semnificativ. Agenții de cercetare AI furnizează doar rezultate informative și nu iau decizii despre sau în numele utilizatorilor.</p>

        <h3>Confidențialitatea copiilor</h3>
        <p>Serviciul nu se adresează copiilor sub 16 ani. Nu colectăm cu bună știință date personale de la copii sub 16 ani. Dacă credeți că am colectat date de la un copil sub 16 ani, vă rugăm să ne contactați imediat.</p>

        <h3>Modificări ale acestei politici</h3>
        <p>Putem actualiza această Politică de confidențialitate periodic pentru a reflecta schimbări în practicile noastre, funcții noi sau cerințe legale.</p>
        <ul>
          <li><strong>Notificarea modificărilor substanțiale:</strong> Pentru modificări substanțiale, vom furniza un preaviz de cel puțin 30 de zile prin publicarea politicii actualizate cu data viitoare de intrare în vigoare și trimiterea unei notificări prin email către titularii de conturi înregistrați.</li>
          <li><strong>Acceptare în aplicație:</strong> După data intrării în vigoare, vi se va solicita să revizuiți și să confirmați politica actualizată la următoarea autentificare.</li>
          <li><strong>Istoricul versiunilor:</strong> Versiunile anterioare ale acestei politici sunt disponibile la cerere, contactându-ne la contact@transparenta.eu.</li>
        </ul>

        <h3>Contact și responsabilul cu protecția datelor</h3>
        <p>Pentru întrebări despre această Politică de confidențialitate, pentru exercitarea drepturilor dumneavoastră sau pentru a contacta responsabilul nostru cu protecția datelor, scrieți-ne la contact@transparenta.eu</p>

        <h3>Autoritatea de supraveghere</h3>
        <p>Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), B-dul G-ral. Gheorghe Magheru 28-30, Sector 1, București, România. Website: anspdcp.ro</p>
      </div>
    </div>
  )
}
