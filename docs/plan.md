# Development Plan — JLPT Exam Platform

Rujukan: `project-overview.md` (routes & flow), `project-rules.md` (arsitektur/konvensi), `database.md` (schema & aturan data).

Checklist ini dikerjakan berurutan per fase (fase belakang bergantung pada fase depan). Centang `[x]` saat selesai & terverifikasi (bukan sekadar ditulis).

## Fase 0 — Setup & Konfigurasi Dasar

- [x] Init Next.js (App Router) — `create-next-app`
- [x] Setup Tailwind v4 + shadcn/ui (`components.json`, komponen dasar sudah ter-generate di `src/components/ui`)
- [x] Prisma schema awal lengkap (`User`, `TestPackage`, `TestPackageItem`, `QuestionContext`, `Question`, `QuestionChoice`, `QuestionComment`, `Attempt`, `AttemptAnswer`)
- [x] Migration awal dijalankan (`prisma/migrations/20260714151325`, `20260714154804`)
- [x] Install dependency inti: `bcryptjs`, `@types/bcryptjs`, `jose`, `zod`, `react-hook-form`, `@hookform/resolvers`
- [x] Tambah `SESSION_SECRET` ke `.env` (dan `.env.example`)
- [x] Kredensial Cloudinary sudah ada di `.env` (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)
- [x] `src/constants/index.ts` — validasi env vars pakai `zod` (fail fast jika ada yang hilang), export constants
- [x] `src/constants/cache-key.ts` — daftar cache key/tag terpusat untuk `unstable_cache`/`revalidateTag`
- [x] `src/lib/prisma.ts` — Prisma Client singleton (guard hot-reload dev)

## Fase 1 — Autentikasi & Session

