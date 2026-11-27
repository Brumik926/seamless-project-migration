# Kontrola a doladenie 23 referenčných strán

**Dátum:** 27. 11. 2026  
**Rozsah:** lokálna úprava zdrojového ZIP projektu podľa 23-stranového `screenshot-banka.pdf`, zadania agenta a dodaného APK dumpu.  
**Bezpečnostný režim:** bez commitov, pushov, uploadov, nasadenia a bez zásahov do vzdialeného Supabase. SQL migrácie, databázové tabuľky, RLS a autentifikácia zostali nezmenené.

## 1. Mapa referenčných strán

| Strana | Obrazovka / stav | Implementácia |
|---:|---|---|
| 1 | Uvítanie, prihlásenie a verejné skratky | `src/routes/index.tsx`, `src/routes/auth.tsx` |
| 2 | Platba – platiteľ, príjemca, suma a splatnosť | `src/routes/_authenticated/platba.tsx` |
| 3 | Výber príjemcu – Všetky | `src/components/bank/RecipientPicker.tsx` |
| 4 | Výber príjemcu – Príjemcovia | `src/components/bank/RecipientPicker.tsx` |
| 5 | Výber príjemcu – Šablóny | `src/components/bank/RecipientPicker.tsx` |
| 6 | Upraviť zobrazenie | `src/components/bank/HomeEditSheet.tsx` |
| 7 | Domov – účty a karty | `src/routes/_authenticated/domov.tsx` |
| 8 | Domov – sporenia, rýchla platba a prehľad výdavkov | `domov.tsx`, `src/components/bank/CategoryDonut.tsx` |
| 9 | Domov – úvery, pobočky, bankomaty a kurzy | `domov.tsx`, `src/lib/rates.ts` |
| 10 | Pohyby na účte – horná časť | `src/routes/_authenticated/pohyby.tsx` |
| 11 | Pohyby na účte – ďalšia časť zoznamu | `pohyby.tsx`, `src/components/bank/TransactionRow.tsx` |
| 12 | Detail účtu – informácie a zostatky | `src/routes/_authenticated/ucet.$id.tsx` |
| 13 | Detail účtu – odmeňovanie a účet pre modrú planétu | `ucet.$id.tsx` |
| 14 | Detail účtu – účet, rýchle akcie a zostatok | `ucet.$id.tsx` |
| 15 | Kontakt / DIALOG Live | `src/routes/kontakty.tsx` |
| 16 | Zoznam kariet | `src/routes/_authenticated/karty.index.tsx` |
| 17 | Kontakt – druhý referenčný záber | `kontakty.tsx` |
| 18 | Profil | `src/routes/_authenticated/profil.tsx` |
| 19 | Hlavné menu | `src/routes/_authenticated/menu.tsx` |
| 20 | Ponuky – firemné financie | `src/routes/_authenticated/ponuky.tsx` |
| 21 | Pohyby na účte – ďalší výrez histórie | `pohyby.tsx` |
| 22 | Ponuky – osobné financie | `ponuky.tsx` |
| 23 | Platba – spodná časť a ostatné údaje | `platba.tsx` |

PDF má 23 strán, ale časť z nich sú alternatívne karty alebo pokračovania tej istej obrazovky, nie 23 samostatných trás.

## 2. Vykonané lokálne úpravy

