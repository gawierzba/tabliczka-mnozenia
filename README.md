# Leśna Przygoda — Kraina Mnożenia

Autorska, darmowa gra edukacyjna do tabliczki mnożenia, przeznaczona dla dzieci, ich rodziców i szkoły. Estetyka: scenografia w stylu dawnych filmów lalkowych — bez wykorzystywania bohaterów objętych cudzymi prawami autorskimi.

## Co już działa

- 100 poziomów: od mnożenia przez 1 do ćwiczeń z liczbami do 100 × 100.
- Osiem działań na poziom, podpowiedzi, trzy gwiazdki, punkty, powtórki trudnych działań.
- Scena powitalna 2.5D, dostępna na każdym urządzeniu.
- **Opcjonalny teatr 3D**: proceduralna makieta z trójwymiarowym misiem, zającem, domkiem, lasem, dekoracjami zmieniającymi się wraz z dziesięcioma krainami, obracaniem kamery i dotykaniem bohaterów.
- Szybkie przejścia z teatru 3D do dziesięciu etapów wybranej krainy.
- Tryb oszczędzania grafiki, domyślna oszczędna jakość na telefonach, ograniczenie animacji; przy niedostępności WebGL pozostałe funkcje dalej działają.
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

Wersja 3D ładuje bibliotekę **Three.js 0.187.0** dopiero przy wejściu do teatru, ze stałego adresu CDN jsDelivr. Dlatego do pierwszego otwarcia 3D potrzebny jest dostęp do internetu. Gdy sieć CDN lub WebGL są niedostępne, ćwiczenia oraz dwuwymiarowa mapa nadal działają. Biblioteka Three.js jest udostępniana na licencji MIT: https://github.com/mrdoob/three.js/blob/master/LICENSE .

## Sterowanie

- **Polanka** — rozpoczęcie gry.
- **Świat 3D** — obracaj makietę przeciągając palcem/myszą, dotykaj postaci, wybieraj krainy 1–10.
- **Etapy** — dostęp do 100 poziomów; ukończone można odtwarzać ponownie.
- **Dla dorosłych** — raport CSV, plik postępu, oddzielny tryb klasowy.
- Przycisk **Mniej animacji** ogranicza ruchy w całej aplikacji. W teatrze 3D można dodatkowo wybrać jakość obrazu.

## Dane i bezpieczeństwo

Postęp pozostaje w pamięci przeglądarki i może zniknąć po usunięciu danych strony lub w trybie prywatnym. Dlatego regularnie pobieraj kopię JSON. Import pliku **zastępuje** postępy na aktualnym urządzeniu (za potwierdzeniem). Nie ma automatycznej synchronizacji między urządzeniami.

Zalecany jest **pseudonim zamiast imienia i nazwiska**. Plik postępu i raport mogą zawierać pseudonim oraz wyniki — nie publikuj ich. Ponieważ projekt nie ma bazy danych, nauczyciel nie widzi automatycznie wyników dzieci.

## Pliki

- `index.html` — semantyka strony i widoki
- `styles.css` — wygląd i wersja responsywna
- `app.js` — zadania, postępy, tryb klasowy, raporty
- `world3d.js` — scena Three.js, wczytywana na żądanie

© 2026 Leśna Przygoda — autorski projekt edukacyjny.
