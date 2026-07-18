# Text Parser — Rendering Bacaan Panjang (Dokkai)

Dokumen desain, belum diimplementasi. Latar belakang: setelah input data real (`n2-2017-07.json`
dkk), ditemukan beberapa soal `DOKKAI_*` yang tampil membingungkan di UI — bukan karena datanya
salah, tapi karena renderer teksnya (`JapaneseText`, dibuat di Fase 4) belum menangani struktur
dokumen panjang sama sekali.

## Ruang Lingkup

Cuma `QuestionContext.storyText` (bacaan dokkai) yang kena. Dicek: **12/12** context di
`n2-2017-07.json` mengandung `\n`, jadi ini bukan kasus tepi — ini bug yang kena ke hampir semua
soal dokkai bacaan panjang/menengah. `questionText`, `answerText`, `instruction` aman — itu
selalu 1 kalimat pendek tanpa line break, tidak perlu diubah. `MOJI_GOI`/`BUNPOU` juga aman
sesuai dugaan awal user.

## Akar Masalah

`JapaneseText` (`src/components/japanese-text.tsx`) + `parseJapaneseMarkup`
(`src/lib/japanese-markup.ts`) cuma paham markup INLINE: furigana `{漢字|かんじ}`, underline
`__teks__`, slot `[_]`/`[★]`. Karakter `\n` di dalam string cuma ikut numpuk jadi bagian dari
segment `{ type: "text", value: "...\n..." }`, lalu dirender apa adanya ke dalam `<span>`. Browser
secara default meng-collapse whitespace (termasuk `\n`) di HTML — jadi walau datanya sudah benar
punya baris baru, hasilnya tetap satu baris panjang menyambung. Tidak ada juga konsep "dokumen
dengan banyak blok" (paragraf vs tabel vs 2 bagian teks) — semuanya diperlakukan sebagai satu
aliran teks inline.

## Temuan Konkret (referensi `n2-2017-07.json`)

| Context | Masalah | Akar penyebab |
|---|---|---|
| `ctx-dokkai-10-3` (memo kantor) | Tanggal/pengirim/subjek/isi/penutup "以上" nyambung jadi satu baris | Line break collapse |
| `ctx-dokkai-10-4` | `(注)` nempel ke paragraf sebelumnya | Line break collapse |
| `ctx-dokkai-11-1` | Paragraf + 7 baris `(注1)`–`(注7)` nyambung semua | Line break collapse |
| `ctx-dokkai-12` | 2 teks `【A】`/`【B】` tampil sebagai 1 paragraf, cuma dibedakan tanda `【A】` inline | Tidak ada parsing "multi-section", + line break collapse |
| `ctx-dokkai-13` | Paragraf-paragraf + `(注1)`–`(注7)` nyambung | Line break collapse |
| `ctx-dokkai-14` | Sintaks tabel markdown (`\| kolom \| kolom \|`) tampil sebagai teks mentah dengan `\|` literal | Tidak ada parsing tabel sama sekali |

## Desain yang Diusulkan

### 1. Layer baru: `parseJapaneseDocument` (block-level), di atas `parseJapaneseMarkup` yang sudah ada

`parseJapaneseMarkup` (inline: furigana/underline/slot) **tidak berubah** — tetap dipakai apa
adanya per baris/per sel tabel. Ditambahkan layer baru untuk struktur blok:

```ts
// src/lib/japanese-document.ts (baru)
type DocumentBlock =
  | { type: "paragraph"; lines: string[] }        // dipisah oleh \n tunggal dalam satu paragraf
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "section"; label: string; blocks: DocumentBlock[] }; // untuk 【A】/【B】

function parseJapaneseDocument(text: string): DocumentBlock[]
```

Algoritma (garis besar):

1. **Deteksi section marker** `【X】` (1 karakter/label pendek, mis. `【A】`/`【B】`) di awal baris.
   Kalau ketemu ≥2, pecah teks jadi beberapa `section` block berdasarkan marker itu, lalu proses
   isi tiap section secara rekursif (langkah 2-3). Kalau tidak ada marker, seluruh teks diproses
   langsung sebagai satu deretan block (langkah 2-3).
2. Pecah per blok berdasarkan baris kosong (`\n\n`) → tiap blok kandidat jadi 1 `paragraph` ATAU
   1 `table`.
3. Deteksi tabel: kalau baris-baris dalam satu blok match pola `| ... | ... |` + baris pemisah
   `|---|---|`, parse jadi `table` (header row + separator + body rows). Selain itu → `paragraph`,
   dipecah lagi per `\n` tunggal jadi `lines: string[]`.

### 2. Komponen baru untuk render

`JapaneseText` (existing) tetap dipakai apa adanya untuk teks 1-baris (`questionText`,
`answerText`, `instruction`, pilihan jawaban). **Tidak diubah**, supaya tidak ada resiko regresi
di tempat yang sudah benar.

Komponen baru, mis. `JapanesePassage` (`src/components/japanese-passage.tsx`), khusus dipakai
untuk `QuestionContext.storyText`:

```tsx
<JapanesePassage text={context.storyText} />
```

Render tiap `DocumentBlock`:

- `paragraph` → tiap `lines[i]` jadi `<div>` sendiri dengan `mt-3` (bukan `<br/>` dengan
  line-height biasa) — supaya baris baru dari `\n` tunggal tetap kelihatan jelas sebagai paragraf
  baru walau baris sebelumnya kebetulan penuh selebar container (kalau pakai `<br/>`, gapnya sama
  persis dengan wrap baris biasa, jadi tidak kebedain). Isi tiap baris tetap lewat
  `parseJapaneseMarkup` (jadi furigana/underline di dalam bacaan tetap jalan).
