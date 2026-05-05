# Dashboard Frontend

Энэ хавтас нь төслийн dashboard frontend хэсэг юм.

Үндсэн боломжууд:

- Asset dashboard UI
- Assets, reports, QR, census, transfer зэрэг дэлгэцүүд
- Backend GraphQL API-тэй холбогдоно
- Gemini chatbot widget агуулна

## Dependency суулгах

```powershell
cd C:\Projects\assets\assets-management-frontend\Dashboard-frontend
npm install
```

## Environment тохируулах

`assets-management-frontend/Dashboard-frontend\.env` файлд жишээ нь:

```env
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3000/api/graphql
GEMINI_API_KEY=your_gemini_key
```

Анхаарах зүйл:

- `NEXT_PUBLIC_GRAPHQL_URL` нь backend GraphQL route руу заана
- `GEMINI_API_KEY`-г server route ашиглах тул browser руу шууд ил гаргахгүй
- ижил env хувьсагчийг олон давтаж бичихгүй

## Frontend асаах

```powershell
npm run dev
```

Хэрэв `3000` порт backend ашиглаж байвал frontend дараагийн сул порт руу автоматаар орно.

Жишээ:

- `http://localhost:3001`
- `http://localhost:3002`

## Backend-тэй холбох

Backend эхэлж ассан байх ёстой:

```powershell
cd C:\Projects\assets\assets-management-backend
npm run dev
```

Дараа нь frontend-ээ асаана:

```powershell
cd C:\Projects\assets\assets-management-frontend\Dashboard-frontend
npm run dev
```

## Gemini chatbot

Chatbot нь dashboard дээр баруун доод буланд харагдана.

Ажиллах урсгал:

1. frontend нь `/api/gemini` route руу хүсэлт явуулна
2. route нь Gemini API руу server-side хүсэлт илгээнэ
3. хариулт нь Монгол кириллээр гарахаар тохируулсан

## Ашигтай командууд

```powershell
npm run dev
npm run build
npm run start
npm run lint
npm run codegen
```

## Түгээмэл асуудал

### `Couldn't find any pages or app directory`

`src/app` хавтас алга болсон эсвэл буруу байршилд орсон үед гарна.

Шалгах зам:

```text
assets-management-frontend/Dashboard-frontend/src/app
```

### `Another next dev server is already running`

Өмнөх `next dev` аль хэдийн ассан байна.

Шийдэл:

```powershell
taskkill /PID <PID> /F
```

эсвэл ажиллаж байгаа localhost URL-ээ ашиглана.

### `API Key not found`

- `GEMINI_API_KEY` хүчингүй
- env файл буруу
- route key-г зөв уншаагүй

### Англи, Монгол үсэг холилдох

Chatbot route дээр кириллээр хариулах system prompt өгсөн. Хэрэв хуучин хариу cache эсвэл хуучин dev instance ажиллаж байвал server-ээ restart хийнэ.

## Build ба deploy

```powershell
npm run build
npm run deploy
```

Preview:

```powershell
npm run preview
```

## Хавтасны бүтэц

```text
Dashboard-frontend/
├─ src/
├─ public/
├─ package.json
└─ .env
```