- [x] `src/lib/auth.ts` — `createSession()`, `getSession()` (cached per request), `destroySession()` (JWT `jose` HS256, cookie `session` httpOnly+secure+sameSite=lax, expiry 7 hari)
- [x] `src/proxy.ts` — guard semua route kecuali `/`, `/first-time-setup`, `/login`; redirect ke `/login` jika tidak ada session. **Catatan breaking change:** di versi Next.js ini `middleware.ts` dideprecate → jadi `proxy.ts` (fungsi `proxy`), lihat `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
- [x] `src/features/auth/schemas.ts` — zod schema `RegisterSchema` (+ confirm password) & `LoginSchema`
- [x] Server action `registerAction` (first-time-setup): guard `count(User) === 0`, hash bcrypt cost 12, buat session
- [x] Server action `loginAction`: `bcrypt.compare`, pesan error generik ("Username atau password salah."), buat session
- [x] Server action `logoutAction`: `destroySession()`
- [x] `npm run build` sukses, `src/proxy.ts` terdeteksi sebagai "ƒ Proxy (Middleware)"

## Fase 2 — Route Group `(auth)`

- [x] Layout `(auth)` — `src/app/(auth)/layout.tsx`, container center tanpa sidebar
- [x] `/` — redirect logic: `count(User) === 0` → `/first-time-setup`; ada user tanpa session → `/login`; ada session → `/dashboard`
- [x] `/first-time-setup` — form registrasi (`RegisterForm`, react-hook-form + zodResolver), guard tertutup jika `count(User) > 0`
- [x] `/login` — form login (`LoginForm`), redirect ke `/dashboard` jika sudah ada session
- [x] **Bug ditemukan & diperbaiki**: Next.js men-static-kan `/` dan `/first-time-setup` karena tidak ada Request-time API yang terdeteksi di jalur eksekusi build — guard `count(User)` jadi ter-cache basi (celah keamanan: form registrasi tetap tampil ke publik setelah user pertama ada). Fix: `export const dynamic = "force-dynamic"` di kedua halaman. Diverifikasi via `npm run build` (kolom route berubah dari `○` ke `ƒ`).
- [x] shadcn versi ini tidak punya `Form` wrapper klasik (registry `form.json` kosong) — dipakai komponen `Field`/`FieldLabel`/`FieldError`/`FieldGroup` (`src/components/ui/field.tsx`) dikombinasikan manual dengan `react-hook-form`'s `register()` + `zodResolver`, bukan `useActionState`
- [x] Verifikasi: `npm run build` sukses, halaman ter-render dengan field form yang benar (dicek via curl), tidak ada error di log dev server. Testing interaktif submit form diserahkan ke user (manual di browser)

## Fase 3 — Route Group `(dashboard)` — Shell

- [x] Layout `(dashboard)` — `src/app/(dashboard)/layout.tsx`, pakai `SidebarProvider`/`SidebarInset`/`AppSidebar` (`components/ui/sidebar.tsx`), nav: Dashboard/Test Package/Analytics + tombol Keluar (`logoutAction`)
- [x] Guard session di layout (selain proxy): `getSession()` + cek user masih ada di DB, redirect `/login` jika tidak valid
- [x] `/dashboard` — `src/features/dashboard/actions.ts` (`getDashboardSummary`, di-cache per user via `unstable_cache` + `CACHE_TAGS.dashboardSummary`), tampilkan total attempt selesai + attempt terakhir + CTA ke `/test-package`
- [x] Verifikasi: `npm run build` sukses (`/dashboard` = `ƒ` dynamic), guard tanpa cookie redirect ke `/login` (dicek via curl), user konfirmasi `/dashboard` render `200` tanpa error di log dev server

## Fase 4 — Test Package

- [x] Server action `get`: `getTestPackages` (list, grouped di layer page pakai `JLPT_LEVEL_ORDER`), `getTestPackageDetail` (paket + testPackageItems + riwayat attempt user), `getTestPackageQuestions` (dump lengkap untuk mode baca) — `src/features/test-package/actions.ts`
- [x] `/test-package` — daftar paket dikelompokkan per level (N1 → N5, urutan eksplisit karena Postgres enum order beda dari yang diinginkan)
- [x] Komponen shared render markup teks Jepang: `src/lib/japanese-markup.ts` (parser rekursif, dukung nesting furigana-dalam-underline) + `src/components/japanese-text.tsx` (`<JapaneseText>`, prop `hideFuriganaInUnderline` untuk kasus `MOJI_GOI_READ_KANJI`)
- [x] `/test-package/[id]` — overview paket, waktu resmi JLPT per sesi (`src/constants/jlpt.ts`, sumber [jlpt.jp](https://www.jlpt.jp/e/guideline/testsections.html)), riwayat attempt + link hasil, tombol mulai mock test / latihan per seksi (`StartAttemptActions`)
- [x] Server action `mutate`: `createAttemptAction` (mock test `sectionScope=null` atau per-section) → redirect ke `/exam/[attemptId]/1`
- [x] `/test-package/[id]/questions` — mode baca: furigana, kunci jawaban (choice benar di-highlight), explanation, dan comment semua tampil (bukan mode pengerjaan jadi tidak kena guard data-leak `/exam`); grouping `QuestionContext` supaya bacaan bersama tidak diulang render per soal
- [x] Verifikasi: `npm run build` sukses (semua route baru `ƒ` dynamic), `npm run lint` bersih untuk kode baru (2 error lint yang ada murni di file boilerplate shadcn, tidak terkait Fase 4)

## Fase 5 — Exam Flow

- [x] `src/features/exam/schemas.ts` — `ExamAnswerSchema` + `SubmitExamSessionSchema` (per soal: `questionId`, `selectedAnswer` 1–4|null, `flagged`)
- [x] Exam context (`src/features/exam/components/exam-provider.tsx`) — state jawaban+flag per soal (keyed by `questionId`), persist ke `sessionStorage` (key `exam-state-{attemptId}-{session}`), hidrasi via `useLayoutEffect` sebelum paint
- [x] Server action `get` (`getExamQuestions`): exclude `questionAnswer` & `explanation` total (tidak di-select sama sekali, bukan cuma disembunyikan di UI), exclude `questionComments`, filter by `sectionScope` (latihan per seksi = gabungkan semua `TestPackageItem` section itu lintas `session` asli, jadi virtual "sesi 1" tunggal — sesuai `project-overview.md`), urutan `session → order → Question.order`
- [x] `/exam/[attemptId]/[session]` — halaman pengerjaan; navigasi via `?questionNumber=` + fallback (soal pertama yang belum dijawab, atau soal 1) kalau query param invalid/di luar range; furigana disembunyikan penuh (mode kerja) + aturan khusus `MOJI_GOI_READ_KANJI` (furigana dalam underline selalu disembunyikan)
- [x] Guard: attempt `COMPLETED` → redirect ke `/result/[attemptId]`; kepemilikan attempt divalidasi (`attempt.userId === session.userId`) di get & submit action
- [x] Server action submit sesi (`submitExamSessionAction`) — upsert `AttemptAnswer`, `isCorrect` dihitung ulang server-side dari kunci jawaban asli (tidak percaya client), `Attempt.status = COMPLETED` + `finishedAt` kalau sesi terakhir (section-scoped selalu langsung final di sesi 1), redirect ke sesi berikutnya atau `/result/[attemptId]`
- [x] **Breaking change lain ketemu**: `revalidateTag(tag)` 1-argumen sudah deprecated di versi ini — sekarang butuh `revalidateTag(tag, profile)`, atau pakai `updateTag(tag)` (khusus Server Action, cocok untuk read-your-own-writes) — dipakai untuk invalidasi cache dashboard setelah attempt selesai. Lihat `node_modules/next/dist/docs/.../updateTag.md`
- [x] Verifikasi: `npm run build` sukses (`/exam/[attemptId]/[session]` = `ƒ`), `npm run lint` bersih (1 error `react-hooks/set-state-in-effect` di-suppress sengaja untuk hidrasi `sessionStorage` — pola yang secara struktural butuh effect, bukan bug), guard tanpa cookie redirect ke `/login`

## Fase 5.1 — Demo Seed API (untuk bantu testing Fase 5–7)

Bukan bagian dari bank soal produksi (itu tetap di Fase 8) — ini cuma jalan pintas dev-only supaya ada data `Attempt`-able saat testing Exam Flow, Result, dan Analytics, tanpa nunggu tooling import asli selesai.

- [x] `src/app/api/seed/demo-test-package/route.ts` — Route Handler `GET`, **tanpa proteksi sesi/password dan tanpa query param** (sesuai permintaan eksplisit)
- [x] Idempotent: cek `TestPackage` dengan `name` unik penanda `"DEMO - Seed Testing"` via `findFirst` — kalau sudah ada, skip seeding dan return status `"skipped"`; kalau belum, baru seed dan return `"seeded"`
- [x] Seed: 1 `TestPackage` (N5), 4 `TestPackageItem` lintas section (`MOJI_GOI_READ_KANJI`, `MOJI_GOI_CONTEXT` di sesi 1; `BUNPOU_GRAMMAR`, `DOKKAI_SHORT_TEXT` di sesi 2 — CHOUKAI di-skip, butuh asset audio), tiap item 2 `Question` + 4 `QuestionChoice`, `questionAnswer` terisi benar
- [x] 2 soal pertama pakai markup furigana `{漢字|かんじ}` dalam underline `__teks__` (menguji aturan sembunyi-furigana `MOJI_GOI_READ_KANJI`)
- [x] 1 `QuestionContext` (bacaan) dipakai bersama oleh 2 soal `DOKKAI_SHORT_TEXT`
- [x] Response JSON ringkas: `{ status: "seeded" | "skipped", testPackageId }`
- [x] **Fix**: route ini awalnya ikut ke-redirect ke `/login` oleh guard `src/proxy.ts` (semua route diproteksi kecuali daftar publik) — ditambahkan `PUBLIC_PREFIXES = ["/api/seed/"]` di `proxy.ts` supaya endpoint dev-only ini benar-benar tanpa proteksi sesuai permintaan
- [x] Verifikasi: dipanggil manual via curl — call pertama `{"status":"seeded","testPackageId":1}`, call kedua `{"status":"skipped","testPackageId":1}`; isi data dicek query langsung ke DB, sesuai rencana (8 soal, 4 mondai, furigana/underline & context bacaan bersama)

## Fase 6 — Hasil & Review

- [x] Server action `get` summary (`getAttemptSummary`, di-cache per attempt via `CACHE_TAGS.attemptSummary`): skor %, total benar/salah/tidak dijawab/flag, durasi. Guard: attempt bukan milik user → `notFound()`; belum `COMPLETED` → redirect balik ke `/test-package/[id]`
- [x] `/result/[attemptId]` — tampilkan summary + link ke review lengkap
- [x] Server action `get` detail (`getAttemptDetail`, tidak di-cache karena termasuk comment yang harus read-your-own-writes): kunci jawaban, explanation, comment, plus jawaban user & `isCorrect` per soal (join `attemptAnswers` di-filter by `attemptId`)
- [x] `/result/[attemptId]/detail` — soal + jawaban user (badge benar/salah/tidak dijawab, pilihan user & kunci di-highlight beda warna) + explanation + comment, furigana tampil (termasuk aturan `MOJI_GOI_READ_KANJI`)
- [x] Server action `mutate`: `addQuestionCommentAction` — tambah `QuestionComment`, invalidasi cache `testPackageQuestions` (mode baca) via `updateTag` supaya comment baru ikut muncul di sana juga; halaman detail sendiri langsung fresh (`router.refresh()`) karena tidak di-cache
- [x] Verifikasi: `npm run build` sukses (`/result/[attemptId]`, `/result/[attemptId]/detail` = `ƒ`), `npm run lint` bersih (1 warning unused import dibersihkan)

## Fase 7 — Analytics

- [x] Server action `getAnalytics` (di-cache per user via `CACHE_TAGS.analytics`): tren skor per attempt, kelemahan per `mondaiType` & per `section` — agregasi manual di JS (bukan Prisma `groupBy`, karena `mondaiType`/`section` dua relasi jauh dari `AttemptAnswer`), filter `Attempt.status = COMPLETED` (otomatis exclude `ABANDONED` & `IN_PROGRESS`)
- [x] Cache analytics diinvalidasi (`updateTag`) bareng dashboard summary saat attempt selesai di `submitExamSessionAction`
- [x] `/analytics` — chart pakai `recharts` (dibungkus `components/ui/chart.tsx`): line chart tren skor, bar chart horizontal kelemahan per mondai & per section. **Cek dulu skill dataviz** sebelum nulis chart — ternyata tema project ini monokrom murni (`--chart-1..5` semua abu-abu, cuma `--destructive` berwarna), jadi dipakai satu hue netral untuk magnitude (bukan palet kategorikal baru → validator palet tidak perlu dijalankan), dan `--destructive` dipakai spesifik sebagai status-flag bar di bawah 60% akurasi (bukan identitas seri)
- [x] Verifikasi: `npm run build` sukses (`/analytics` = `ƒ`), `npm run lint` bersih, guard tanpa cookie redirect ke `/login`

## Fase 7.1 — Sidebar untuk Exam/Result + Halaman History

Perubahan dari feedback user setelah testing: `/exam` dan `/result` awalnya sengaja tanpa sidebar (mode fokus), tapi user ingin tetap ada sidebar di situ. Juga belum ada entry point untuk lihat attempt lama selain lewat halaman per-paket — perlu halaman `/history` lintas paket.

- [x] Pindahkan `/exam/[attemptId]/[session]` ke dalam route group `(dashboard)` supaya dapat sidebar & guard dari layout situ — hapus `src/app/exam/layout.tsx` (guard terpisah jadi redundan)
- [x] Pindahkan `/result/[attemptId]` & `/result/[attemptId]/detail` ke dalam route group `(dashboard)` — ganti `src/app/result/layout.tsx` jadi nested layout ringan (cuma wrapper max-width, sidebar & guard sudah dari parent)
- [x] Hilangkan padding dobel di `ExamRunner` (parent layout `(dashboard)` sekarang sudah kasih `p-4`)
- [x] `src/features/history/actions.ts` — `getAttemptHistory()`: semua attempt milik user lintas paket, terbaru dulu
- [x] `/history` — daftar semua attempt (nama paket, level, mode mock/seksi, status, tanggal), tombol "Lihat Hasil"/"Review" ke `/result/[attemptId]` & `/result/[attemptId]/detail` untuk yang `COMPLETED`
- [x] Tambah menu "History" di `AppSidebar`
- [x] Update `docs/project-overview.md` — route table: `/exam` & `/result` dicatat sebagai bagian dari group `(dashboard)`, tambah baris `/history`
- [x] Verifikasi: `npm run build` sukses (semua route lama tetap resolve ke URL yang sama, `/history` baru muncul), `npm run lint` bersih

## Fase 8 — Bank Soal (Data)

Bank soal asli/produksi (bukan data dummy testing — itu di [Fase 5.1](#fase-51--demo-seed-api-untuk-bantu-testing-fase-57)).

- [ ] Tooling/script import soal (manual atau AI-assisted extraction) dari paket JLPT asli, tangani pelanggaran unique constraint sebagai sinyal error ekstraksi (jangan silent skip)

## Fase 9 — Verifikasi & Polish

- [ ] `npm run build` setelah tiap perubahan struktural/server action/caching
- [ ] Audit data-leak guard: pastikan `questionAnswer`/`explanation` tidak pernah terkirim ke client sebelum attempt disubmit
- [ ] Cek tema light/dark (CSS variables shadcn) konsisten di semua halaman
- [ ] Uji manual end-to-end: register → login → pilih paket → kerjakan (mock test & latihan per seksi) → submit → lihat hasil → tambah comment → cek analytics
