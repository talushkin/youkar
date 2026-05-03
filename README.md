# UKAR – קבוצת WA קריוקי

A React (Vite) web app that lets customers pay for and request a personal karaoke sound file from any YouTube song.

## Flow

1. **Payment page** (`/`) — Shows the UKAR logo, feature list, and the UPay payment button (₪5).  
   After payment UPay redirects the customer to `/request`.
2. **Request page** (`/request`) — Customer pastes a YouTube link and identifies via phone number or Google Sign-In.  
   On submit the app POSTs to `https://be-tan-theta.vercel.app/api/pending` and shows a confirmation with the YouTube thumbnail.

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
```

## Environment variables

Create a `.env.local` file (see `.env.example`):

```
VITE_GOOGLE_CLIENT_ID=your-google-client-id-here
```

`VITE_GOOGLE_CLIENT_ID` is optional — omitting it hides the Google Sign-In option.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) → **Import** the `talushkin/youkar` repository.
3. Framework preset: **Vite** (auto-detected).
4. Add the environment variable `VITE_GOOGLE_CLIENT_ID` if needed.
5. Click **Deploy** — your app will be live at `https://youkar.vercel.app`.

The `vercel.json` in the root already configures SPA client-side routing.
