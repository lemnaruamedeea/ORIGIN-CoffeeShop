# ORIGIN CoffeeShop

Magazin de cafea și accesorii, cu React, TypeScript, Vite, Medusa și PostgreSQL. Include AI Barista, Coffee Duel, Brew Lab interactiv, jurnal, pașaport, Mystery Tasting, favorite, recenzii, conturi, checkout guest și Stripe Sandbox.

## Publicare

- Netlify publică `storefront/dist`; configurația este în `netlify.toml`. Build: `npm run build`, directorul de bază rămâne rădăcina repository-ului.
- Render rulează backendul prin `backend/Dockerfile`, folosind o bază PostgreSQL Neon separată. Modelul gratuit este definit în `render.yaml`.
- Funcția Netlify `api-proxy` transmite `/api/*` la backend și păstrează cookie-urile HttpOnly pe domeniul magazinului. Configurează `ORIGIN_BACKEND_URL` în Netlify după crearea serviciului Render.
- Pentru e-mail, Render trimite cereri semnate HTTPS la funcția Netlify `send-mail`; parola de aplicație Gmail se configurează numai în Netlify. `MAIL_RELAY_SECRET` trebuie să fie identic pe cele două servicii și să aibă cel puțin 32 de caractere. Relay-ul nu acceptă mesaje fără semnătură validă.
- La prima pornire se creează catalogul fictiv, stocurile inițiale și tabelele aplicației. Baza de date locală, conturile clienților și comenzile locale nu sunt importate. Datele deja existente în baza găzduită nu sunt înlocuite la restart.
- Configurează un `ADMIN_EMAIL` și un `ADMIN_PASSWORD` propriu (minimum 12 caractere) în Render. Nu există un administrator public cu parolă implicită. După inițializare, parola administratorului nu este resetată la repornire.
- Stripe rămâne exclusiv în Sandbox. Configurează un webhook Stripe HTTPS către `https://BACKEND/hooks/payment/stripe_stripe` și secretul său în Render; listenerul local nu este folosit online.

Variabilele necesare sunt enumerate în `.env.example` și `backend/.env.example`. Nu introduce secrete în variabile `VITE_*`, Git sau în frontend.

## Limitări ale planurilor gratuite

Render Free poate opri serviciul după inactivitate; prima accesare poate dura aproximativ un minut. Joburile de e-mail se reiau când backendul este activ. Limitele de RAM și resurse pot afecta Medusa; verificarea unei publicări reușite este necesară înainte de a considera magazinul disponibil. Render Free nu permite SMTP pe porturile Gmail; funcția Netlify evită această limitare prin HTTPS. Fișierele încărcate ulterior în filesystemul Render nu sunt persistente. Imaginile din acest repository sunt statice; pentru uploaduri persistente este necesar un serviciu de obiecte. Neon are limite proprii pentru stocare și utilizare.

## Dezvoltare locală

`cd storefront && npm ci && npm run dev`. Backend: `cd backend && npm ci`, configurează variabilele local, apoi folosește scripturile Medusa. Configurația Vite transmite API-ul local la portul 9000.

Catalogul și identitatea comercială sunt fictive, create pentru un proiect academic. Datele geografice ale hărții provin din Natural Earth (domeniu public).
