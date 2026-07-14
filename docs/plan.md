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

- [ ] `src/lib/auth.ts` — `createSession()`, `getSession()`, `destroySession()` (JWT `jose` HS256, cookie `session` httpOnly+secure+sameSite=lax, expiry 7 hari)
- [ ] `middleware.ts` — guard semua route kecuali group `(auth)` & static assets, redirect ke `/login` jika tidak ada session
- [ ] `src/features/auth/schemas.ts` — zod schema register & login (dipakai bareng form client + server action)
- [ ] Server action register (first-time-setup): guard `count(User) === 0`, hash bcrypt cost 12, buat session
- [ ] Server action login: `bcrypt.compare`, pesan error generik ("invalid credentials"), buat session
- [ ] Server action logout: `destroySession()`

## Fase 2 — Route Group `(auth)`

- [ ] Layout `(auth)`
- [ ] `/` — redirect logic: `count(User) === 0` → `/first-time-setup`; ada user tanpa session → `/login`; ada session → `/dashboard`
- [ ] `/first-time-setup` — form registrasi, guard tertutup jika `count(User) > 0`
- [ ] `/login` — form login, redirect ke `/dashboard` jika sudah ada session

## Fase 3 — Route Group `(dashboard)` — Shell

- [ ] Layout `(dashboard)` dengan sidebar (pakai `components/ui/sidebar.tsx`)
- [ ] Guard session di layout (selain middleware)
- [ ] `/dashboard` — attempt terakhir, statistik ringkas, CTA ke test package

## Fase 4 — Test Package

- [ ] Server action `get`: daftar test package (grouped per `jlptLevel`), detail test package by id
- [ ] `/test-package` — daftar paket dikelompokkan per level (N1, N2, ...)
- [ ] Komponen shared render markup teks Jepang: `{漢字|かんじ}` furigana, `__teks__` underline, `[_]`/`[★]` slot — dipakai di banyak halaman
- [ ] `/test-package/[id]` — overview paket, riwayat attempt + hasil, info waktu resmi per sesi, tombol mulai mock test / latihan per seksi
- [ ] Server action `mutate`: `createAttempt` (mock test `sectionScope=null` atau per-section) → redirect ke `/exam/[attemptId]/[session]`
- [ ] `/test-package/[id]/questions` — mode baca (furigana + comment tampil, bukan mode pengerjaan)

## Fase 5 — Exam Flow

- [ ] `src/features/exam/schemas.ts` — zod schema submit jawaban per sesi
- [ ] Exam context (React Context) — state jawaban + flag per soal, persist ke `sessionStorage`
- [ ] Server action `get` soal untuk attempt — **wajib** exclude `questionAnswer` & `explanation`, filter by `sectionScope`, urutan `TestPackageItem.session → order → Question.order`
- [ ] `/exam/[attemptId]/[session]` — halaman pengerjaan; navigasi via `?questionNumber=` + fallback jika query param invalid/di luar range
- [ ] Guard: attempt `COMPLETED` → redirect ke `/result/[attemptId]`
- [ ] Server action submit sesi — upsert `AttemptAnswer` (unique `[attemptId, questionId]`), hitung `isCorrect`, set `Attempt.status = COMPLETED` + `finishedAt` jika sesi terakhir

## Fase 6 — Hasil & Review

- [ ] Server action `get` summary attempt (nilai, total benar/salah/tidak dijawab/flag)
- [ ] `/result/[attemptId]` — tampilkan summary
- [ ] Server action `get` detail review (include kunci jawaban, explanation, comment — attempt sudah selesai jadi aman dikirim)
- [ ] `/result/[attemptId]/detail` — soal + jawaban user + kunci + explanation, furigana & comment tampil
- [ ] Server action `mutate`: tambah `QuestionComment` baru per soal dari halaman detail

## Fase 7 — Analytics

- [ ] Server action analitik: skor per attempt, tren, kelemahan per `mondaiType`/section — join `AttemptAnswer → Question → TestPackageItem`, filter `Attempt.status = COMPLETED` (exclude `ABANDONED`)
- [ ] `/analytics` — rapor hasil belajar (chart pakai `recharts`)

## Fase 8 — Bank Soal (Data)

- [ ] Tooling/script import soal (manual atau AI-assisted extraction), tangani pelanggaran unique constraint sebagai sinyal error ekstraksi (jangan silent skip)
- [ ] Seed minimal 1 paket lengkap untuk development/testing end-to-end

## Fase 9 — Verifikasi & Polish

- [ ] `npm run build` setelah tiap perubahan struktural/server action/caching
- [ ] Audit data-leak guard: pastikan `questionAnswer`/`explanation` tidak pernah terkirim ke client sebelum attempt disubmit
- [ ] Cek tema light/dark (CSS variables shadcn) konsisten di semua halaman
- [ ] Uji manual end-to-end: register → login → pilih paket → kerjakan (mock test & latihan per seksi) → submit → lihat hasil → tambah comment → cek analytics
