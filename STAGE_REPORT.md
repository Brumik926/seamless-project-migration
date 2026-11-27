# Správa o stave projektu a etapách implementácie

## 1. Prehľad zadania a referencií
Projekt **Tatra banka** predstavuje mobilnú webovú aplikáciu simulovaného internet bankingu postavenú na technológiách **React, TypeScript, Vite, Tailwind CSS, TanStack Router / Start** a **Supabase (PostgreSQL, RLS, RPC funkcie)**.

Dizajn a štruktúra vychádzajú z 23 dodaných referenčných screenshotov a podrobného PDF zadania:
- **Tmavý / svetlý režim**: Tmavý režim (pozadie `#000000`, sekcie `#1E1F24`, polia `#131417`, primárny akcent `#0A8CFF`, zisk `#1ED48C`, výdavok `#E5565B`).
- **Písmo**: Inter / systémové geometrické písmo s tabuľkovými číslicami (`tabular-nums`) pre presné zarovnanie súm.
- **Formátovanie súm**: Tvar `1 140,00 EUR` (oddeľovač tisícov medzera, čiarka pred centami).
- **Spodná navigácia**: Domov, Pohyby, Platba (centrálne vystúpené tlačidlo), voliteľná 4. položka (Karty/MaFin/Príjemcovia/Príkazy), Viac (Menu).

---

## 2. Stav jednotlivých etáp

### Etapa 1: Základ, dizajnový systém, databáza a prihlásenie
- **Stav: HOTOVO a otestované**
- Nastavené prostredie (Node v20, npm závislosti, arm64 rolldown pre prostredie mobilného Linuxu).
- Dizajnové tokeny v `src/styles.css` pre tmavý aj svetlý režim (vrátane prepínania v `user_settings`).
- Komponenty: `PageHeader`, `Section`, `Money`, `Iban`, `Avatar`, `BottomSheet`, `BottomNav`, polia formulárov (`TextField`, `SearchField`, `SelectField`), zástupné kostry (`Skeleton`).
- Autentifikácia: Úvodná obrazovka s grafikou (`/`), registrácia (`/auth?mode=register`), prihlásenie (`/auth?mode=login`), reset hesla, ochrana chránených trás (`/_authenticated/*`).
- Obrazovky: Osobný profil (`/profil`), Nastavenia (`/nastavenia` s voľbou témy a štvrtej záložky spodnej lišty).
- Testy smerovania a kompletný produkčný build (`vite build`) úspešne prebehli bez chýb.

### Etapa 2: Domov, účty a pohyby
- **Stav: HOTOVO v kóde, pripravené na overenie**
- Domovská obrazovka (`/domov`): sekcie Účty so sparkline grafom, Karusel kariet, Sporenia, Rýchla platba, Spending report (donut graf), Úvery, Pobočky/bankomaty a Kurzový lístok.
- Panel „Upraviť zobrazenie“ (`HomeEditSheet`) s prepínaním a poradím widgetov ukladaným do `user_settings`.
- Pohyby na účte (`/pohyby`): Zoskupenie transakcií po dňoch, fulltextové vyhľadávanie, filtre (obdobie, smer, kategórie), prepínanie účtov.
- Detail transakcie (`/transakcia/:id`): Protistrana, suma s farebným odlíšením, uhlíková stopa, symboly (VS, KS, ŠS), tlačidlá „Opakovať platbu“ a „Uložiť ako šablónu“.
- Detail účtu (`/ucet/:id`): Premenovanie účtu, zdieľanie IBAN, vyžiadanie platby, graf vývoja zostatkov a rozšírené informácie.

### Etapa 3: Platby
- **Stav: HOTOVO v kóde**
- Obrazovka Platba (`/platba`): Zmena platiteľa, výber príjemcu, validácia slovenského/zahraničného IBAN-u (modulo 97), dátum splatnosti (čo najskôr vs. konkrétny deň), symboly (VS, KS, ŠS).
- Kontrolný krok formulára a obrazovka potvrdenia transakcie (úspech / chyba).
- Serverová funkcia (`executePayment` cez RPC): Idempotency kľúč na zabránenie dvojitého odoslania, zablokovanie tlačidla pri spracovaní, atomické odpísanie a pripísanie peňazí pri prevode v rámci banky.

### Etapa 4: Príjemcovia, šablóny a trvalé príkazy
- **Stav: HOTOVO v kóde**
- Správa príjemcov (`/prijemcovia`): Pridanie nového príjemcu s validáciou IBAN, úprava, zmazanie, farebné iniciálové avatary.
- Šablóny platieb (`/sablony`): Uloženie platobnej šablóny z formulára alebo detailu, opätovné použitie jedným klikom do formulára platby.
- Trvalé príkazy (`/trvale-prikazy`): Nastavenie frekvencie (týždenne, mesačne, štvrťročne, ročne), dátum začiatku a konca, pozastavenie a zrušenie.

### Etapa 5: Karty a limity
- **Stav: HOTOVO v kóde**
- Prehľad kariet (`/karty`): Filtrovanie (Všetky, Debetné, Kreditné), vizuálne karty s maskovaným číslom.
- Detail karty a nastavenia limitov (`/karty/:id`): Blokovanie a odblokovanie karty, povolenie/zákaz internetových platieb a platieb v zahraničí, nastavenie denného limitu, limitu výberov a e-commerce limitu.

### Etapa 6: MaFin, notifikácie, ponuky, podpora a finálna kontrola
- **Stav: HOTOVO v kóde**
- MaFin (`/mafin`): Analýza rozpočtu, koláčový graf výdavkov podľa kategórií, história mesiacov, zmena kategórie transakcie.
- Notifikácie (`/notifikacie`): Zoznam upozornení na realizované platby a zmeny limitov, odznak s počtom neprečítaných správ.
- Ponuky a podpora: Obrazovka kontaktov (`/kontakty`), kurzový lístok (`/kurzy`), hlavné menu (`/menu`) sprístupňujúce všetky sekcie.

---

## 3. Výsledky testov a stav buildu
- **Unit & Routing testy**: `1 passed (100%)`
- **Vite Production Build**: `✓ built in 3.42s` (klient aj SSR bez chýb)
