# Leśna Przygoda — Kraina Mnożenia

Autorska, darmowa gra edukacyjna do tabliczki mnożenia, przeznaczona dla dzieci, ich rodziców i szkoły. Estetyka: autorska malowana leśna dobranocka inspirowana dawnymi polskimi ilustracjami, farbą plakatową, ręczną kreską, filcem i starym drukiem — bez kopiowania chronionych bohaterów.

## Co już działa

- 100 poziomów: od mnożenia przez 1 do ćwiczeń z liczbami do 100 × 100.
- Osiem działań na poziom, podpowiedzi, trzy gwiazdki, punkty, powtórki trudnych działań.
- Ręcznie stylizowany malowany pejzaż, lekka papierowa faktura i drewniano-kredowy interfejs na wszystkich ekranach.
- Pięć autorskich postaci: Miś Tuliś, Zajączek Hopik, Jeżyk Kropek, Sówka Mądralka i Wróbelek Ćwiruś.
- Responsywna oprawa 2D (SVG + CSS), bez WebGL/Three.js i bez zewnętrznych bibliotek grafiki.
- Subtelny ruch bohaterów z przełącznikiem „Mniej animacji”; respektowane ustawienia systemowe zmniejszenia ruchu.
- Lokalny, automatyczny zapis postępów przez `localStorage`, import i eksport pliku JSON do przenoszenia na inne urządzenie.
- Raport CSV z wynikami do przekazania wychowawcy **wyłącznie w uzgodniony, niepubliczny sposób**.
- Oddzielny tryb klasowy do wspólnego ćwiczenia przy tablicy, bez nadpisywania indywidualnego postępu.
- Brak kont, reklam, śledzenia, centralnej bazy danych i konieczności podawania imienia/nazwiska.

## Jak udostępnić na GitHub Pages

Repozytorium jest statyczne i nie wymaga żadnego buildu:

1. Otwórz **Settings → Pages** repozytorium.
2. W `Build and deployment` wybierz **Deploy from a branch**.
3. Wybierz `main` oraz `/(root)` i zapisz.
4. Gra będzie dostępna pod adresem `https://gawierzba.github.io/tabliczka-mnozenia/` po pomyślnym wdrożeniu Pages.

Gra nie korzysta z WebGL ani Three.js. Wszystkie ćwiczenia działają bez dodatkowych bibliotek 3D.

## Sterowanie

- **Polanka** — rozpoczęcie gry.
- **Etapy** — dostęp do 100 poziomów; ukończone można odtwarzać ponownie.
- **Dla dorosłych** — raport CSV, plik postępu, oddzielny tryb klasowy.
- Przycisk **Mniej animacji** ogranicza ruchy elementów interfejsu.

## Testy logiki

Uruchom lokalnie z katalogu repozytorium: `node --test tests/smoke.mjs`. Zestaw obejmuje 100 etapów, losowanie działań, tryb klasowy, zapisy i zgodność elementów interfejsu.

## Dane i bezpieczeństwo

Postęp pozostaje w pamięci przeglądarki i może zniknąć po usunięciu danych strony lub w trybie prywatnym. Dlatego regularnie pobieraj kopię JSON. Import pliku **zastępuje** postępy na aktualnym urządzeniu (za potwierdzeniem). Nie ma automatycznej synchronizacji między urządzeniami.

Zalecany jest **pseudonim zamiast imienia i nazwiska**. Plik postępu i raport mogą zawierać pseudonim oraz wyniki — nie publikuj ich. Ponieważ projekt nie ma bazy danych, nauczyciel nie widzi automatycznie wyników dzieci.

## Pliki

- `index.html` — semantyka strony i widoki
- `styles.css` — fundament układu responsywnego
- `vintage.css` — autorska stylistyka dawnej dobranocki: papier, farba, drewno i interfejs
- `app.js` — zadania, postępy, tryb klasowy, raporty
- `assets/` — 7 autorskich ilustracji SVG (pejzaż, faktura papieru i pięciu bohaterów)

© 2026 Leśna Przygoda — autorski projekt edukacyjny.

## Wersja graficzna — listopad 2026

Zastąpiono pierwotną, uproszczoną scenografię malowanymi ilustracjami i jednolitą retro oprawą strony startowej, ekranu mnożenia, mapy etapów, menu, kart oraz nagród. Wycofany eksperyment 3D nie jest już ładowany. Zachowano kompatybilność formatu postępów JSON (wersja 1).
