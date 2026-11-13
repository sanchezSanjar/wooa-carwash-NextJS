# 우아세차 (Wooa Carwash) admin

The admin website for Wooa Carwash, a subscription car wash for apartment complexes. Built with Next.js 16, React 19, TypeScript and Tailwind CSS 4. The backend (NestJS API and scheduled jobs) is in [wooa-carwash](https://github.com/sanchezSanjar/wooa-carwash), the customer app and website in [wooa-carwash-app](https://github.com/sanchezSanjar/wooa-carwash-app).

## Pages

| Page | What it does |
| --- | --- |
| Overview | Today's washes, unpaid and overdue bills, active plans, today's route, and what needs attention (overdue bills, rain tomorrow, members without a password, low ratings) |
| Day sheet | One day's route: order, washer, notes, mark washed or skipped, move a car to another day, add missed or upcoming cars, photos, Excel export and import |
| Payments | A month's bills with totals, unpaid / overdue / paid filters, mark paid (bank transfer, cash, card) or unpaid |
| Members | Search, add a member (they get an SMS invite), edit details, change role, block, see their cars and plans |
| Cars and plans | Every active plan with wash days, extras, monthly price, next wash, recent results; cancel a plan |
| Plans and prices | Change prices (new plans only) and show or hide plans and extras |
| Reviews | Ratings and comments, average, low ratings first if needed |

Korean by default, with an English switch. Plan names, API errors and Excel files follow the same language.

## Security

- Only admin accounts can log in. The login token is kept in an **httpOnly, SameSite=Strict cookie**: page scripts can't read it.
- The browser never calls the API directly. `/api/proxy/*` adds the token from the cookie and forwards the request to the API. Requests that change data must come from this site (Origin check).
- Logging out also ends the token on the API. When the API answers 401, the cookie is removed and you go back to the login page.
- Pages send `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: same-origin`; the site asks search engines not to index it.

## Run it

```bash
cp .env.example .env.local   # WOOA_API_URL: where the API runs, e.g. http://localhost:3000
npm install
npm run dev                  # http://localhost:3000 (use -p 3100 if the API already uses 3000)
```

```bash
npm run build
npm start
```

On the server, run it behind nginx with HTTPS (the cookie is `Secure` in production) and set `WOOA_API_URL` to the API's internal address. Add the admin site's address to the API's `CORS_ORIGINS` only if the browser should call the API directly; with this proxy it doesn't need to.

## Code

- `src/app/(admin)/` pages, `src/app/login/` login, `src/app/api/` login, logout and the proxy
- `src/proxy.ts` sends visitors without a login to `/login`
- `src/components/` shared UI, the day sheet, members and plan dialogs
- `src/lib/` API calls, types, formats (dates, won, wash days) and translations (`ko.ts`, English text is the key)