- `table` → elemen `<Table>` dari `src/components/ui/table.tsx` (sudah ada, tinggal reuse) — isi
  tiap sel juga lewat `parseJapaneseMarkup` untuk konsistensi (jaga-jaga kalau ada furigana di
  sel).
- `section` → kotak/card dengan label kecil "A"/"B" di header, ditumpuk vertikal di mobile, grid
  2 kolom (`sm:grid-cols-2`) di layar lebar. Ini yang benerin kasus `ctx-dokkai-12`.

### 3. Tempat pemakaian

Ganti semua tempat yang render `questionContext.storyText` (exam runner, mode baca
`/test-package/[id]/questions`, result detail `/result/[attemptId]/detail`) dari
`<JapaneseText text={storyText} />` jadi `<JapanesePassage text={storyText} />`. Tidak ada
perubahan di server action/schema — ini murni perubahan presentasi, data JSON di
`src/test-package-data/*.json` **tidak perlu diubah** untuk fix ini (formatnya sudah benar).

## Soal Layout Dokumen Resmi (surat/memo/pengumuman)

Untuk `ctx-dokkai-10-3` (memo dengan tanggal/pengirim/penutup "以上") — diusulkan **tidak**
menambah styling khusus (rata-kanan tanggal, rata-kanan nama pengirim, dst.) dulu. Alasan: soal
JLPT asli menampilkan dokumen ini sebagai teks berurutan biasa (rata kiri semua), bukan layout
surat beneran — jadi cukup dengan fix line-break di atas, keterbacaannya sudah setara aslinya.
Kalau ternyata masih kurang jelas setelah dicoba, styling tambahan (rata kanan dsb.) bisa
menyusul sebagai peningkatan terpisah, bukan bagian dari fix ini.

## Isu Terpisah — Bukan Bug Parser: Underline Hilang di `ctx-dokkai-13`

Soal `(72) その人生とは、どのような人生か。` merujuk ke frasa "その人生" yang memang muncul persis
di `storyText` ("...それはその人間の人生ではない。その人生は他人から与えられたものに過ぎない。"),
tapi tidak ditandai `__その人生__`. Ini murni masalah data transkrip, bukan parser.

**Aman atau tidak kalau dibiarkan tanpa underline?** Tidak fatal (soal tetap bisa dijawab karena
frasa "その人生" cuma muncul sekali di bacaan, jadi tetap bisa ditemukan), tapi mengurangi
pengalaman mengerjakan — di ujian asli, underline itu petunjuk visual langsung ke bagian yang
ditanya, tanpa itu user harus scan ulang seluruh paragraf. **Rekomendasi**: perbaiki kalau sempat
(tambahkan `__..._` di frasa yang dirujuk soal `その〜`/`①`/`下線部`), tapi tidak blocking untuk
lanjut testing. Sekalian diusulkan jadi item checklist QA di `docs/seed.md`: *"kalau question
stem menyebut 'その〜', angka bertanda (①②...), atau '下線部', pastikan frasa yang sama muncul
dengan underline `__...__` di storyText."*

## Status

- [x] `src/lib/japanese-document.ts` — `parseJapaneseDocument` (paragraph/table/section)
- [x] `src/components/japanese-passage.tsx` — `JapanesePassage`, reuse `renderInlineJapanese`
  (diekspor dari `japanese-text.tsx`, tidak duplikasi logic furigana/underline/slot)
- [x] Ganti pemakaian `storyText` di 3 tempat: exam runner, mode baca (`/test-package/[id]/questions`),
  result detail (`/result/[attemptId]/detail`). `JapaneseText` sendiri tidak diubah/tidak dipakai
  untuk `storyText` lagi, tapi tetap dipakai apa adanya untuk `questionText`/`answerText`/`instruction`.
- [x] Checklist underline ditambahkan ke `docs/seed.md`, plus 1 catatan tambahan soal typo key
  `questionContexts` (ketemu pas debug import paket lain)
- [x] **Bug ketemu & diperbaiki saat verifikasi**: deteksi marker `【A】`/`【B】` awalnya gagal —
  markernya nempel di chunk yang sama dengan paragraf pertamanya (dipisah cuma 1 `\n`, bukan
  `\n\n`), jadi regex `^【X】$` yang mengharuskan seluruh chunk cuma berisi marker tidak pernah
  match. Diganti ke deteksi prefix (`^【X】\n?(sisanya)`) — divalidasi ulang dengan dry-run
  langsung ke `ctx-dokkai-12` dari `n2-2017-07.json`, sekarang benar kepecah preamble + section A
  + section B.
- [x] Verifikasi: `npm run build` & `npm run lint` bersih; parser dites dry-run (bukan lewat
  TS compiler, karena tidak ada `tsx`/`ts-node` di project — ditranskrip ulang ke plain JS lalu
  dijalankan langsung terhadap 6 context asli dari `n2-2017-07.json`) untuk semua kasus yang
  dilaporkan (memo, 注 per baris, paragraf panjang, 2-section, tabel)
- [ ] **Belum dicek visual di browser** — logic parser sudah divalidasi terhadap data asli, tapi
  belum dilihat langsung hasil render-nya di UI (skip Chromium/Playwright sesuai preferensi user
  testing manual). Tolong dicek langsung setelah seed `n2-2017-07.json`.
- [ ] (Opsional, nanti) styling layout surat/memo kalau ternyata masih kurang jelas setelah fix dasar
