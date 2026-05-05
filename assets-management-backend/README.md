# Assets Management Backend

Энэ хавтас нь төслийн backend хэсэг бөгөөд дараах үндсэн боломжуудтай:

- GraphQL API
- Gemini API route
- R2 presign upload route
- D1 / Drizzle-тэй холбоотой өгөгдлийн логик

## Ажиллуулахын өмнө

Шаардлагатай зүйлс:

- `Node.js`
- `npm`
- `.env.local` файл

## Dependency суулгах

```powershell
cd C:\Projects\assets\assets-management-backend
npm install
```

## Environment тохируулах

`assets-management-backend\.env.local` файлд хамгийн багадаа:

```env
GEMINI_API_KEY=your_gemini_key
```

Хэрэв дараах боломжуудыг ашиглаж байвал нэмэлт env хэрэгтэй:

- R2 upload
- email
- purchase request approval
- archive bucket

Жишээ нь repo дотор ашиглагдаж байгаа env-үүд:

- `GEMINI_API_KEY`
- `R2_S3_API`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `ARCHIVE_BUCKET_NAME`
- `APP_BASE_URL`
- `APPROVER_EMAIL`

## Local development

```powershell
npm run dev
```

Ердийн үед:

```text
http://localhost:3000
```

хаяг дээр асна.

## Гол route-ууд

- GraphQL: `http://localhost:3000/api/graphql`
- Gemini: `http://localhost:3000/api/gemini`
- R2 presign: `http://localhost:3000/api/r2/presign`

## Gemini API ашиглах

`POST /api/gemini`

Жишээ body:

```json
{
  "message": "Сайн байна уу?",
  "history": [
    { "role": "user", "content": "Өмнөх асуулт" },
    { "role": "assistant", "content": "Өмнөх хариулт" }
  ]
}
```

Онцлог:

- `Gemini 2.5 Flash` ашиглана
- Монголоор хариулахдаа кирилл ашиглахаар тохируулсан
- key нь зөвхөн server side дээр ашиглагдана

## Ашигтай командууд

```powershell
npm run dev
npm run build
npm run lint
npx tsc --noEmit
```

Database-тэй холбоотой:

```powershell
npm run db:pull
npm run db:push
npm run db:studio
```

Codegen:

```powershell
npm run graphql:codegen
npm run codegen
```

## Түгээмэл асуудал

### `spawn EPERM`

Ихэвчлэн sandbox, permission, эсвэл өөр process-оос шалтгаалдаг.

### `Another next dev server is already running`

Өмнө нь ассан `next dev` process үлдсэн байна.

Шийдэл:

```powershell
taskkill /PID <PID> /F
```

### `API Key not found`

- `GEMINI_API_KEY` буруу
- `.env.local` ачаалагдаагүй
- Cloudflare binding болон local env зөрсөн

### Cloudflare local dev асуудал

Хэрэв `wrangler` login эсвэл binding-с шалтгаалсан асуудал гарвал эхлээд энгийн `npm run dev`-ээр шалгана.

## Deploy

```powershell
npm run deploy
```

Preview:

```powershell
npm run preview
```
