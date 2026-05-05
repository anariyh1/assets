# Assets Төслийн Заавар

Энэ repository нь 2 үндсэн хэсэгтэй.

- `assets-management-backend`
  Next.js дээрх backend, GraphQL API, Gemini API, R2 presign route зэрэг сервер талын логик энд байна.
- `assets-management-frontend/Dashboard-frontend`
  Dashboard frontend, хэрэглэгчийн интерфэйс, Gemini chatbot widget энд байна.

## Шаардлага

- `Node.js` суусан байх
- `npm` ажилладаг байх
- Хэрэв Cloudflare deploy хийх бол `wrangler` болон Cloudflare account хэрэгтэй

## Project Байршил

Төслийг OneDrive-оос гаргаж дараах байршилд байршуулсан:

```powershell
C:\Projects\assets
```

## 1. Dependency Суулгах

### Backend

```powershell
cd C:\Projects\assets\assets-management-backend
npm install
```

### Frontend

```powershell
cd C:\Projects\assets\assets-management-frontend\Dashboard-frontend
npm install
```

## 2. Environment Тохируулах

### Backend

`assets-management-backend\.env.local` файлд жишээ нь:

```env
GEMINI_API_KEY=your_gemini_key
```

Хэрэв R2, email, database зэрэг нэмэлт тохиргоо хэрэгтэй бол тухайн route эсвэл service ашиглаж байгаа env хувьсагчийг мөн нэмнэ.

### Frontend

`assets-management-frontend/Dashboard-frontend/.env` файлд жишээ нь:

```env
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3000/api/graphql
GEMINI_API_KEY=your_gemini_key
```

Анхаарах зүйл:

- `GEMINI_API_KEY`-г нэг л удаа тодорхойл
- frontend дээр Gemini key-г browser руу ил гаргахгүй, зөвхөн server route ашиглана

## 3. Backend Асаах

```powershell
cd C:\Projects\assets\assets-management-backend
npm run dev
```

Ердийн үед backend:

```text
http://localhost:3000
```

хаяг дээр асна.

Шалгах endpoint-ууд:

- `http://localhost:3000/api/graphql`
- `http://localhost:3000/api/gemini`

## 4. Frontend Асаах

```powershell
cd C:\Projects\assets\assets-management-frontend\Dashboard-frontend
npm run dev
```

Хэрэв `3000` порт backend ашиглаж байвал frontend автоматаар `3001` эсвэл дараагийн сул порт руу орно.

Жишээ:

- `http://localhost:3001`
- `http://localhost:3002`

## 5. Gemini Chatbot Ашиглах

Frontend дээр баруун доод буланд `AI Assistant` chatbot харагдана.

Ажиллах зарчим:

- frontend нь `/api/gemini` route руу хүсэлт илгээнэ
- route нь `Gemini 2.5 Flash` руу server-side хүсэлт явуулна
- хариулт нь Монгол хэлээр, кирилл үсгээр гарахаар тохируулсан

## 6. Ашигтай Командууд

### Backend

```powershell
npm run dev
npm run build
npx tsc --noEmit
npm run lint
```

### Frontend

```powershell
npm run dev
npm run build
npm run lint
```

## 7. Түгээмэл Асуудлууд

### `Another next dev server is already running`

Ижил project дээр өмнө нь `next dev` ассан байна гэсэн үг.

Шийдэл:

```powershell
taskkill /PID <PID> /F
```

эсвэл ажиллаж байгаа localhost хаягаа шууд ашиглана.

### `Couldn't find any pages or app directory`

Frontend source файл устсан эсвэл буруу байрлалд орсон үед гарна. `Dashboard-frontend/src/app` хавтас байх ёстой.

### `API Key not found`

- `GEMINI_API_KEY` буруу эсвэл хоосон байна
- env файлд нэгээс олон `GEMINI_API_KEY` давхар бичигдсэн байж магадгүй

### Port busy

Хэрэв `3000` busy бол Next дараагийн сул порт руу автоматаар орно.

## 8. Repo Бүтэц

```text
assets/
├─ assets-management-backend/
└─ assets-management-frontend/
   └─ Dashboard-frontend/
```

## 9. Тэмдэглэл

- Backend болон frontend-ийг тус тусад нь terminal дээр ажиллуулна
- Cloudflare-тэй холбоотой local dev асуудал гарвал эхлээд энгийн `npm run dev`-ээр шалга
- Gemini chatbot-ийн route backend болон frontend аль алинд нь server-side хамгаалалттай
