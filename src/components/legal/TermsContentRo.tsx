import { Link } from '@tanstack/react-router'

export function TermsContentRo() {
  return (
    <div className="mx-auto w-full max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Termeni de utilizare</h1>
        <p className="text-sm text-muted-foreground">Data intrării în vigoare: 1 mai 2026 · Versiunea: 3.0</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Pe scurt</h2>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li>Doar în scop informativ; fără garanții.</li>
          <li>Proiect independent; fără afiliere guvernamentală.</li>
          <li>Exporturile trebuie să includă atribuirea sursei de date și Transparenta.eu.</li>
          <li>Conturi de utilizator opționale pentru funcții avansate precum buletine informative, notificări, acces la forum și cercetare AI.</li>
          <li>Forum comunitar pentru discuții civice, integrat cu contul dumneavoastră de pe platformă.</li>
          <li>Instrumente pentru a contacta instituțiile publice în numele dumneavoastră (opt-in, per acțiune).</li>
          <li>Funcții de cercetare bazate pe AI cu notificări proactive (opt-in).</li>
        </ul>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Ce s-a schimbat în versiunea 3.0</h2>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li>S-a adăugat secțiunea Forum Comunitar care acoperă integrarea Discourse și regulile forumului.</li>
          <li>S-a adăugat secțiunea Corespondență cu Instituțiile Publice pentru emailurile trimise prin platformă.</li>
          <li>S-a adăugat secțiunea Funcții bazate pe AI pentru notificări proactive de cercetare.</li>
          <li>S-au extins tipurile de notificări dincolo de rapoartele bugetare pentru a include actualizări ale platformei și alerte de campanie.</li>
          <li>S-au actualizat stocarea și păstrarea datelor pentru a acoperi datele de forum, corespondență și AI.</li>
          <li>S-a consolidat procedura de notificare pentru actualizări viitoare ale termenilor.</li>
        </ul>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <h3>Acceptare</h3>
        <p>Prin utilizarea Serviciului, sunteți de acord cu acești Termeni. Dacă nu sunteți de acord, vă rugăm să nu utilizați Serviciul.</p>
        <p>Utilizarea Serviciului este guvernată și de <Link to="/privacy" className="underline">Politica de confidențialitate</Link> și <Link to="/cookie-policy" className="underline">Politica de cookie-uri</Link>, care descriu modul în care prelucrăm datele personale, inclusiv jurnalele de securitate, datele de autentificare și preferințele dumneavoastră de comunicare.</p>

        <h3>Serviciul și sursele de date</h3>
        <p>Serviciul oferă instrumente pentru explorarea, analiza și vizualizarea datelor de execuție bugetară publică din România.</p>
        <ul>
          <li><strong>Fără afiliere guvernamentală:</strong> Transparenta.eu este un proiect independent și nu este afiliat cu, autorizat de, întreținut de, sponsorizat de sau susținut de nicio entitate guvernamentală din România.</li>
          <li><strong>Excluderea garanțiilor:</strong> Serviciul și toate datele, conținutul și vizualizările sunt furnizate „așa cum sunt" și „așa cum sunt disponibile", fără garanții de niciun fel, exprese sau implicite. Excludem în mod explicit toate garanțiile, inclusiv, dar fără a se limita la, garanțiile de comercializare, adecvare pentru un anumit scop, acuratețe, completitudine, actualitate, fiabilitate sau neîncălcare a drepturilor. Nu garantăm că Serviciul va fi neîntrerupt, fără erori sau securizat.</li>
          <li><strong>Acuratețea datelor nu este garantată:</strong> Datele financiare provin de la portaluri guvernamentale terțe. Nu creăm, verificăm sau audităm aceste date și nu suntem responsabili pentru eventualele erori, omisiuni sau inexactități pe care le pot conține. Recunoașteți că datele pot fi incomplete, neactualizate sau incorecte.</li>
        </ul>

        <h3>Conturi de utilizator și autentificare</h3>
        <ul>
          <li><strong>Conturi opționale:</strong> Conturile de utilizator sunt opționale. Puteți utiliza funcțiile de bază fără a crea un cont. Crearea unui cont permite funcții suplimentare precum buletine informative, notificări, preferințe salvate, acces la forum, instrumente de corespondență și cercetare bazată pe AI.</li>
          <li><strong>Crearea contului:</strong> Când creați un cont, vi se poate solicita furnizarea anumitor informații precum adresa de email și numele. Sunteți responsabil(ă) pentru păstrarea confidențialității credențialelor contului.</li>
          <li><strong>Autentificare prin terți:</strong> Utilizăm Clerk pentru serviciile de autentificare. Prin crearea unui cont, sunteți de acord și cu termenii de serviciu ai Clerk.</li>
          <li><strong>Cont unificat:</strong> Contul dumneavoastră oferă acces la toate funcțiile platformei, inclusiv forumul comunitar găzduit pe Discourse. Când accesați forumul, ID-ul de utilizator, adresa de email și numele afișat sunt partajate cu sistemul forumului prin autentificare unică (SSO). Forumul poate stoca date suplimentare precum postările, informațiile de profil și jurnalele de activitate.</li>
          <li><strong>Ștergerea contului:</strong> Puteți șterge contul oricând. Ștergerea contului va elimina și accesul la forum și orice date asociate forumului. Putem suspenda sau șterge conturile care încalcă acești Termeni sau legislația aplicabilă.</li>
        </ul>

        <h3>Notificări și comunicări</h3>
        <ul>
          <li><strong>Abonare:</strong> Dacă aveți un cont, vă puteți abona pentru a primi diverse tipuri de notificări. Toate tipurile de notificări sunt opt-in: trebuie să alegeți explicit să primiți fiecare tip de comunicare.</li>
          <li><strong>Rapoarte bugetare:</strong> Rapoarte lunare, trimestriale sau anuale privind execuția bugetară pentru entitățile pe care le urmăriți.</li>
          <li><strong>Actualizări de campanie:</strong> Notificări despre campaniile civice la care participați, inclusiv actualizări privind dezbaterile publice și etapele campaniei.</li>
          <li><strong>Actualizări platformă:</strong> Informații despre funcții noi, îmbunătățiri și modificări ale platformei. Aceasta este o categorie separată de opt-in.</li>
          <li><strong>Alerte de cercetare AI:</strong> Notificări despre rezultatele cercetării de la agenții AI care monitorizează entitățile pe care le urmăriți. Aceasta necesită consimțământ separat și explicit, așa cum este descris în secțiunea Funcții bazate pe AI.</li>
          <li><strong>Alerte de date:</strong> Notificări când sunt îndeplinite condiții specifice pentru seturile de date pe care le monitorizați, cum ar fi modificări semnificative în execuția bugetară sau disponibilitatea unor date noi.</li>
          <li><strong>Notificări forum:</strong> Forumul comunitar poate trimite notificări prin email pentru răspunsuri, mențiuni și rezumate periodice, pe baza preferințelor dumneavoastră de notificare din forum. Acestea sunt gestionate prin setările forumului.</li>
          <li><strong>Dezabonare:</strong> Vă puteți dezabona de la orice tip de notificare în orice moment prin linkul de dezabonare din orice email, prin preferințele de notificare, prin setările forumului sau contactându-ne.</li>
          <li><strong>Livrarea emailurilor:</strong> Folosim adresa dumneavoastră de email exclusiv pentru livrarea notificărilor la care v-ați abonat și pentru comunicări esențiale legate de cont. Nu vindem, închiriem sau partajăm adresa dumneavoastră de email cu terți în scopuri de marketing.</li>
          <li><strong>Consimțământ:</strong> Notificările neesențiale sunt trimise doar cu consimțământul dumneavoastră explicit. Puteți retrage consimțământul pentru orice tip de notificare în orice moment, fără a afecta accesul la cont sau alte abonamente la notificări.</li>
        </ul>

        <h3>Forum comunitar</h3>
        <ul>
          <li><strong>Acces la forum:</strong> Serviciul include un forum comunitar pentru discuții civice, găzduit pe o instanță Discourse auto-găzduită în Uniunea Europeană. Accesul la forum este disponibil utilizatorilor înregistrați care au acceptat acești Termeni.</li>
          <li><strong>Autentificare unică (SSO):</strong> Forumul utilizează contul dumneavoastră Transparenta.eu pentru autentificare prin DiscourseConnect SSO. Când accesați forumul, ID-ul de utilizator, adresa de email și numele afișat sunt transmise sistemului forumului. Forumul stochează aceste date împreună cu activitatea dumneavoastră pe forum, inclusiv postări, răspunsuri, informații de profil, istoric de citire și adrese IP în scopuri de moderare.</li>
          <li><strong>Postare anonimă:</strong> Puteți activa modul de postare anonimă din setările profilului de forum. Când este activ, postările dumneavoastră apar fără informații de identificare vizibile altor utilizatori sau administratorilor. Sistemul forumului păstrează o înregistrare tehnică a postărilor anonime exclusiv în scopuri de securitate și prevenire a abuzurilor.</li>
          <li><strong>Vizibilitate publică:</strong> Postările de pe forum sunt accesibile public fără cont. Prin postarea pe forum, recunoașteți că contribuțiile dumneavoastră (cu excepția postărilor anonime) sunt asociate cu numele afișat și sunt vizibile oricui pe internet.</li>
          <li><strong>Reguli de conținut:</strong> Sunteți responsabil(ă) pentru tot conținutul postat pe forum. Următorul conținut este interzis: afirmații false sau defăimătoare despre persoane sau instituții; date personale ale terților fără consimțământul acestora; conținut ofensator, discriminatoriu sau ilegal conform legislației române; spam, solicitări comerciale sau conținut în afara subiectului.</li>
          <li><strong>Moderare:</strong> Ne rezervăm dreptul de a elimina orice conținut care încalcă aceste reguli și de a suspenda sau întrerupe accesul la forum pentru utilizatorii care le încalcă în mod repetat. Deciziile de moderare sunt luate la discreția noastră.</li>
          <li><strong>Notificări email forum:</strong> Discourse are propriul sistem de notificări prin email pentru răspunsuri la subiecte, mențiuni și rezumate. Aceste notificări sunt gestionate prin setările profilului de forum și sunt separate de preferințele de notificare ale platformei.</li>
        </ul>

        <h3>Corespondența cu instituțiile publice</h3>
        <ul>
          <li><strong>Facilitarea emailurilor:</strong> Serviciul oferă instrumente pentru trimiterea de emailuri către instituțiile publice privind chestiuni bugetare. Când utilizați această funcție, platforma trimite emailul în numele dumneavoastră de la o adresă Transparenta.eu, cu identitatea dumneavoastră dezvăluită în corpul emailului.</li>
          <li><strong>Consimțământ per acțiune:</strong> Fiecare email trimis prin platformă necesită confirmarea dumneavoastră explicită înainte de trimitere. Platforma nu va trimite nicio corespondență fără aprobarea dumneavoastră activă pentru acel email specific.</li>
          <li><strong>Responsabilitatea utilizatorului:</strong> Sunteți singurul/singura responsabil(ă) pentru conținutul, acuratețea și legalitatea oricărei corespondențe trimise prin platformă. Platforma acționează ca facilitator tehnic și nu revizuiește, verifică sau susține conținutul corespondenței dumneavoastră.</li>
          <li><strong>Autorizare Funky Citizens:</strong> Pentru anumite corespondențe legate de campanie (cum ar fi cererile de dezbatere publică), puteți alege să trimiteți emailul sub umbrela Funky Citizens. Aceasta necesită consimțământ separat și explicit pentru fiecare email individual, furnizat printr-un checkbox dedicat în formularul de corespondență.</li>
          <li><strong>Păstrarea înregistrărilor:</strong> Platforma stochează înregistrări ale corespondenței trimise prin Serviciu, inclusiv instituția destinatară, data, subiectul și conținutul, pentru referința dumneavoastră și în scopuri de conformitate. Puteți solicita ștergerea acestor înregistrări oricând.</li>
          <li><strong>Fără consiliere juridică:</strong> Instrumentele și șabloanele de corespondență furnizate sunt doar în scop informativ și nu constituie consiliere juridică. Sunteți responsabil(ă) pentru asigurarea conformității corespondenței dumneavoastră cu legislația aplicabilă.</li>
        </ul>

        <h3>Funcții bazate pe AI</h3>
        <ul>
          <li><strong>Agenți de cercetare:</strong> Serviciul poate utiliza agenți bazați pe AI pentru a cerceta instituțiile publice și a analiza datele bugetare publice. Când optați pentru activare, agenții pot monitoriza proactiv entitățile pe care le urmăriți și vă pot notifica despre rezultatele cercetării.</li>
          <li><strong>Opt-in explicit necesar:</strong> Notificările proactive de cercetare AI necesită consimțământul dumneavoastră separat și explicit. Acest consimțământ este distinct de alte preferințe de notificare și poate fi retras oricând prin setările de notificări.</li>
          <li><strong>Date utilizate:</strong> Agenții AI procesează doar date disponibile public, inclusiv date privind execuția bugetară, înregistrări publice instituționale și alte surse de date deschise. Datele dumneavoastră personale nu sunt utilizate ca input pentru cercetarea AI.</li>
          <li><strong>Fără garanții:</strong> Rezultatele cercetării generate de AI sunt furnizate doar în scop informativ. Acestea pot conține erori, omisiuni sau inexactități. Trebuie să verificați independent toate rezultatele generate de AI înainte de a vă baza pe ele în orice scop.</li>
          <li><strong>Transparență:</strong> Conținutul generat de agenții AI este etichetat clar ca atare. Nu prezentăm conținutul generat de AI drept analiză realizată de oameni.</li>
        </ul>

        <h3>Monitorizarea securității și jurnale</h3>
        <ul>
          <li><strong>Jurnale de securitate:</strong> Pentru protejarea conturilor și a Serviciului, menținem jurnale de securitate de bază precum adresa IP, user agent, marca temporală și acțiunile (ex. autentificare, dezabonare) în conformitate cu Politica de confidențialitate.</li>
          <li><strong>Păstrare limitată:</strong> Jurnalele de securitate sunt păstrate doar pentru o perioadă limitată pentru a detecta și preveni abuzurile, a depana problemele și a asigura fiabilitatea.</li>
        </ul>

        <h3>Responsabilitățile utilizatorului și asumarea riscului</h3>
        <ul>
          <li><strong>Asumarea integrală a riscului:</strong> Utilizarea Serviciului și bazarea pe orice informație sau vizualizare furnizată se face în întregime pe riscul dumneavoastră. Sunteți singurul/singura responsabil(ă) pentru orice decizii luate sau acțiuni întreprinse pe baza acestor informații.</li>
          <li><strong>Obligația de verificare:</strong> Sunteți singurul/singura responsabil(ă) pentru verificarea independentă a tuturor informațiilor față de sursele oficiale originale înainte de a le utiliza în orice scop, inclusiv, dar fără a se limita la, scopuri jurnalistice, academice, financiare sau juridice. Conținutul de pe acest site este doar în scop informativ general și nu constituie sfat profesional, financiar sau juridic.</li>
          <li><strong>Utilizare legală:</strong> Sunteți de acord să utilizați Serviciul doar în scopuri legale și într-un mod care nu dăunează Serviciului sau utilizatorilor săi. Nu trebuie să eliminați sau să ascundeți notificările de atribuire de pe conținutul exportat.</li>
          <li><strong>Informații corecte:</strong> Dacă creați un cont, sunteți de acord să furnizați informații corecte și actuale și să mențineți informațiile contului actualizate.</li>
        </ul>

        <h3>Proprietate intelectuală</h3>
        <ul>
          <li>Datele deschise urmează licența sursei.</li>
          <li>Adnotările utilizatorului create local rămân ale dumneavoastră.</li>
          <li>Software-ul, designul și conținutul original al Serviciului sunt protejate de drepturile de autor și alte legi privind proprietatea intelectuală.</li>
        </ul>

        <h3>Exporturi și atribuire</h3>
        <p>Includeți atribuirea vizibilă a sursei de date și Transparenta.eu când partajați grafice/hărți.</p>
        <blockquote>
          <p><strong>Recomandat:</strong> Grafic: „Titlul Graficului" | Sursa: Ministerul Finanțelor, via Transparenta.eu.</p>
        </blockquote>

        <h3>Stocarea și păstrarea datelor</h3>
        <ul>
          <li><strong>Date de cont:</strong> Când creați un cont, stocăm ID-ul de utilizator, numele, adresa de email și preferințele de notificare atâta timp cât contul dumneavoastră este activ.</li>
          <li><strong>Abonamente la notificări:</strong> Stocăm preferințele de abonare la notificări, inclusiv entitățile pe care le urmăriți și tipurile de actualizări pe care doriți să le primiți.</li>
          <li><strong>Date forum:</strong> Forumul stochează postările, informațiile de profil, istoricul de citire și jurnalele de activitate atâta timp cât contul dumneavoastră este activ. Datele forumului sunt șterse când vă ștergeți contul.</li>
          <li><strong>Înregistrări de corespondență:</strong> Înregistrările emailurilor trimise către instituțiile publice prin platformă sunt păstrate timp de 5 ani pentru conformitatea cu cerințele de arhivare românești pentru corespondența oficială, cu excepția cazului în care solicitați ștergerea anticipată.</li>
          <li><strong>Date de cercetare AI:</strong> Rezultatele de la agenții de cercetare AI sunt păstrate timp de 1 an, după care sunt șterse automat, cu excepția cazului în care solicitați ștergerea anticipată.</li>
          <li><strong>Ștergere:</strong> Puteți solicita ștergerea contului și a tuturor datelor asociate oricând contactându-ne sau utilizând funcțiile de ștergere a contului, când sunt disponibile.</li>
        </ul>

        <h3>Limitarea răspunderii</h3>
        <p>În măsura maximă permisă de legislația aplicabilă, Claudiu Constantin Bogdan și orice proprietari, contribuitori și afiliați nu vor fi responsabili pentru niciun fel de daune directe, indirecte, incidentale, speciale, consecvente sau exemplare, inclusiv, dar fără a se limita la, daune pentru pierderea profitului, veniturilor, datelor, fondului comercial sau alte pierderi intangibile, rezultate din: (i) accesul dumneavoastră la, utilizarea sau imposibilitatea de a utiliza Serviciul; (ii) bazarea pe datele, conținutul sau vizualizările prezentate de Serviciu, indiferent de eventualele erori, omisiuni sau inexactități conținute; (iii) orice pierdere sau daună financiară, profesională, personală sau de altă natură suferită ca urmare a utilizării informațiilor din Serviciu; sau (iv) orice acces neautorizat la sau utilizare a serverelor noastre și a oricăror informații personale stocate în acestea. Această limitare se aplică indiferent dacă răspunderea pretinsă se bazează pe contract, delict, neglijență, răspundere strictă sau orice altă bază, chiar dacă am fost informați despre posibilitatea unor astfel de daune. Singurul și exclusivul dumneavoastră remediu pentru orice dispută cu noi este să încetați utilizarea Serviciului.</p>

        <h3>Disponibilitate și modificări</h3>
        <p>Putem modifica sau întrerupe Serviciul în orice moment. Putem actualiza acești Termeni periodic pentru a reflecta schimbări în practicile noastre, funcții noi sau cerințe legale.</p>
        <ul>
          <li><strong>Notificarea modificărilor:</strong> Pentru modificări substanțiale ale acestor Termeni, vom furniza un preaviz de cel puțin 30 de zile prin publicarea Termenilor actualizați cu data viitoare de intrare în vigoare și trimiterea unei notificări prin email către utilizatorii înregistrați.</li>
          <li><strong>Acceptarea Termenilor actualizați:</strong> După data intrării în vigoare a Termenilor actualizați, vi se va solicita să revizuiți și să acceptați modificările la următoarea autentificare. Utilizarea continuă a Serviciului după acceptarea Termenilor actualizați constituie acordul dumneavoastră cu modificările.</li>
          <li><strong>Istoricul versiunilor:</strong> Versiunile anterioare ale acestor Termeni sunt disponibile la cerere, contactându-ne la contact@transparenta.eu.</li>
        </ul>

        <h3>Legea aplicabilă</h3>
        <p>Legea română și legislația UE aplicabilă, inclusiv RGPD. Competență: Sibiu, România.</p>

        <h3>Contact</h3>
        <p>Contactați-ne la contact@transparenta.eu. Consultați și <Link to="/privacy" className="underline">Politica de confidențialitate</Link> și <Link to="/cookie-policy" className="underline">Politica de cookie-uri</Link>.</p>
      </div>
    </div>
  )
}
