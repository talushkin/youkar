# youkar

עמוד בקשות, תשלום וקבלת קישורי CDN של YouKar.

## Flow

1. Insert YouTube link.
2. Watch clip preview.
3. Click `Create Karaoke` to add to pending queue.
4. Pay via UPay.
5. After payment, return to `after-payment` and wait for CDN download links.

## Local Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Environment Variables

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_RETURN_URL` (example: `https://youkar.vercel.app/after-payment`)
- `BACKEND_BASE_URL` (example: `https://be-tan-theta.vercel.app`)
- `BACKEND_CDN_PATH` (default: `/api/cdn-links`)
- `BACKEND_SUBMIT_PATH` (default: `/api/wa/{phone}`)
- `API_BEARER` (if backend requires bearer auth)

## API Endpoints In This App

- `POST /api/create-karaoke`: adds a new item to backend pending queue.
- `POST /api/submit-request`: sends WhatsApp/phone identification request to backend.
- `GET /api/cdn-links?videoId=...`: fetches/normalizes CDN download links.
