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

## Fase 5.1 — Demo Seed API (untuk bantu testing Fase 5–7)

Bukan bagian dari bank soal produksi (itu tetap di Fase 8) — ini cuma jalan pintas dev-only supaya ada data `Attempt`-able saat testing Exam Flow, Result, dan Analytics, tanpa nunggu tooling import asli selesai.

- [ ] `src/app/api/seed/demo-test-package/route.ts` — Route Handler `GET`, **tanpa proteksi sesi/password dan tanpa query param** (sesuai permintaan eksplisit)
- [ ] Idempotent: cek dulu apakah paket demo sudah ada (mis. `TestPackage` dengan `name` unik penanda seperti `"DEMO - Seed Testing"`) via `count`/`findFirst` — kalau sudah ada, skip seeding dan return status `"skipped"`; kalau belum, baru seed dan return `"seeded"`
- [ ] Seed seminimal mungkin tapi tetap ngikutin `database.md`: 1 `TestPackage`, beberapa `TestPackageItem` (minimal lintas section MOJI_GOI/BUNPOU/DOKKAI — CHOUKAI opsional karena butuh asset audio), tiap item 2–3 `Question` + 4 `QuestionChoice`, `questionAnswer` terisi benar sesuai `codeAnswer`
- [ ] Minimal 1 soal pakai markup furigana `{漢字|かんじ}` dan 1 soal pakai underline `__teks__`, supaya rendering markup ikut ketes
- [ ] Minimal 1 `QuestionContext` (bacaan dipakai >1 soal) supaya alur dokkai/context ikut ketes
- [ ] Response JSON ringkas: `{ status: "seeded" | "skipped", testPackageId }`
- [ ] Dipanggil manual (browser/curl) saat butuh data testing, bukan bagian dari build/deploy pipeline

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

Bank soal asli/produksi (bukan data dummy testing — itu di [Fase 5.1](#fase-51--demo-seed-api-untuk-bantu-testing-fase-57)).

- [ ] Tooling/script import soal (manual atau AI-assisted extraction) dari paket JLPT asli, tangani pelanggaran unique constraint sebagai sinyal error ekstraksi (jangan silent skip)

## Fase 9 — Verifikasi & Polish

- [ ] `npm run build` setelah tiap perubahan struktural/server action/caching
- [ ] Audit data-leak guard: pastikan `questionAnswer`/`explanation` tidak pernah terkirim ke client sebelum attempt disubmit
- [ ] Cek tema light/dark (CSS variables shadcn) konsisten di semua halaman
- [ ] Uji manual end-to-end: register → login → pilih paket → kerjakan (mock test & latihan per seksi) → submit → lihat hasil → tambah comment → cek analytics
