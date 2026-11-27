# Roadmap – Tatra banka (simulované bankovníctvo)

- [x] Aktuálna kontrola náhľadu: 15 stránok a detaily, opravená čitateľnosť kariet na Domov/v zozname/v detaile a upozornení; overené pri šírkach 320, 384 a 1280, výber príjemcu a kontrola platby bez odoslania, uloženie prečítania upozornení cez testovací účet; cloudové funkcie nezmenené.

- [x] Databáza: tabuľky, RLS, granty, seed demo dát pri registrácii, atomická platba (execute_payment), spracovanie plánovaných platieb a trvalých príkazov
- [x] Dizajn systém (tmavý/svetlý režim) podľa screenshotov
- [x] Prihlásenie / registrácia (e-mail + heslo, s potvrdením e-mailu)
- [ ] Obrazovky: domov, pohyby, detail transakcie, platba + kontrola + potvrdenie, príjemcovia, šablóny, trvalé príkazy, karty, detail karty + limity, MaFin, profil, kontakty, menu, nastavenia, notifikácie, kurzový lístok
- [ ] Spodná navigácia (voliteľná 4. položka) + hlavné menu s rozbaľovacími skupinami
- [ ] Detail účtu (premenovanie, zdieľať IBAN, vyžiadať platbu, vývoj zostatkov, viac informácií) – podľa nových screenshotov
- [ ] Kontakty: Zavolať, Zavolajte mi, Dohodnúť stretnutie (ukladá sa na server)
- [ ] Testy (IBAN, validácia platby), end-to-end overenie v prehliadači
- [ ] Názov: používateľ chcel „Tatra banka“ – nepoužité (skutočná banka, riziko phishingu); ostáva fiktívna „Tatra banka“