- `src/components/bank/Logo.tsx` – pôvodný symbol bol nahradený značkou z troch šikmých pruhov a otvoreného rámu podľa dodaného obrázka. Zachované sú aj pôvodné exporty `VegaMark` a `VegaWordmark`, aby sa nerozbili existujúce importy.
- `src/components/bank/BottomNav.tsx` – predvolená štvrtá položka zobrazuje **Ponuky** podľa referenčných strán; existujúci uložený kľúč `karty` sa mapuje na `/ponuky`, takže nebola potrebná zmena databázového obmedzenia ani migrácia. Karty zostávajú dostupné cez existujúce obrazovky a menu.
- `src/components/bank/RecipientPicker.tsx` – doplnené tri referenčné karty Všetky / Príjemcovia / Šablóny, počty záznamov a možnosť pridať príjemcu priamo z výberu v platbe. Nový IBAN sa validuje pred uložením; uloženie používa existujúcu službu a invalidáciu query dát.
- `src/components/bank/HomeEditSheet.tsx` – panel úpravy domovskej obrazovky má dvojstupňovú štruktúru podľa strany 6; hlavná obrazovka obsahuje dve navigačné voľby a až po otvorení sa zobrazia prepínače alebo výber štvrtej položky.
- `src/routes/_authenticated/ucet.$id.tsx` – doplnené sekcie Program odmeňovania a Účet pre modrú planétu podľa strán 13–14. Hodnoty a aktivácia sú výslovne označené ako ukážkové; nie sú predstierané ako živé bankové služby.
- `src/routes/_authenticated/ponuky.tsx` – prepínanie Osobné / Firemné financie je podčiarknuté, akordeónové riadky sú oddelené a rozbaľujú sa po jednej kategórii; nereferenčný promo blok bol odstránený. Texty vysvetľujú, že ide o neoficiálny simulátor.
- `src/routes/_authenticated/domov.tsx` – „Spending report“ bol lokalizovaný na „Prehľad výdavkov“.
- `src/routes/_authenticated/menu.tsx` – odhlasovacia akcia používa konzistentný názov „Odhlásiť sa“.
- `src/routes/kontakty.tsx` – rozloženie je bližšie DIALOG Live referencii; obrazovkové zdieľanie je priznané ako nedostupné, e-mail je pod „Viac možností“ a fiktívne kontakty sú jasne označené.
- `src/components/bank/CardVisual.tsx`, `src/routes/auth.tsx` – upravené proporcie loga po výmene značky.

## 3. Zachované časti

- Existujúce routy, Supabase klienti, hooky, služby a dátové väzby.
- SQL migrácie, databázové schémy, RLS pravidlá a autentifikácia.
- Simulované/testovacie finančné údaje a simulované platby.
- Existujúce funkcie účtov, histórie pohybov, platieb, kariet, limitov, príjemcov, šablón, trvalých príkazov, notifikácií a profilu.

## 4. Overenie

- TypeScript/TSX syntaktické parsovanie cez dostupný TypeScript compiler: **121 súborov, 0 syntaktických diagnostík**.
- Plný TypeScript typecheck: **neprebehol** – chýbajú nainštalované typy `vite/client` a `vitest/globals`.
- Produkčný build: **neprebehol** – `vite: not found`.
- Automatické testy: **neprebehli** – `vitest: not found`.
- ESLint: **neprebehol** – `eslint: not found`.
- Pokus o lokálne `npm install` sa nedokončil v časovom limite; pracovný priečinok preto nemá `node_modules`.
- Nebol vykonaný integračný test proti živému Supabase ani browser end-to-end test. Žiadny úspešný build ani test sa preto nevyhlasuje.

## 5. Zostávajúce rozdiely a riziká

1. Detail účtu má teraz vizuálne bloky odmeňovania a modrej planéty, ale tieto dve oblasti nie sú napojené na samostatné databázové funkcie. Ich CTA úmyselne iba vysvetľujú obmedzenie simulátora.
2. Pobočky, bankomaty a kurzový lístok používajú existujúce ukážkové dáta; neboli vydávané za živé lokalizačné ani kurzové údaje.
3. Profil obsahuje funkčné údaje, ktoré existujú v databázovej schéme, ale nie všetky položky originálnej profilovej obrazovky majú zodpovedajúce dátové polia.
4. Zdieľanie obrazovky z kontaktnej obrazovky nie je implementované; tlačidlo pravdivo oznamuje nedostupnosť v prototype.
5. Pred ďalším nasadením treba po obnovení závislostí spustiť build, typecheck, lint, testy a vizuálne overenie na reálnom mobilnom viewport-e v oboch témach.

## 6. Zmenené súbory

- `src/components/bank/Logo.tsx`
- `src/components/bank/BottomNav.tsx`
- `src/components/bank/RecipientPicker.tsx`
- `src/components/bank/HomeEditSheet.tsx`
- `src/components/bank/CardVisual.tsx`
- `src/routes/_authenticated/ucet.$id.tsx`
- `src/routes/_authenticated/ponuky.tsx`
- `src/routes/_authenticated/domov.tsx`
- `src/routes/_authenticated/menu.tsx`
- `src/routes/auth.tsx`
- `src/routes/kontakty.tsx`

**Rozsah zásahu:** iba lokálne zdrojové súbory a tento auditný dokument. Žiadne zmeny GitHubu, Vercelu, databázy ani vzdialených služieb.
