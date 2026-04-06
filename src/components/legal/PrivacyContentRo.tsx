export function PrivacyContentRo() {
  return (
    <div className="mx-auto w-full max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Politica de confidențialitate</h1>
        <p className="text-sm text-muted-foreground">Data intrării în vigoare: 6 aprilie 2026 · Versiunea: 3.0</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Pe scurt</h2>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li>Local-first: graficele, progresul de învățare, progresul din campanii, hărțile, alertele și preferințele pot fi stocate în browserul dumneavoastră.</li>
          <li>Conturi de utilizator opționale pentru buletine informative, notificări, acces la forum și funcții îmbunătățite cu AI.</li>
          <li>Forum comunitar integrat cu contul dumneavoastră; unele zone pot fi publice, iar altele pot fi restricționate utilizatorilor autentificați sau participanților înscriși, în funcție de configurarea relevantă.</li>
          <li>Instrumentele de corespondență pot pregăti, trimite sau vă pot ajuta să trimiteți emailuri către instituții publice, în funcție de flux.</li>
          <li>Funcțiile îmbunătățite cu AI sau experimentale pot prelucra date publice, documente publice și, în unele cazuri, prompturi sau documente pe care alegeți să le transmiteți.</li>
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
          <li>S-au extins informările privind prelucrarea datelor AI pentru a acoperi funcții îmbunătățite cu AI sau experimentale, inclusiv procesarea documentelor și inputurile transmise pentru analiză.</li>
          <li>S-a adăugat Discourse ca sub-operator de date.</li>
          <li>S-a extins consimțământul pentru notificări pentru a acoperi toate tipurile noi de notificări.</li>
          <li>S-a actualizat programul de păstrare a datelor pentru datele de forum, corespondență și AI.</li>
          <li>S-a consolidat procedura de notificare pentru modificări substanțiale ale politicii.</li>
        </ul>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <h3>Cine suntem</h3>
        <p>Operator: Claudiu Constantin Bogdan, persoana fizică. Contact: contact@transparenta.eu</p>
        <p>Unele campanii, provocări sau activități derulate împreună cu parteneri prin intermediul Serviciului pot face obiectul unor termeni și informări de confidențialitate suplimentare, specifice campaniei respective. În astfel de campanii, Transparenta.eu și partenerul relevant pot acționa ca operatori separați pentru scopuri diferite. Aceste documente specifice explică împărțirea responsabilităților, scopurile pentru care acționează fiecare operator și punctul de contact relevant pentru exercitarea drepturilor. Cu excepția cazului în care un document specific de campanie prevede în mod expres altfel, Transparenta.eu rămâne operatorul de date pentru prelucrările la nivel de platformă, inclusiv crearea și autentificarea contului, accesul și moderarea forumului, securitatea și prevenirea abuzurilor, gestionarea cookie-urilor și a consimțământului, infrastructura de notificări, precum și operarea, îmbunătățirea și dezvoltarea Serviciului.</p>

        <h3>Ce date personale colectăm</h3>
        <p>Colectăm diferite tipuri de informații în funcție de modul în care utilizați Serviciul nostru:</p>

        <h4>Date colectate fără cont:</h4>
        <ul>
          <li><strong>Date tehnice esențiale:</strong> Tipul browserului, tipul dispozitivului și locația generală (nivel de țară) utilizate pentru furnizarea serviciului, fiabilitate și prevenirea fraudei. Adresele IP brute sunt tratate separat în jurnalele de acces ale serverului și, după caz, în jurnalele de moderare ale forumului, pentru securitate și prevenirea abuzurilor (interese legitime conform RGPD Art. 6(1)(f)).</li>
          <li><strong>Preferințe de consimțământ:</strong> Alegerile dumneavoastră privind cookie-urile și analiza, stocate în localStorage-ul browserului.</li>
          <li><strong>Date stocate în browser:</strong> Grafice, categorii de grafice, adnotări, filtre, alerte salvate sau în lucru, entități recente, preferințe de limbă, temă, monedă și ajustare la inflație, progres de învățare, progres de campanie, stare de onboarding și alte preferințe sau schițe de lucru stocate local în browserul dumneavoastră. O parte din aceste date poate rămâne exclusiv pe dispozitivul dumneavoastră; o altă parte poate fi sincronizată ulterior cu serverele noastre dacă sunteți autentificat și utilizați funcționalități care permit sincronizarea.</li>
          <li><strong>Date din IndexedDB și sessionStorage:</strong> Anumite funcționalități avansate, precum schițele pentru analize avansate pe hartă, snapshot-urile locale ale hărților și stările temporare ale editorului sau runtime-ului, pot utiliza IndexedDB sau sessionStorage pe lângă localStorage.</li>
          <li><strong>Analiză utilizare (opt-in):</strong> Dacă consimțiți, colectăm evenimente de utilizare personalizate prin PostHog pentru a înțelege cum sunt utilizate funcțiile. Fără capturare automată sau înregistrări de sesiuni. Prelucrarea pentru analiză este separată de jurnalele brute de securitate ale serverului sau forumului.</li>
          <li><strong>Rapoarte de erori (opt-in):</strong> Dacă consimțiți, context îmbunătățit de erori prin Sentry pentru a ne ajuta să remediem problemele. Dacă alegeți să trimiteți feedback sau rapoarte de bug prin formulare bazate pe Sentry, textul mesajului, capturile de ecran opționale și contextul tehnic aferent pot fi prelucrate. Fără consimțământ, se colectează doar telemetrie minimală de erori.</li>
          <li><strong>Jurnale de acces server:</strong> Adresa IP completă, user agent, URL-ul solicitat, referrer și marca temporală pentru detectarea abuzurilor, asigurarea fiabilității și securizarea Serviciului (interese legitime conform RGPD Art. 6(1)(f)).</li>
        </ul>

        <h4>Date colectate cu un cont:</h4>
        <ul>
          <li><strong>Informații cont:</strong> ID utilizator (atribuit de Clerk), adresă de email, prenume, nume de familie. Temei juridic: RGPD Art. 6(1)(b) (executarea contractului) și Art. 6(1)(a) (consimțământ pentru notificări).</li>
          <li><strong>Date de autentificare:</strong> Marca temporală a autentificării, adresa IP de autentificare, detalii dispozitiv (ex. user agent), jetoane de autentificare (gestionate de Clerk) și informații de sesiune pentru securitatea contului.</li>
          <li><strong>Preferințe de notificare:</strong> Alegerile dumneavoastră de abonare pentru tipurile de notificări opționale (precum rapoarte bugetare, actualizări campanie, actualizări platformă, alerte cercetare AI și alerte date), inclusiv entitățile pe care le urmăriți, tipurile de notificări pe care le-ați activat și orice preferințe de actualizări de campanie activate implicit atunci când vă înscrieți într-o campanie sau acceptați termenii specifici unei anumite entități.</li>
          <li><strong>Istoric de comunicare:</strong> Înregistrări ale comunicărilor legate de furnizarea serviciului și ale notificărilor opționale trimise către dumneavoastră, inclusiv starea livrării și acțiunile de dezabonare, acolo unde este cazul, pentru conformitate, depanarea livrării și administrarea serviciului.</li>
          <li><strong>Înregistrări privind confirmarea termenilor și politicilor:</strong> Acolo unde acest lucru este implementat în fluxul relevant, putem stoca înregistrări care arată când ați confirmat sau acceptat termeni, politici sau condiții specifice de campanie, împreună cu metadatele aferente necesare pentru conformitate și administrarea serviciului.</li>
          <li><strong>Date sincronizate de învățare și campanie:</strong> Dacă sunteți autentificat și utilizați funcționalități sincronizate de învățare sau campanie, putem stoca progresul de învățare, progresul provocărilor, acceptarea termenilor campaniei pe entitate, entitățile selectate, starea de onboarding, înregistrările de interacțiune, evenimentele de audit, rezultatele revizuirii, valorile trimise și adresele sursă sau metadatele necesare pentru a opera aceste funcționalități între sesiuni și dispozitive.</li>
          <li><strong>Date privind hărți create de utilizator și partajare:</strong> Dacă utilizați analize avansate pe hartă sau funcționalități similare de conținut generat de utilizator, putem stoca titluri de hărți, descrieri, starea de vizibilitate, snapshot-uri, identificatori de partajare publică și configurația necesară pentru salvarea, restaurarea sau publicarea acestor rezultate.</li>
        </ul>

        <h4>Date colectate prin forum:</h4>
        <ul>
          <li><strong>Profil forum:</strong> ID-ul de utilizator, adresa de email și numele afișat sau username-ul sunt transmise forumului Discourse prin DiscourseConnect SSO când accesați forumul. Forumul poate stoca informații suplimentare de profil pe care alegeți să le furnizați, inclusiv locația sau fusul orar.</li>
          <li><strong>Activitate forum:</strong> Întrebări, comentarii, postări, răspunsuri, aprecieri, marcaje, istoric de citire, preferințe de urmărire a subiectelor, metrici de participare și discuții legate de funcționalitățile platformei, lecții, campanii sau activități derulate împreună cu parteneri. Vizibilitatea acestor date depinde de zona forumului relevantă: unele contribuții pot fi publice, iar altele pot fi vizibile doar utilizatorilor autentificați sau participanților înscriși.</li>
          <li><strong>Utilizare anonimă sau pseudonimă a forumului:</strong> Dacă utilizați modul anonim sau o funcționalitate similară de postare pseudonimă, forumul poate afișa contribuțiile fără identificare vizibilă sau sub o identitate publică alternativă. În anumite spații de campanie ori integrări similare, acest lucru poate ascunde identitatea și față de echipele partenere relevante, însă sistemul forumului și operatorii platformei pot păstra în continuare legături tehnice sau de cont necesare pentru moderare, prevenirea abuzurilor, securitate și conformare legală.</li>
          <li><strong>Date de moderare forum:</strong> Adrese IP complete, user agent, marca temporală asociată acțiunilor pe forum, rapoarte de moderare și metadate tehnice aferente, păstrate pentru moderarea conținutului, prevenirea abuzurilor și conformare legală (interese legitime conform RGPD Art. 6(1)(f)).</li>
          <li><strong>Notificări forum:</strong> Preferințele dumneavoastră de notificare din forum (rezumate email, notificări de răspuns, alerte de mențiune) sunt gestionate în sistemul Discourse separat de preferințele de notificare ale platformei.</li>
        </ul>

        <h4>Date colectate prin instrumentele de corespondență:</h4>
        <ul>
          <li><strong>Înregistrări de corespondență:</strong> Când utilizați platforma pentru a pregăti, trimite, copia sau urmări un email către o instituție publică, putem stoca instituția destinatară, data, subiectul, conținutul mesajului, starea livrării, identificatorii firului de corespondență, identificatorii mesajelor și metadatele tehnice aferente. Temei juridic: RGPD Art. 6(1)(b) (executarea contractului, deoarece ați solicitat serviciul) și Art. 6(1)(f) (interese legitime pentru conformitate, administrarea serviciului și urmărirea firelor de corespondență).</li>
          <li><strong>Copii și răspunsuri:</strong> Dacă un flux de corespondență utilizează o adresă de CC controlată de platformă, o adresă de urmărire a răspunsurilor sau un alt mecanism de captură, putem primi și stoca o copie a emailului trimis și orice răspunsuri rutate înapoi prin firul urmărit, împreună cu metadatele aferente și eventualele note de revizuire.</li>
          <li><strong>Informații expeditor:</strong> Numele dumneavoastră, detaliile organizației dumneavoastră și, după caz, orice mențiune că mesajul este trimis sub umbrela unui partener de campanie sau a unei organizații. Aceste informații pot fi dezvăluite instituției destinatare în mesajul transmis.</li>
        </ul>

        <h4>Date colectate prin funcțiile bazate pe AI:</h4>
        <ul>
          <li><strong>Preferințe pentru funcțiile AI:</strong> Setările, alegerile de activare, entitățile monitorizate și preferințele de configurare a alertelor pentru funcțiile îmbunătățite cu AI sau experimentale. Temeiul juridic poate include RGPD Art. 6(1)(a) (consimțământ) și/sau Art. 6(1)(b) (executarea unui serviciu solicitat), în funcție de funcționalitate.</li>
          <li><strong>Inputuri AI:</strong> Date publice, documente publice, postări de forum, răspunsuri din campanii, prompturi, întrebări, fișiere încărcate sau transmise, text extras și alte inputuri pe care alegeți să le furnizați unei funcții îmbunătățite cu AI sau pe care funcționalitatea relevantă le utilizează în mod legitim pentru analiză, dacă acceptă un astfel de conținut.</li>
          <li><strong>Outputuri și derivate AI:</strong> Constatări, rezumate, clasificări, date structurate extrase, texte în draft, răspunsuri, rezultate de prioritizare, semnale privind conținut duplicat, adnotări sau alte rezultate generate ori asistate de sisteme AI ca răspuns la inputul relevant.</li>
          <li><strong>Date prelucrate pentru moderare și revizuire asistate de AI:</strong> Dacă este activată o astfel de funcționalitate, sistemele automate pot prelucra postări de forum, rapoarte, răspunsuri din campanii, materiale trimise de utilizatori și documente publice analizate pentru clasificare, rezumare, detectarea conținutului duplicat, prioritizare, suport pentru moderare sau revizuire.</li>
          <li><strong>Jurnale și feedback pentru funcțiile AI:</strong> Jurnale tehnice, metadate de utilizare, rapoarte de eroare și feedback legate de funcțiile îmbunătățite cu AI, pentru operarea, securizarea, revizuirea, îmbunătățirea și depanarea acestor funcții.</li>
        </ul>

        <h3>Cum folosim datele dumneavoastră</h3>
        <ul>
          <li><strong>Furnizarea serviciului:</strong> Pentru a opera Serviciul, a furniza vizualizări și a asigura securitatea platformei (interese legitime, RGPD Art. 6(1)(f)).</li>
          <li><strong>Gestionarea contului:</strong> Pentru a crea și menține contul dumneavoastră, a autentifica accesul și a furniza asistență legată de cont (executarea contractului, RGPD Art. 6(1)(b)).</li>
          <li><strong>Livrarea notificărilor:</strong> Pentru a vă trimite actualizări opționale privind execuția bugetară, notificări de campanie, actualizări ale platformei, alerte de cercetare AI și alerte de date pe care le-ați activat, la care v-ați abonat explicit sau pe care le-ați activat printr-un flux de participare la campanie în care aceste actualizări sunt prezentate clar ca fiind activate implicit înainte de finalizarea acțiunii relevante de înscriere sau acceptare (consimțământ, RGPD Art. 6(1)(a)). Puteți retrage consimțământul și vă puteți dezabona oricând.</li>
          <li><strong>Operarea forumului:</strong> Pentru a opera forumul comunitar, a autentifica accesul dumneavoastră prin SSO, a afișa contribuțiile conform regulilor de vizibilitate ale zonei relevante și a modera conținutul (executarea contractului, RGPD Art. 6(1)(b), și interese legitime, RGPD Art. 6(1)(f)).</li>
          <li><strong>Facilitarea corespondenței:</strong> Pentru a pregăti emailuri pentru propriul dumneavoastră client de email, pentru a trimite emailuri în numele dumneavoastră atunci când acel flux se aplică, pentru a capta copii sau răspunsuri prin canale de corespondență urmărite și pentru a menține firele de corespondență atunci când utilizați instrumentele de corespondență (executarea contractului, RGPD Art. 6(1)(b), deoarece ați inițiat acțiunea).</li>
          <li><strong>Funcții îmbunătățite cu AI:</strong> Pentru a opera funcțiile îmbunătățite cu AI sau experimentale pe care alegeți să le utilizați, inclusiv analiza datelor publice, procesarea documentelor, extragerea, rezumarea, clasificarea, generarea de drafturi, detectarea conținutului duplicat, prioritizarea, suportul pentru moderare sau revizuire și monitorizarea proactivă bazată pe AI, acolo unde este activată (consimțământ și/sau executarea contractului, în funcție de funcționalitate).</li>
          <li><strong>Comunicare:</strong> Pentru a trimite comunicări esențiale sau legate de furnizarea serviciului, precum verificarea contului, alerte de securitate, emailuri tranzacționale de bun venit, confirmări ale acțiunilor solicitate, confirmări de participare sau abonare în campanie și actualizări ale termenilor sau politicilor, atunci când acestea sunt necesare pentru executarea contractului și interese legitime.</li>
          <li><strong>Analiză și îmbunătățire:</strong> Cu consimțământul dumneavoastră, pentru a înțelege tiparele de utilizare și a îmbunătăți Serviciul (consimțământ, RGPD Art. 6(1)(a)).</li>
          <li><strong>Detectarea și rezolvarea erorilor:</strong> Cu consimțământul dumneavoastră, pentru a identifica și remedia problemele tehnice (consimțământ, RGPD Art. 6(1)(a)).</li>
        </ul>

        <h3>Temeiurile juridice pentru prelucrare</h3>
        <ul>
          <li><strong>Interese legitime (Art. 6(1)(f)):</strong> Operarea și securizarea Serviciului, prevenirea fraudei și abuzurilor, moderarea forumului, clasificarea, rezumarea, detectarea conținutului duplicat, prioritizarea și revizuirea asistate de AI pentru materiale de forum, campanie ori documente publice, păstrarea înregistrărilor de conformitate pentru corespondență, urmărirea firelor de corespondență și revizuirea răspunsurilor instituțiilor.</li>
          <li><strong>Executarea contractului (Art. 6(1)(b)):</strong> Furnizarea funcțiilor de cont și a serviciilor pe care le-ați solicitat, inclusiv accesul la forum și trimiterea corespondenței.</li>
          <li><strong>Consimțământ (Art. 6(1)(a)):</strong> Abonamente opționale la rapoarte bugetare, notificări recurente de actualizare campanie, notificări de actualizare platformă, alerte AI, anumite prelucrări AI îmbunătățite sau experimentale atunci când consimțământul este temeiul juridic adecvat, alerte de date, rezumate email forum, analiză și raportare îmbunătățită a erorilor, inclusiv preferințele pentru actualizări de campanie activate implicit prin fluxuri de înscriere în campanie prezentate clar. Puteți retrage consimțământul oricând.</li>
          <li><strong>Obligații legale (Art. 6(1)(c)):</strong> Conformitatea cu legislația și reglementările aplicabile.</li>
        </ul>

        <h3>Consimțământul pentru notificări și comunicări</h3>
        <ul>
          <li><strong>Comunicări legate de furnizarea serviciului:</strong> Anumite emailuri sunt trimise deoarece sunt necesare pentru operarea Serviciului sau pentru confirmarea unei acțiuni solicitate de dumneavoastră. Acestea pot include verificarea contului și emailuri de securitate, emailuri tranzacționale de bun venit, notificări juridice, confirmări de dezabonare, confirmări de participare la campanie și confirmări privind preferințele de notificare sau alte acțiuni solicitate de utilizator.</li>
          <li><strong>Activare granulară pentru notificări opționale:</strong> Fiecare tip de notificare opțională este opt-in separat sau este activat de utilizator prin setările relevante ori prin fluxul de preferințe al campaniei. În unele campanii, actualizările recurente ale campaniei pot fi activate implicit atunci când vă înscrieți în campanie sau acceptați termenii specifici unei anumite entități, cu condiția ca această activare implicită să fie prezentată clar înainte de finalizarea acțiunii relevante și să puteți dezactiva acele actualizări în orice moment. Nu vi se cere niciodată să activați toate tipurile de notificări opționale pentru a utiliza Serviciul.</li>
          <li><strong>Categorii de notificări opționale:</strong> Rapoarte bugetare (lunare, trimestriale, anuale) pentru entitățile pe care le urmăriți. Actualizări recurente de campanie pentru campaniile la care participați. Actualizări ale platformei despre funcții noi și modificări neesențiale. Alerte AI pentru constatări proactive sau asistate de AI, acolo unde sunt oferite. Alerte de date pentru monitorizarea condițiilor seturilor de date. Notificări forum pentru răspunsuri, mențiuni și rezumate, gestionate prin setările forumului. Putem adăuga în viitor noi categorii de notificări opționale prin setări sau fluxuri de activare actualizate.</li>
          <li><strong>Dezabonare:</strong> Vă puteți dezabona de la tipurile de notificări opționale în orice moment prin click pe linkul de dezabonare din emailul relevant, prin gestionarea preferințelor din setările contului sau ale forumului, sau contactându-ne la contact@transparenta.eu. Comunicările esențiale sau legate de furnizarea serviciului pot fi totuși trimise atunci când este necesar.</li>
          <li><strong>Fără consimțământ cumulat:</strong> Nu condiționăm accesul la Serviciu sau la vreo funcție de acceptarea tuturor tipurilor de notificări opționale. Fiecare consimțământ este independent.</li>
          <li><strong>Fără marketing:</strong> Nu trimitem emailuri de marketing ale unor terți. Comunicările trimise de noi sunt fie comunicări legate de furnizarea serviciului, fie actualizări informative pe care le-ați activat sau solicitat.</li>
          <li><strong>Fără partajare:</strong> Nu vindem, închiriem sau partajăm niciodată adresa dumneavoastră de email cu terți în scopuri de marketing.</li>
        </ul>

        <h3>Sursele de date și licențiere</h3>
        <p>Informații din sectorul public de la Ministerul Finanțelor. Fără afiliere guvernamentală.</p>

        <h3>Partajarea datelor, persoanele împuternicite și operatorii separați</h3>
        <p>Partajăm date cu următorii furnizori de servicii de încredere care prelucrează datele în numele nostru:</p>
        <ul>
          <li><strong>Clerk (Autentificare):</strong> Gestionează autentificarea utilizatorilor și datele de cont. UE/SUA cu clauze contractuale standard.</li>
          <li><strong>Discourse (Forum comunitar):</strong> Instanță Discourse auto-găzduită în Uniunea Europeană. Prelucrează datele de profil forum, postările și activitatea prin DiscourseConnect SSO. Datele rămân în UE.</li>
          <li><strong>PostHog (Analiză):</strong> Prelucrează analiza utilizării dacă consimțiți. Opțiune de găzduire în UE disponibilă.</li>
          <li><strong>Sentry (Raportare erori):</strong> Prelucrează jurnalele de erori dacă consimțiți. Prioritate UE cu controale de rezidență a datelor.</li>
          <li><strong>Furnizori AI și de procesare documente:</strong> Dacă și atunci când funcțiile îmbunătățite cu AI sau experimentale sunt activate, putem utiliza sisteme AI auto-găzduite sau furnizori terți de AI, OCR, extragere, clasificare, rezumare sau procesare de documente pentru a prelucra inputurile și outputurile necesare acestor funcții. În funcție de furnizor și de configurare, inputurile și outputurile transmise pot fi de asemenea păstrate de furnizor și pot fi utilizate pentru îmbunătățirea serviciului, dezvoltarea modelului sau antrenare.</li>
          <li><strong>Furnizor de servicii email:</strong> Livrează notificări, buletine informative și emailurile de corespondență pe care le-ați inițiat.</li>
          <li><strong>Furnizori de găzduire:</strong> Stochează și servesc datele aplicației și bazele de date în infrastructură selectată de noi sau de furnizorii noștri, care poate include găzduire în UE în funcție de serviciu și de configurarea utilizată.</li>
        </ul>
        <p>Toți operatorii sunt obligați prin acorduri de protecție a datelor și garanții conforme cu RGPD, inclusiv clauze contractuale standard pentru transferurile internaționale, după caz.</p>
        <p>Atunci când o funcționalitate utilizează un furnizor terț de AI sau de procesare a documentelor, vom identifica acel furnizor în informarea relevantă a funcționalității sau într-o listă separată de sub-operatori pe care o punem la dispoziție. Cu excepția cazului în care informarea relevantă prevede altfel, trebuie să presupuneți că un furnizor terț de AI poate păstra inputurile sau outputurile transmise și le poate utiliza pentru îmbunătățirea serviciului, dezvoltarea modelului sau antrenare.</p>
        <p>Când trimiteți sau pregătiți corespondență către o instituție publică prin platformă, conținutul emailului și informațiile despre expeditor incluse în această corespondență sunt transmise instituției destinatare și, atunci când fluxul utilizează adrese de CC, urmărire a răspunsurilor sau captură, pot fi prelucrate și prin aceste canale monitorizate. Instituțiile publice sunt operatori de date independenți pentru orice date personale pe care le primesc.</p>
        <p>Partenerii de campanie identificați în documentele specifice campaniei acționează ca operatori separați pentru propriile scopuri de campanie, nu ca persoane împuternicite care prelucrează exclusiv în numele nostru toate prelucrările legate de campanie.</p>
        <p>Dacă vă exercitați dreptul la ștergere față de noi, putem șterge sau anonimiza datele din sistemele aflate sub controlul nostru, sub rezerva excepțiilor legale. Nu putem șterge emailuri, atașamente, răspunsuri sau alte înregistrări deja livrate unei instituții publice, unui partener de campanie sau altui operator independent și nu putem impune acelor operatori independenți să șteargă datele păstrate în propriile lor sisteme.</p>
        <p>Putem de asemenea păstra, revizui și divulga date cu caracter personal atunci când legea, o hotărâre judecătorească, o citație, o solicitare legală a unei autorități competente ori necesitatea rezonabilă de a investiga conduite ilegale sau abuzive, de a proteja drepturi ori siguranța sau de a aplica Termenii noștri impun acest lucru.</p>

        <h3>Păstrarea datelor</h3>
        <ul>
          <li><strong>LocalStorage, sessionStorage și IndexedDB:</strong> Datele stocate în browser rămân pe dispozitivul dumneavoastră până când le ștergeți, până când funcționalitatea relevantă le suprascrie sau până când browserul le elimină. Unele date stocate local pot fi de asemenea sincronizate cu serverele noastre dacă sunteți autentificat și utilizați funcționalități sincronizate.</li>
          <li><strong>Date de cont:</strong> Păstrate atâta timp cât contul dumneavoastră este activ sau atât cât este necesar pentru furnizarea serviciilor, apoi șterse sau anonimizate în termen de 30 de zile de la ștergerea sau închiderea contului, cu excepția datelor păstrate conform perioadelor mai specifice de mai jos ori a situațiilor în care legea, securitatea, gestionarea disputelor sau conformitatea impun o păstrare mai îndelungată.</li>
          <li><strong>Abonamente la notificări:</strong> Păstrate cât sunt active. Șterse soft (marcate inactive) când vă dezabonați, cu ștergere completă după 1 an pentru conformitate și scopuri anti-spam.</li>
          <li><strong>Înregistrări de livrare a buletinelor și notificărilor:</strong> Păstrate timp de 2 ani pentru depanarea livrării și conformitate.</li>
          <li><strong>Înregistrări privind confirmarea termenilor și politicilor:</strong> Acolo unde sunt menținute, sunt păstrate timp de 3 ani de la confirmarea relevantă sau de la încetarea raportului contractual ori a relației de campanie aplicabile, oricare dintre acestea survine mai târziu.</li>
          <li><strong>Progres de învățare și de campanie:</strong> Păstrat atât timp cât este necesar pentru a furniza progres sincronizat, fluxuri de revizuire, funcționalități de participare în campanii și istoricul de audit aferent, cu excepția cazului în care se solicită ștergerea și păstrarea nu este altfel necesară.</li>
          <li><strong>Hărți create de utilizator și snapshot-uri:</strong> Păstrate atât timp cât este necesar pentru a furniza funcționalitatea de hartă, inclusiv versiunile salvate publice sau private, cu excepția cazului în care le ștergeți mai devreme sau solicitați ștergerea acolo unde este disponibilă.</li>
          <li><strong>Date forum:</strong> Păstrate atât timp cât este necesar pentru operarea forumului, menținerea integrității discuțiilor, administrarea conturilor și gestionarea moderării, prevenirii abuzurilor, conformării legale sau cererilor de ștergere formulate de utilizatori. Tratamentul exact al postărilor din zone publice sau restricționate, al datelor de profil, al conținutului anonimizat și al înregistrărilor de moderare poate depinde de setările forumului, nevoile de moderare și legislația aplicabilă.</li>
          <li><strong>Înregistrări de corespondență:</strong> Păstrate timp de 5 ani, cu excepția cazului în care legea aplicabilă impune ștergerea mai devreme sau datele relevante sunt șterse în mod legal mai rapid. Puteți solicita ștergerea acolo unde aceasta este permisă de lege.</li>
          <li><strong>Inputuri, outputuri și jurnale ale funcțiilor AI:</strong> Păstrate de noi timp de 5 ani, cu excepția cazului în care pentru funcționalitatea relevantă este indicată expres o perioadă mai scurtă sau legea aplicabilă impune ștergerea mai devreme. Furnizorii terți de AI utilizați pentru o funcționalitate pot aplica propriile practici de retenție și antrenare.</li>
          <li><strong>Date de analiză:</strong> Păstrate timp de 12 luni, apoi șterse automat sau anonimizate.</li>
          <li><strong>Jurnale de erori și rapoarte de feedback:</strong> Păstrate timp de 180 de zile, cu excepția cazului în care legea aplicabilă impune o păstrare mai îndelungată.</li>
          <li><strong>Jurnale de acces server:</strong> Păstrate timp de 90 de zile, cu excepția cazului în care legea aplicabilă sau un incident concret de securitate, abuz sau natură juridică impune o păstrare mai îndelungată.</li>
        </ul>

        <h3>Drepturile dumneavoastră conform RGPD</h3>
        <p>Ca persoană vizată conform RGPD, aveți următoarele drepturi:</p>
        <ul>
          <li><strong>Dreptul de acces (Art. 15):</strong> Solicitați o copie a datelor personale pe care le deținem despre dumneavoastră, inclusiv datele stocate în sistemul forumului.</li>
          <li><strong>Dreptul la rectificare (Art. 16):</strong> Solicitați corectarea datelor personale inexacte.</li>
          <li><strong>Dreptul la ștergere (Art. 17):</strong> Solicitați ștergerea datelor personale aflate sub controlul nostru („dreptul de a fi uitat"), inclusiv datele forumului și înregistrările de corespondență, sub rezerva excepțiilor legale și a limitelor aplicabile operatorilor independenți descrise mai sus.</li>
          <li><strong>Dreptul la restricționare (Art. 18):</strong> Solicitați limitarea prelucrării în anumite circumstanțe.</li>
          <li><strong>Dreptul la portabilitatea datelor (Art. 20):</strong> Primiți datele dumneavoastră într-un format structurat, ușor de citit automat, inclusiv postările de pe forum și înregistrările de corespondență.</li>
          <li><strong>Dreptul la opoziție (Art. 21):</strong> Opuneți-vă prelucrării bazate pe interese legitime, inclusiv prelucrării datelor de moderare a forumului.</li>
          <li><strong>Dreptul de retragere a consimțământului (Art. 7(3)):</strong> Retrageți consimțământul pentru orice tip de notificare, cercetare AI, analiză sau raportare a erorilor în orice moment, fără a afecta legalitatea prelucrării anterioare retragerii.</li>
          <li><strong>Dreptul de a depune o plângere:</strong> Depuneți o plângere la autoritatea de supraveghere din România (ANSPDCP) la anspdcp.ro.</li>
        </ul>
        <p>Pentru a exercita oricare dintre aceste drepturi, contactați-ne la contact@transparenta.eu. Vom răspunde în termen de 30 de zile. Dacă solicitarea dumneavoastră privește prelucrări specifice unei campanii efectuate de un partener de campanie pentru propriile sale scopuri, sau corespondență deja livrată unei instituții publice ori altui operator independent, este posibil să fie necesar să contactați direct acel operator.</p>

        <h3>Securitatea datelor</h3>
        <ul>
          <li><strong>Criptare în tranzit:</strong> Utilizăm HTTPS/TLS sau protecții comparabile pentru datele transmise între browserul dumneavoastră și serviciile noastre, acolo unde acestea sunt disponibile.</li>
          <li><strong>Controale de acces:</strong> Utilizăm măsuri tehnice și organizatorice rezonabile, inclusiv controale de acces, pentru a limita accesul la datele personale la persoanele care au nevoie de acestea în scopuri operaționale legitime.</li>
          <li><strong>Autentificare:</strong> Accesul la cont este gestionat prin Clerk sau prin alt furnizor de autentificare configurat, cu propriile măsuri de securitate și controale operaționale.</li>
          <li><strong>Securitate forum:</strong> Instanța forumului Discourse este operată cu controale administrative, de acces și de mentenanță adecvate serviciului, astfel cum este configurat la momentul relevant.</li>
          <li><strong>Monitorizare:</strong> Putem utiliza jurnalizare, monitorizare și măsuri de răspuns la incidente pentru a detecta, investiga și răspunde la probleme de securitate sau fiabilitate.</li>
        </ul>

        <h3>Transferuri internaționale de date</h3>
        <p>Unii furnizori de servicii pot prelucra date în afara UE/SEE. Toate transferurile sunt protejate prin garanții adecvate, inclusiv:</p>
        <ul>
          <li>Clauze contractuale standard (CCS) aprobate de Comisia Europeană</li>
          <li>Decizii de adecvare, după caz</li>
          <li>Măsuri tehnice și organizatorice suplimentare</li>
        </ul>
        <p>În măsura în care operăm sau configurăm forumul Discourse cu găzduire în UE, datele forumului sunt destinate să rămână în UE/SEE, cu excepția situațiilor în care accesul, suportul, copiile de siguranță, operațiunile furnizorilor sau alte mecanisme legale de transfer fac necesar și permis un transfer internațional.</p>

        <h3>Luarea automată a deciziilor</h3>
        <p>Nu utilizăm luarea automată a deciziilor sau profilarea care produce efecte juridice sau vă afectează în mod similar semnificativ. Funcțiile îmbunătățite cu AI furnizează doar rezultate informative sau de asistență și nu iau decizii obligatorii despre sau în numele utilizatorilor.</p>

        <h3>Confidențialitatea copiilor</h3>
        <p>Serviciul este destinat persoanelor în vârstă de cel puțin 16 ani. Nu oferim cu bună știință conturi sau servicii persoanelor sub 16 ani. Anumite funcții care implică transmiterea de corespondență sau documente oficiale pot fi rezervate persoanelor de cel puțin 18 ani. Dacă considerați că am colectat date cu caracter personal de la o persoană sub vârsta minimă aplicabilă, vă rugăm să ne contactați imediat.</p>

        <h3>Modificări ale acestei politici</h3>
        <p>Putem actualiza această Politică de confidențialitate periodic pentru a reflecta schimbări în practicile noastre, funcții noi sau cerințe legale.</p>
        <ul>
          <li><strong>Notificarea modificărilor substanțiale:</strong> Pentru modificări substanțiale, vom furniza un preaviz de cel puțin 30 de zile prin publicarea politicii actualizate cu data viitoare de intrare în vigoare și trimiterea unei notificări prin email către titularii de conturi înregistrați.</li>
          <li><strong>Acceptare în aplicație:</strong> După data intrării în vigoare, vi se va solicita să revizuiți și să confirmați politica actualizată la următoarea autentificare.</li>
          <li><strong>Istoricul versiunilor:</strong> Versiunile anterioare ale acestei politici sunt disponibile la cerere, contactându-ne la contact@transparenta.eu.</li>
        </ul>

        <h3>Contact</h3>
        <p>Pentru întrebări despre această Politică de confidențialitate sau pentru exercitarea drepturilor dumneavoastră, scrieți-ne la contact@transparenta.eu</p>

        <h3>Autoritatea de supraveghere</h3>
        <p>Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), B-dul G-ral. Gheorghe Magheru 28-30, Sector 1, București, România. Website: anspdcp.ro</p>
      </div>
    </div>
  )
}
