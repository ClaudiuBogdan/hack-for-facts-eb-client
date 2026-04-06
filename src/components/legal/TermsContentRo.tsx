import { Link } from '@tanstack/react-router'

export function TermsContentRo() {
  return (
    <div className="mx-auto w-full max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Termeni de utilizare</h1>
        <p className="text-sm text-muted-foreground">Data intrării în vigoare: 6 aprilie 2026 · Versiunea: 3.0</p>
        <p className="text-sm text-muted-foreground">Furnizor: Claudiu Constantin Bogdan, operator individual al Transparenta.eu. Contact: contact@transparenta.eu</p>
      </div>

        <div className="space-y-2">
          <h2 className="text-lg font-medium">Pe scurt</h2>
          <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
            <li>Doar în scop informativ; fără garanții.</li>
            <li>Proiect independent; fără afiliere guvernamentală.</li>
            <li>Când partajați grafice, hărți sau alte rezultate vizuale generate prin Serviciu, includeți o atribuire vizibilă a sursei de date și a Transparenta.eu.</li>
            <li>Conturi de utilizator opționale pentru funcții avansate precum buletine informative, notificări, acces la forum și cercetare AI.</li>
            <li>Forum comunitar pentru discuții civice, integrat cu contul dumneavoastră de pe platformă.</li>
            <li>Instrumente pentru a contacta instituțiile publice în numele dumneavoastră (opt-in, per acțiune).</li>
            <li>Funcții îmbunătățite cu AI sau experimentale pot ajuta la analiza datelor publice, procesarea documentelor, rezumare, extragere și cercetare (unele pe bază de opt-in).</li>
          </ul>
        </div>

      <div className="space-y-2">
          <h2 className="text-lg font-medium">Ce s-a schimbat în versiunea 3.1</h2>
          <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
            <li>S-a adăugat secțiunea Forum Comunitar care acoperă integrarea Discourse și regulile forumului.</li>
            <li>S-a adăugat secțiunea Corespondență cu Instituțiile Publice pentru emailurile trimise prin platformă.</li>
            <li>S-a extins secțiunea Funcții bazate pe AI pentru a acoperi funcționalități îmbunătățite cu AI sau experimentale, inclusiv procesarea datelor publice și a documentelor.</li>
            <li>S-au extins tipurile de notificări dincolo de rapoartele bugetare pentru a include actualizări ale platformei și alerte de campanie.</li>
            <li>S-au actualizat stocarea și păstrarea datelor pentru a acoperi datele de forum, corespondență și AI.</li>
            <li>S-a consolidat procedura de notificare pentru actualizări viitoare ale termenilor.</li>
          </ul>
        </div>

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <h3>Acceptare</h3>
        <p>Prin utilizarea Serviciului, sunteți de acord cu acești Termeni. Dacă nu sunteți de acord, vă rugăm să nu utilizați Serviciul.</p>
        <p>Utilizarea Serviciului este guvernată și de <Link to="/privacy" className="underline">Politica de confidențialitate</Link> și <Link to="/cookie-policy" className="underline">Politica de cookie-uri</Link>, care descriu modul în care prelucrăm datele personale, inclusiv jurnalele de securitate, datele de autentificare și preferințele dumneavoastră de comunicare.</p>

        <h3>Informații despre furnizor și contractarea online</h3>
        <ul>
          <li><strong>Furnizor:</strong> Transparenta.eu este operată de Claudiu Constantin Bogdan, în calitate de persoană fizică. Contact: contact@transparenta.eu.</li>
          <li><strong>Încheierea contractului:</strong> Pentru navigarea generală, acești Termeni se aplică din momentul în care accesați sau utilizați Serviciul. Pentru funcțiile de cont, notificări, forum, corespondență, campanii sau AI care necesită un pas de confirmare, raportul contractual relevant se formează când finalizați pasul de înregistrare, activare, trimitere sau acceptare prezentat în interfață.</li>
          <li><strong>Limbile contractului:</strong> Acești Termeni pot fi puși la dispoziție în limba română și în limba engleză.</li>
          <li><strong>Pași tehnici și corectarea erorilor:</strong> Înainte de a crea un cont sau de a activa o funcționalitate, puteți consulta informările relevante din interfață și puteți corecta câmpurile formularului, setările de notificare, conținutul corespondenței sau alte inputuri înainte de trimiterea sau confirmarea finală.</li>
          <li><strong>Stocare și acces:</strong> Versiunea curentă a acestor Termeni este publicată în Serviciu și poate fi salvată sau tipărită din browser. Versiunile anterioare sunt disponibile la cerere. Acolo unde acest lucru este implementat în fluxul relevant, putem stoca și înregistrări privind versiunea acceptată și momentul acceptării.</li>
          <li><strong>Drepturi ale consumatorilor:</strong> Nimic din acești Termeni nu limitează drepturile imperative ale consumatorilor care se pot aplica conținutului digital sau serviciilor digitale oferite prin Serviciu.</li>
        </ul>

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
          <li><strong>Vârsta minimă:</strong> Serviciul poate fi utilizat numai de persoane în vârstă de cel puțin 16 ani. Anumite funcții sau fluxuri, inclusiv cele care implică transmiterea de corespondență ori documente oficiale către autorități publice sau alte acțiuni cu semnificație juridică, pot impune o vârstă minimă de 18 ani. Prin crearea unui cont sau utilizarea unei funcții, declarați că îndepliniți condiția de vârstă aplicabilă respectivei funcții.</li>
          <li><strong>Crearea contului:</strong> Când creați un cont, vi se poate solicita furnizarea anumitor informații precum adresa de email și numele. Sunteți responsabil(ă) pentru păstrarea confidențialității credențialelor contului.</li>
          <li><strong>Autentificare prin terți:</strong> Utilizăm Clerk pentru serviciile de autentificare. Prin crearea unui cont, sunteți de acord și cu termenii de serviciu ai Clerk.</li>
          <li><strong>Cont unificat:</strong> Contul dumneavoastră oferă acces la toate funcțiile platformei, inclusiv forumul comunitar găzduit pe Discourse. Când accesați forumul, ID-ul de utilizator, adresa de email și numele afișat sunt partajate cu sistemul forumului prin autentificare unică (SSO). Forumul poate stoca date suplimentare precum postările, informațiile de profil și jurnalele de activitate.</li>
          <li><strong>Ștergerea contului:</strong> Puteți șterge contul oricând. Ștergerea contului elimină accesul la cont, inclusiv accesul la forum, însă datele de profil forum, postările, înregistrările de moderare, copiile de siguranță și conținutul aferent pot fi șterse, anonimizate sau păstrate acolo unde este necesar din punct de vedere legal sau tehnic, astfel cum se arată în acești Termeni și în Politica de confidențialitate. Putem suspenda sau șterge conturile care încalcă acești Termeni sau legislația aplicabilă.</li>
        </ul>

        <h3>Notificări și comunicări</h3>
        <ul>
          <li><strong>Două categorii de comunicări prin email:</strong> Putem trimite (i) comunicări esențiale sau legate de furnizarea serviciului, necesare pentru operarea Serviciului sau confirmarea unei acțiuni solicitate de dumneavoastră, și (ii) notificări opționale pe care alegeți să le primiți.</li>
          <li><strong>Comunicări esențiale sau legate de furnizarea serviciului:</strong> Acestea pot include verificarea contului, mesaje privind autentificarea sau securitatea, emailuri tranzacționale de bun venit, notificări juridice sau de politici, confirmări de dezabonare, confirmări privind contul sau setările de notificare și emailuri unice de confirmare a participării la campanie sau a unei abonări, legate de o acțiune solicitată de dumneavoastră. Aceste comunicări nu reprezintă marketing promoțional și nu depind de un opt-in separat pentru notificări.</li>
          <li><strong>Rapoarte bugetare:</strong> Rapoarte opționale lunare, trimestriale sau anuale privind execuția bugetară pentru entitățile pe care le urmăriți.</li>
          <li><strong>Actualizări de campanie:</strong> Notificări opționale recurente despre campaniile civice la care participați, inclusiv actualizări privind corespondența pentru dezbateri publice și etapele relevante ale campaniei. În anumite fluxuri de campanie, aceste actualizări pot fi activate implicit atunci când vă înscrieți în campanie sau acceptați termenii specifici unei entități, cu condiția ca interfața relevantă de înscriere sau acceptare să prezinte clar această activare înainte de finalizarea acțiunii, să identifice campania sau entitatea relevantă și să explice cum puteți dezactiva aceste actualizări în orice moment.</li>
          <li><strong>Actualizări platformă:</strong> Informații opționale despre funcții noi, îmbunătățiri și modificări neesențiale ale platformei.</li>
          <li><strong>Alerte de cercetare AI:</strong> Notificări opționale despre rezultatele cercetării de la agenții AI care monitorizează entitățile pe care le urmăriți. Aceasta necesită consimțământ separat și explicit, așa cum este descris în secțiunea Funcții bazate pe AI.</li>
          <li><strong>Alerte de date:</strong> Notificări opționale când sunt îndeplinite condiții specifice pentru seturile de date pe care le monitorizați, cum ar fi modificări semnificative în execuția bugetară sau disponibilitatea unor date noi.</li>
          <li><strong>Notificări forum:</strong> Forumul comunitar poate trimite notificări prin email pentru răspunsuri, mențiuni și rezumate periodice, pe baza preferințelor dumneavoastră de notificare din forum. Acestea sunt gestionate prin setările forumului.</li>
          <li><strong>Categorii viitoare de notificări opționale:</strong> Putem introduce în viitor categorii suplimentare de notificări opționale. Acolo unde este necesar, acestea vor fi oferite prin setări actualizate, controale de preferințe pentru campanii sau alte fluxuri clare de activare, înainte de a trimite emailuri neesențiale de acest tip.</li>
          <li><strong>Dezabonare:</strong> Vă puteți dezabona de la tipurile de notificări opționale în orice moment prin linkul de dezabonare din emailul relevant, prin preferințele de notificare, prin setările forumului, după caz, sau contactându-ne. Acest lucru nu ne împiedică să vă trimitem comunicări esențiale sau legate de furnizarea serviciului atunci când este necesar.</li>
          <li><strong>Livrarea emailurilor:</strong> Folosim adresa dumneavoastră de email pentru a livra notificările opționale pe care le-ați activat și comunicările esențiale sau legate de furnizarea serviciului descrise mai sus. Nu vindem, închiriem sau partajăm adresa dumneavoastră de email cu terți în scopuri de marketing.</li>
          <li><strong>Consimțământ:</strong> Notificările neesențiale sunt trimise numai cu consimțământul dumneavoastră explicit sau în baza unei alte activări valabile realizate de dumneavoastră prin setările relevante sau prin fluxul de preferințe al campaniei, inclusiv în situațiile în care actualizările recurente ale campaniei sunt prezentate clar ca fiind activate implicit înainte de finalizarea acțiunii relevante. Puteți retrage consimțământul pentru orice tip de notificare opțională în orice moment, fără a afecta accesul la cont sau comunicările esențiale.</li>
        </ul>

        <h3>Forum comunitar</h3>
        <ul>
          <li><strong>Acces la forum:</strong> Serviciul include un forum comunitar pentru discuții civice, discuții despre conținutul educativ, suport pentru platformă și discuții legate de campanii sau activități derulate împreună cu parteneri, găzduit printr-o instanță Discourse auto-găzduită pe care intenționăm să o operăm cu găzduire bazată în UE la momentul relevant. Unele zone ale forumului pot fi accesibile pentru citire fără cont, în timp ce alte zone, inclusiv anumite spații de campanie, discuții integrate ori secțiuni restricționate, pot fi limitate la utilizatori autentificați, participanți înscriși sau alte categorii eligibile, în funcție de configurarea relevantă.</li>
          <li><strong>Autentificare unică (SSO):</strong> Forumul utilizează contul dumneavoastră Transparenta.eu pentru autentificare prin DiscourseConnect SSO. Când accesați forumul, ID-ul de utilizator, adresa de email și numele afișat sau username-ul sunt transmise sistemului forumului. Forumul poate stoca aceste date împreună cu activitatea dumneavoastră pe forum, inclusiv postări, răspunsuri, informații de profil, locație, fus orar, istoric de citire și adrese IP în scopuri de operare și moderare.</li>
          <li><strong>Postare anonimă sau pseudonimă:</strong> Forumul poate oferi mod anonim sau alte funcționalități de postare pseudonimă. Când acestea sunt active, postările pot apărea fără identificare vizibilă sau sub o identitate alternativă pentru ceilalți utilizatori și, după caz, pentru anumite echipe partenere ori participanți din contextul relevant. Totuși, sistemul forumului și operatorul platformei, precum și administratorii sau moderatorii care acționează în numele acestuia, pot păstra ori accesa în continuare legăturile tehnice și de cont necesare pentru securitate, moderare, prevenirea abuzurilor sau conformare legală.</li>
          <li><strong>Vizibilitate:</strong> Vizibilitatea conținutului forumului depinde de zona în care este publicat. Unele postări pot fi publice și accesibile pe internet, în timp ce altele pot fi vizibile doar utilizatorilor autentificați, participanților înscriși într-o campanie sau altor categorii restrânse de utilizatori. Prin postarea pe forum, recunoașteți că contribuțiile dumneavoastră vor fi vizibile conform regulilor de acces ale zonei relevante.</li>
          <li><strong>Conținut ilegal:</strong> Nu trebuie să publicați conținut ilegal conform legii aplicabile, inclusiv amenințări ilegale, hărțuire, discurs instigator la ură, conținut ofensator sau discriminatoriu interzis de lege, divulgare ilegală a datelor personale ale terților, acuzații factuale false ori calomnioase la adresa unor persoane identificabile sau instituții, încălcări ale drepturilor de autor, fraudă, malware, uzurpare ilegală de identitate sau alt conținut interzis de lege.</li>
          <li><strong>Reguli ale forumului:</strong> Nu trebuie să utilizați forumul pentru spam, solicitări comerciale, abuz coordonat, postări perturbatoare și repetitive în afara subiectului, intimidare, doxing, uzurpare înșelătoare de identitate sau orice alt comportament care afectează siguranța, integritatea ori scopul civic al forumului.</li>
          <li><strong>Discuție civică legală:</strong> Discuția critică, opinia, satira sau dezacordul bazat pe fapte cu privire la instituții publice, funcționari sau chestiuni de interes public nu sunt interzise doar pentru că sunt nefavorabile, controversate sau formulate ferm.</li>
          <li><strong>Notificare și acțiune:</strong> Puteți raporta conținut presupus ilegal sau încălcări ale regulilor forumului prin instrumentele de raportare ale forumului, dacă sunt disponibile, sau prin email la contact@transparenta.eu, cu suficiente detalii pentru a identifica acel conținut și baza reclamației.</li>
          <li><strong>Măsuri de moderare:</strong> Putem elimina conținut, restricționa accesul la conținut, bloca discuții, limita vizibilitatea, suspenda conturi sau întrerupe accesul la forum atunci când considerăm în mod rezonabil că un conținut este ilegal, încalcă regulile forumului sau creează riscuri de securitate ori abuz.</li>
          <li><strong>Motive și căi de contestare:</strong> Atunci când legea aplicabilă o cere și este rezonabil posibil, vom furniza utilizatorului afectat principalele motive pentru o decizie semnificativă de moderare sau restricționare a contului. Utilizatorii pot solicita o revizuire internă a deciziilor de moderare contactând contact@transparenta.eu. Acest lucru nu limitează căile judiciare sau alte remedii disponibile conform legii aplicabile.</li>
          <li><strong>Abuz repetat:</strong> Utilizarea repetată ilegală sau abuzivă a forumului poate duce la restricții temporare sau permanente privind publicarea, interacțiunea sau accesul la cont.</li>
          <li><strong>Conformare legală și divulgare:</strong> Putem păstra, revizui și divulga conținutul forumului, informații despre cont, identificatori tehnici și legături aferente modului anonim atunci când acest lucru este impus de lege, de o hotărâre judecătorească, de o citație, de o solicitare legală a unei autorități competente sau atunci când este rezonabil necesar pentru a investiga conduite ilegale ori abuzive, pentru a proteja drepturi sau siguranța ori pentru a aplica acești Termeni.</li>
          <li><strong>Notificări email forum:</strong> Discourse are propriul sistem de notificări prin email pentru răspunsuri la subiecte, mențiuni și rezumate. Aceste notificări sunt gestionate prin setările profilului de forum și sunt separate de preferințele de notificare ale platformei.</li>
        </ul>

        <h3>Corespondența cu instituțiile publice</h3>
        <ul>
          <li><strong>Facilitarea emailurilor:</strong> Serviciul oferă instrumente pentru a pregăti, trimite sau a vă ajuta să trimiteți emailuri către instituțiile publice privind chestiuni bugetare.</li>
          <li><strong>Două modele de corespondență:</strong> În funcție de flux, corespondența poate fi (i) pregătită de Serviciu și deschisă în propriul dumneavoastră client de email pentru a o trimite personal, sau (ii) trimisă direct de platformă în numele dumneavoastră de la o adresă controlată de platformă. Fluxul relevant va indica modelul aplicabil, ce adresă de expeditor sau de răspuns poate fi vizibilă destinatarului, dacă răspunsurile pot fi capturate de platformă și dacă este prezentată o identitate de campanie sau de partener.</li>
          <li><strong>Copii, captură și urmărirea firelor de corespondență:</strong> În unele fluxuri, mesajul generat poate include o adresă de CC sau de urmărire a răspunsurilor controlată de platformă, un identificator de fir de corespondență sau un marcaj tehnic similar, astfel încât Serviciul să poată detecta că mesajul a fost trimis, să asocieze răspunsurile ulterioare cu firul corect sau să vă ajute să urmăriți stadiul corespondenței. Dacă păstrați aceste detalii de urmărire în mesaj, platforma poate primi și stoca o copie a emailului trimis și a oricăror răspunsuri rutate înapoi prin firul urmărit.</li>
          <li><strong>Confirmare per acțiune:</strong> Fiecare acțiune de corespondență necesită confirmarea dumneavoastră activă în fluxul relevant înainte ca platforma să trimită emailul, să îl pregătească pentru clientul dumneavoastră de email sau să prelucreze datele tehnice asociate urmăririi pentru acea corespondență specifică.</li>
          <li><strong>Responsabilitatea utilizatorului:</strong> Sunteți singurul/singura responsabil(ă) pentru conținutul, acuratețea și legalitatea oricărei corespondențe trimise prin platformă. Platforma acționează în principal ca facilitator tehnic și, în mod obișnuit, nu pre-aprobă, nu verifică și nu susține fondul corespondenței dumneavoastră, însă poate revizui, păstra, ruta sau refuza corespondență atunci când este rezonabil necesar pentru prevenirea abuzurilor, suport, conformitate, gestionarea firelor de corespondență, controlul calității sau motive legale.</li>
          <li><strong>Fără abuz:</strong> Nu trebuie să utilizați instrumentele de corespondență pentru spam, hărțuire, amenințări, doxing, intimidare, contactare abuzivă în masă a instituțiilor sau orice ingerință ilegală ori disproporționată în activitatea instituțiilor publice sau a terților.</li>
          <li><strong>Aplicare și măsuri:</strong> Putem limita, suspenda, bloca, revizui, refuza sau raporta utilizarea abuzivă a instrumentelor de corespondență. De asemenea, putem păstra și divulga date relevante despre cont, conținut și elemente tehnice atunci când legea o impune sau când este rezonabil necesar pentru a investiga conduite ilegale ori abuzive.</li>
          <li><strong>Acces autorizat:</strong> Personalul autorizat sau furnizorii de servicii pot accesa înregistrările de corespondență atunci când acest lucru este rezonabil necesar pentru suport, prevenirea abuzurilor, conformitate, solicitări legale, controlul calității sau funcționarea urmăririi corespondenței și a gestionării răspunsurilor.</li>
          <li><strong>Identitatea partenerului sau a campaniei:</strong> Pentru anumite corespondențe legate de campanie, fluxul relevant poate indica faptul că emailul este trimis sub numele sau umbrela unui partener de campanie ori a unei organizații. În acest caz, fluxul de corespondență sau termenii specifici campaniei trebuie să clarifice acest lucru înainte de confirmarea acțiunii.</li>
          <li><strong>Păstrarea înregistrărilor:</strong> Platforma poate stoca înregistrări ale corespondenței pregătite, trimise, copiate sau urmărite prin Serviciu, inclusiv instituția destinatară, detaliile despre expeditor furnizate de dumneavoastră, adresele de CC sau de captură, subiectul, conținutul mesajului, datele relevante, starea livrării, identificatorii de fir de corespondență, răspunsurile primite de la instituție și notele aferente procesării sau revizuirii, pentru referința dumneavoastră, administrarea serviciului și scopuri de conformitate. Puteți solicita ștergerea acestor înregistrări în măsura în care ștergerea este permisă de lege.</li>
          <li><strong>Fără consiliere juridică:</strong> Instrumentele și șabloanele de corespondență furnizate sunt doar în scop informativ și nu constituie consiliere juridică. Sunteți responsabil(ă) pentru asigurarea conformității corespondenței dumneavoastră cu legislația aplicabilă.</li>
        </ul>

        <h3>Funcții bazate pe AI</h3>
        <ul>
          <li><strong>Funcții îmbunătățite cu AI și funcții experimentale:</strong> Serviciul poate oferi funcții îmbunătățite cu AI sau experimentale pentru a ajuta utilizatorii să analizeze date publice, să proceseze sau să rezume documente, să extragă informații structurate, să clasifice sau să compare înregistrări, să detecteze conținut duplicat, să prioritizeze sau să revizuiască materiale trimise de utilizatori ori provenite din surse publice, să genereze schițe, să răspundă la întrebări, să detecteze tipare sau să susțină fluxuri de cercetare. Unele dintre aceste funcții pot fi opționale, limitate, beta sau retrase în orice moment.</li>
          <li><strong>Funcții de cercetare și monitorizare:</strong> Acolo unde sunt activate, funcțiile de cercetare sau monitorizare bazate pe AI pot analiza instituții publice, date bugetare publice și documente provenite din surse publice. În unele cazuri, și numai atunci când acest lucru este prezentat clar în fluxul relevant al funcției, Serviciul poate prelucra și prompturi, întrebări sau documente pe care alegeți să le transmiteți spre analiză.</li>
          <li><strong>Opt-in explicit necesar pentru notificări proactive AI:</strong> Notificările proactive de cercetare AI necesită consimțământul dumneavoastră separat și explicit. Acest consimțământ este distinct de alte preferințe de notificare și poate fi retras oricând prin setările de notificări.</li>
          <li><strong>Inputuri permise:</strong> Nu ar trebui să transmiteți informații confidențiale sau date cu caracter personal ale unor terți către funcțiile îmbunătățite cu AI decât dacă aveți un temei legal și funcția respectivă este concepută pentru a accepta acel tip de input. Cu excepția situațiilor în care se precizează expres altfel, funcțiile AI sunt destinate în principal datelor publice, documentelor publice și altui conținut furnizat în mod legal de utilizator.</li>
          <li><strong>Furnizori AI terți:</strong> Unele funcții îmbunătățite cu AI sau experimentale pot utiliza furnizori terți de AI sau de procesare a documentelor. În funcție de furnizor, de configurare și de termenii aplicabili ai furnizorului, inputurile și outputurile transmise prin aceste funcții pot fi păstrate de furnizor și pot fi utilizate pentru îmbunătățirea serviciului, dezvoltarea modelului sau antrenare. Atunci când o funcționalitate folosește un astfel de furnizor, informarea relevantă a funcționalității sau materialele noastre de confidențialitate vor identifica furnizorul sau vă vor trimite la lista menținută de furnizori.</li>
          <li><strong>Fără garanții:</strong> Rezultatele generate de AI sunt furnizate exclusiv în scop informativ și de asistență. Acestea pot conține erori, omisiuni, halucinații, clasificări greșite, extrageri incomplete sau rezumate înșelătoare. Trebuie să verificați independent toate rezultatele generate de AI înainte de a vă baza pe ele în orice scop jurnalistic, civic, academic, profesional, financiar sau juridic.</li>
          <li><strong>Fără consiliere profesională:</strong> Rezultatele generate de AI nu constituie consiliere juridică, financiară, profesională sau de specialitate.</li>
          <li><strong>Transparență și supraveghere umană:</strong> Rezultatele generate sau asistate de AI prezentate prin Serviciu vor fi identificate ca atare în interfața relevantă. Atunci când publicăm texte, rezumate, clasificări sau materiale similare destinate publicului și generate ori manipulate în mod semnificativ de AI, vom identifica această utilizare atunci când legea aplicabilă o cere. Putem combina procesarea automată cu revizuire umană, moderare, prioritizare sau control al calității.</li>
          <li><strong>Suport pentru moderare și evaluarea riscurilor:</strong> Acolo unde sunt activate, instrumentele AI pot ajuta și la clasificarea conținutului, rezumare, detectarea conținutului duplicat, suport pentru moderare, detectarea abuzurilor, prioritizare, revizuirea materialelor trimise de utilizatori ori a documentelor din surse publice sau control al calității. Astfel de instrumente sunt doar de asistență și nu înlocuiesc evaluarea juridică ori factuală atunci când este necesară o revizuire umană.</li>
          <li><strong>Disponibilitate și evoluție:</strong> Funcțiile îmbunătățite cu AI sau experimentale se pot modifica, îmbunătăți, restricționa sau întrerupe fără notificare prealabilă. Calitatea rezultatelor poate varia în funcție de model, limbă, calitatea datelor sau formatul documentului.</li>
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
          <li><strong>Proprietatea asupra conținutului utilizatorului:</strong> Sub rezerva licențelor descrise mai jos, păstrați dreptul de proprietate asupra conținutului pe care îl creați, încărcați, salvați, transmiteți sau publicați prin Serviciu, inclusiv postări pe forum, răspunsuri din provocări, adnotări, schițe de corespondență, hărți salvate, grafice salvate și alte materiale generate de utilizator.</li>
          <li><strong>Licență pentru conținut privat:</strong> Pentru conținutul pe care îl păstrați privat sau îl utilizați doar în fluxuri nepublice ale produsului, acordați Transparenta.eu o licență neexclusivă și gratuită limitată la găzduirea, stocarea, reproducerea, formatarea, prelucrarea, securizarea, copierea de siguranță, suportul, operarea și îmbunătățirea Serviciului și a funcționalității utilizate de dumneavoastră.</li>
          <li><strong>Licență pentru conținut public:</strong> Pentru conținutul pe care alegeți să îl publicați sau să îl distribuiți public prin Serviciu, acordați Transparenta.eu o licență neexclusivă și gratuită de a găzdui, stoca, reproduce, afișa, distribui, formata, adapta pentru prezentare tehnică, arhiva și promova acel conținut public și Serviciul în legătură cu disponibilitatea publică a acelui conținut.</li>
          <li><strong>Durata licenței:</strong> Licența pentru conținutul privat încetează când conținutul relevant este șters din sistemele noastre active, sub rezerva copiilor de siguranță, retenției legale, gestionării disputelor și limitărilor tehnice. Licența pentru conținutul public continuă atât timp cât acel conținut rămâne public sau cât este rezonabil necesar pentru arhive, copii de siguranță, integritatea discuțiilor publice ori materiale deja redistribuite de alte persoane.</li>
          <li><strong>Partajare publică:</strong> Dacă alegeți să postați, publicați sau distribuiți conținut în mod public prin Serviciu, inclusiv contribuții în zone publice ale forumului sau hărți publice și alte rezultate publice similare, acel conținut poate deveni accesibil publicului, poate fi indexat de motoarele de căutare și poate fi copiat sau redistribuit de alte persoane.</li>
          <li><strong>Garanțiile utilizatorului:</strong> Declarați că dețineți drepturile necesare pentru a transmite conținutul respectiv și că utilizarea lui în condițiile prevăzute de acești Termeni nu încalcă drepturile terților sau legislația aplicabilă.</li>
          <li>Software-ul, designul și conținutul original al Serviciului sunt protejate de drepturile de autor și alte legi privind proprietatea intelectuală.</li>
        </ul>

        <h3>Exporturi și atribuire</h3>
        <p>Includeți atribuirea vizibilă a sursei de date și Transparenta.eu când partajați grafice, hărți, capturi de ecran sau alte rezultate vizuale similare generate prin Serviciu.</p>
        <blockquote>
          <p><strong>Recomandat:</strong> Grafic: „Titlul Graficului" | Sursa: Ministerul Finanțelor, via Transparenta.eu.</p>
        </blockquote>

        <h3>Stocarea și păstrarea datelor</h3>
        <ul>
          <li><strong>Date de cont:</strong> Când creați un cont, stocăm ID-ul de utilizator, numele, adresa de email și preferințele de notificare atâta timp cât contul dumneavoastră este activ.</li>
          <li><strong>Abonamente la notificări:</strong> Stocăm preferințele de abonare la notificări, inclusiv entitățile pe care le urmăriți și tipurile de actualizări pe care doriți să le primiți.</li>
          <li><strong>Date forum:</strong> Forumul stochează postările, informațiile de profil, locația și fusul orar dacă le furnizați, istoricul de citire și jurnalele de activitate atât timp cât este necesar pentru operarea forumului și aplicarea acestor Termeni. Ștergerea contului poate să nu elimine automat tot conținutul de forum, mai ales conținutul deja publicat ori păstrat pentru integritatea discuțiilor și moderare.</li>
          <li><strong>Înregistrări de corespondență:</strong> Înregistrările corespondenței pregătite, trimise, copiate sau urmărite prin platformă sunt păstrate timp de 5 ani, cu excepția cazului în care legea impune o ștergere mai rapidă sau datele sunt șterse în mod legal mai devreme.</li>
          <li><strong>Date aferente funcțiilor AI:</strong> Inputurile și outputurile asociate funcțiilor îmbunătățite cu AI sau experimentale pot fi păstrate de noi timp de 5 ani, cu excepția cazului în care pentru funcționalitatea relevantă este indicată expres o perioadă mai scurtă sau legea impune ștergerea mai devreme. Furnizorii terți de AI pot aplica propriile practici de retenție și antrenare, astfel cum s-a arătat mai sus.</li>
          <li><strong>Ștergere:</strong> Puteți solicita ștergerea sau anonimizarea datelor de cont aflate sub controlul nostru oricând contactându-ne sau utilizând funcțiile de ștergere a contului, când sunt disponibile, sub rezerva Politicii de confidențialitate, excepțiilor legale, copiilor de siguranță, limitărilor tehnice, integrității discuțiilor de forum și înregistrărilor deja livrate instituțiilor publice sau altor operatori independenți.</li>
        </ul>

        <h3>Limitarea răspunderii</h3>
        <p>În măsura maximă permisă de legislația aplicabilă, Claudiu Constantin Bogdan nu va răspunde pentru daune indirecte, incidentale, speciale, consecvente sau exemplare, inclusiv pierderea profitului, a veniturilor, a datelor, a fondului comercial sau alte pierderi intangibile, rezultate din: (i) accesul dumneavoastră la, utilizarea sau imposibilitatea de a utiliza Serviciul; (ii) bazarea pe date publice furnizate de terți, pe conținut generat de utilizatori sau pe outputuri generate de AI; (iii) pierderi financiare, profesionale, personale sau de altă natură rezultate din acțiuni întreprinse pe baza informațiilor obținute prin Serviciu; sau (iv) accesul neautorizat la ori utilizarea sistemelor noastre, în pofida unor măsuri rezonabile de protecție. Nimic din acești Termeni nu exclude sau limitează răspunderea acolo unde o astfel de excludere sau limitare este interzisă de legea aplicabilă, inclusiv răspunderea pentru intenție, culpă gravă, fraudă, deces sau vătămare corporală atunci când acestea nu pot fi excluse, drepturile imperative ale consumatorilor sau căile judiciare disponibile conform legii aplicabile.</p>

        <h3>Disponibilitate și modificări</h3>
        <p>Putem modifica sau întrerupe Serviciul în orice moment. Putem actualiza acești Termeni periodic pentru a reflecta schimbări în practicile noastre, funcții noi sau cerințe legale.</p>
        <ul>
          <li><strong>Notificarea modificărilor:</strong> Pentru modificări substanțiale ale acestor Termeni, vom furniza un preaviz de cel puțin 30 de zile prin publicarea Termenilor actualizați cu data viitoare de intrare în vigoare și trimiterea unei notificări prin email către utilizatorii înregistrați.</li>
          <li><strong>Acceptarea Termenilor actualizați:</strong> După data intrării în vigoare a Termenilor actualizați, vi se va solicita să revizuiți și să acceptați modificările la următoarea autentificare. Utilizarea continuă a Serviciului după acceptarea Termenilor actualizați constituie acordul dumneavoastră cu modificările.</li>
          <li><strong>Istoricul versiunilor:</strong> Versiunile anterioare ale acestor Termeni sunt disponibile la cerere, contactându-ne la contact@transparenta.eu.</li>
        </ul>

        <h3>Legea aplicabilă</h3>
        <p>Legea română și legislația UE aplicabilă, inclusiv RGPD, fără a aduce atingere normelor imperative de protecție a consumatorilor care vi se pot aplica. Litigiile sunt de competența instanțelor române competente, cu excepția cazului în care legea aplicabilă conferă consumatorilor dreptul de a introduce acțiunea în alt loc.</p>

        <h3>Contact</h3>
        <p>Transparenta.eu este operată de Claudiu Constantin Bogdan. Contactați-ne la contact@transparenta.eu. Consultați și <Link to="/privacy" className="underline">Politica de confidențialitate</Link> și <Link to="/cookie-policy" className="underline">Politica de cookie-uri</Link>.</p>
      </div>
    </div>
  )
}
