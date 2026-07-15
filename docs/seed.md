# Seed: Import Bank Soal dari Scraping

Dokumen ini adalah kontrak data untuk tool/AI eksternal yang melakukan scraping soal JLPT
asli, supaya hasilnya bisa langsung diimpor ke database lewat endpoint seed di bawah.

Kalau kamu (AI/tool lain) yang membaca dokumen ini: tugasmu adalah menghasilkan file
`src/app/api/seed/test-package/data.json` yang valid sesuai schema di dokumen ini. Setelah
`data.json` ditulis, panggil endpoint importnya — jangan mengubah `route.ts` atau `types.ts`
kecuali memang diminta.

## Cara Import

```
GET /api/seed/test-package?auth=<SESSION_SECRET>
```

- `SESSION_SECRET` = nilai env var `SESSION_SECRET` di `.env` project ini (bukan password user).
- Endpoint ini sengaja **tidak** pakai session login — proteksinya cuma query param `auth` ini.
- Import bersifat **idempotent per `TestPackage.name`**: kalau paket dengan `name` yang sama
  sudah ada di database, seluruh paket itu di-skip (tidak dobel, tidak di-update). Jalankan
  ulang endpoint ini kapan saja aman — paket yang sudah ada tidak akan diproses ulang.
- Tiap `Question` diimpor dalam transaksi masing-masing. Kalau satu soal gagal (mis. rusak,
  referensi context tidak ketemu), soal itu dicatat di response sebagai error dan proses
  **lanjut** ke soal berikutnya — bukan membatalkan seluruh paket.
- Response JSON: `{ packagesSeeded, packagesSkipped, questionsSeeded, errors }`. Log detail
  per langkah (`CREATE`/`SKIP`/`ERROR`/`DONE`) tercetak di stdout server dengan prefix
  `[seed:test-package]` — cek log server kalau butuh detail lebih dari ringkasan response.

## Struktur File `data.json`

Root object:

```ts
type SeedData = {
  testPackages: SeedTestPackage[];
};
```

### `SeedTestPackage`

```ts
type SeedTestPackage = {
  name: string; // WAJIB unik — kunci deteksi duplikat. Pakai nama deskriptif,
                // mis. "JLPT N3 - Desember 2023" (bukan generik seperti "Paket 1")
  jlptLevel: "N5" | "N4" | "N3" | "N2" | "N1";
  questionContexts?: SeedQuestionContext[]; // bacaan/audio yang dipakai >1 soal
  testPackageItems: SeedTestPackageItem[];  // blok-blok mondai (問題)
};
```

### `SeedQuestionContext`

Bacaan panjang, gambar brosur, atau audio yang dipakai bersama oleh beberapa soal (mis. dokkai
文章, choukai 統合理解). Kalau konten cuma dipakai 1 soal, JANGAN buat context — taruh langsung
di `questionImage`/`questionAudio` milik `SeedQuestion`.

```ts
type SeedQuestionContext = {
  id: string; // local reference id, BEBAS tapi harus unik dalam satu testPackage
              // (mis. "ctx-1"). Ini BUKAN id database — cuma dipakai untuk
              // menghubungkan context ke soal lewat `questionContextRef`.
  storyText?: string | null;  // markup ringan, lihat bagian "Markup Teks" di bawah
  storyImage?: string | null; // URL gambar (isi setelah upload; kosongkan/null kalau belum ada)
  storyAudio?: string | null; // URL audio
};
```

### `SeedTestPackageItem`

Satu blok mondai (問題), mis. "問題1 漢字読み". **Satu `testPackageItem` = satu `mondaiType`.**
Tidak boleh ada 2 item dengan `mondaiType` sama dalam 1 paket (constraint database).

```ts
type SeedTestPackageItem = {
  mondaiType: MondaiType;   // lihat daftar nilai di bawah
  section: JlptSection;     // "MOJI_GOI" | "BUNPOU" | "DOKKAI" | "CHOUKAI"
  session: number;          // 1 | 2 | 3 — lihat "Aturan Penomoran Sesi" di bawah, WAJIB benar
  order: number;            // urutan mondai di dalam sesi (問題1, 問題2, ... dalam sesi yang sama)
  instruction?: string | null; // instruksi resmi mondai, mis. "＿＿の言葉の読み方として..."
  questions: SeedQuestion[];
};
```

### `SeedQuestion`

```ts
type SeedQuestion = {
  order: number; // nomor soal di dalam mondai ini, mulai dari 1
  questionText: string; // HANYA stem soal (lihat database.md) — boleh string kosong
                         // kalau soal murni audio (mis. 即時応答)
  questionImage?: string | null;
  questionAudio?: string | null;
  questionAnswer: number; // codeAnswer (1-4) pilihan yang BENAR — bukan index/id pilihan
  explanation?: string | null; // penjelasan resmi (hasil ekstraksi/AI), markup ringan sama
  questionContextRef?: string | null; // isi dengan `id` dari questionContexts kalau soal ini
                                       // pakai bacaan/audio bersama; null/kosongkan kalau tidak
  questionChoices: SeedQuestionChoice[]; // WAJIB tepat 4 pilihan
};
```

### `SeedQuestionChoice`

```ts
type SeedQuestionChoice = {
  codeAnswer: number; // 1-4, harus unik dalam satu soal (4 pilihan = codeAnswer 1,2,3,4)
  answerText: string; // boleh string kosong kalau pilihan murni audio
  answerImage?: string | null;
};
```

## Daftar Nilai Enum

### `jlptLevel`

`N5` · `N4` · `N3` · `N2` · `N1`

### `section`

`MOJI_GOI` · `BUNPOU` · `DOKKAI` · `CHOUKAI`

### `mondaiType`

| Nilai | Nama Jepang | Section |
|---|---|---|
| `MOJI_GOI_READ_KANJI` | 漢字読み | MOJI_GOI |
| `MOJI_GOI_WRITE_KANJI` | 表記 | MOJI_GOI |
| `MOJI_GOI_WORD_FORMATION` | 語形成 | MOJI_GOI |
| `MOJI_GOI_CONTEXT` | 文脈規定 | MOJI_GOI |
| `MOJI_GOI_SYNONYM` | 言い換え類義 | MOJI_GOI |
| `MOJI_GOI_WORD_USAGE` | 用法 | MOJI_GOI |
| `BUNPOU_GRAMMAR` | 文法形式の判断 | BUNPOU |
| `BUNPOU_SENTENCE_COMPOSITION` | 文の組み立て (jawaban = posisi ★, lihat "Markup Teks") | BUNPOU |
| `BUNPOU_TEXT_GRAMMAR` | 文章の文法 | BUNPOU |
| `DOKKAI_SHORT_TEXT` | 内容理解（短文） | DOKKAI |
| `DOKKAI_MEDIUM_TEXT` | 内容理解（中文） | DOKKAI |
| `DOKKAI_LONG_TEXT` | 内容理解（長文） | DOKKAI |
| `DOKKAI_INTEGRATED` | 統合理解 | DOKKAI |
| `DOKKAI_MAIN_IDEA` | 主張理解 | DOKKAI |
| `DOKKAI_INFORMATION_RETRIEVAL` | 情報検索 | DOKKAI |
| `CHOUKAI_TASK_BASED` | 課題理解 | CHOUKAI |
| `CHOUKAI_MAIN_POINT` | ポイント理解 | CHOUKAI |
| `CHOUKAI_OUTLINE` | 概要理解 | CHOUKAI |
| `CHOUKAI_EXPRESSION` | 発話表現 (biasanya ada gambar) | CHOUKAI |
| `CHOUKAI_QUICK_RESPONSE` | 即時応答 (audio-only, `questionText`/`answerText` boleh kosong) | CHOUKAI |
| `CHOUKAI_INTEGRATED` | 統合理解 | CHOUKAI |

`section` pada `SeedTestPackageItem` HARUS konsisten dengan `mondaiType`-nya (lihat kolom
Section di tabel atas).

## Aturan Penomoran Sesi (`session`)

Mengikuti struktur ujian JLPT asli — jumlah sesi beda per level:

- **N1, N2** (2 sesi): sesi 1 = `MOJI_GOI` + `BUNPOU` + `DOKKAI` (digabung), sesi 2 = `CHOUKAI`.
- **N3, N4, N5** (3 sesi): sesi 1 = `MOJI_GOI` saja, sesi 2 = `BUNPOU` + `DOKKAI` (digabung),
  sesi 3 = `CHOUKAI`.

Jadi untuk N3/N4/N5, item dengan `section: "MOJI_GOI"` selalu `session: 1`; item dengan
`section: "BUNPOU"` atau `"DOKKAI"` selalu `session: 2`; item dengan `section: "CHOUKAI"`
selalu `session: 3`. Untuk N1/N2, `MOJI_GOI`/`BUNPOU`/`DOKKAI` semua `session: 1`, dan
`CHOUKAI` adalah `session: 2`.

## Markup Teks (berlaku di `questionText`, `answerText`, `storyText`, `instruction`, `explanation`)

JANGAN pernah menulis HTML mentah. Pakai markup ringan ini saja:

| Markup | Arti | Contoh |
|---|---|---|
| `{漢字\|かんじ}` | Furigana | `{学校\|がっこう}` |
| `__teks__` | Underline (下線部, kata yang ditanya) | `__{学校\|がっこう}__に行きます` |
| `[_]` | Slot kosong (khusus `BUNPOU_SENTENCE_COMPOSITION`) | selalu literal, tidak pernah ada isi |
| `[★]` | Slot bintang (khusus `BUNPOU_SENTENCE_COMPOSITION`) | selalu literal, tidak pernah ada isi |

Markup boleh bersarang: `__{勉強|べんきょう}する__` valid (underline yang isinya ada furigana).

Untuk `BUNPOU_SENTENCE_COMPOSITION` (文の組み立て): `questionAnswer` diisi dengan `codeAnswer`
pilihan yang jatuh di posisi `[★]` sesuai urutan kalimat yang benar — bukan skema khusus, tetap
pakai field `questionAnswer` biasa.

Untuk `MOJI_GOI_READ_KANJI`: tetap sertakan furigana lengkap di dalam `__..._` sesuai data asli
(frontend yang akan menyembunyikannya saat render, supaya jawaban tidak bocor) — jangan
dihilangkan dari data.

## Validasi & Hal yang Sering Salah

- `questionAnswer` merujuk ke `codeAnswer` (1-4), **bukan** posisi array atau id.
- Setiap `SeedQuestion.questionChoices` harus tepat 4 item dengan `codeAnswer` 1,2,3,4 (unik).
- Satu `testPackageItem` = satu `mondaiType`; jangan buat 2 item dengan `mondaiType` sama
  dalam satu paket (bikin item baru dengan `order` beda kalau mondai yang sama muncul lagi
  — ini seharusnya jarang terjadi di JLPT asli).
- `order` soal dalam satu mondai tidak boleh dobel (mis. dua soal `order: 1` di item yang sama).
- `questionContextRef` harus cocok dengan salah satu `id` di `questionContexts` milik
  **paket yang sama** — tidak bisa merujuk context dari paket lain.
- `questionText`/`answerText` boleh string kosong `""` (bukan `null`) untuk soal/pilihan
  audio-only (mis. `CHOUKAI_QUICK_RESPONSE`).
- Field gambar/audio (`questionImage`, `questionAudio`, `storyImage`, `storyAudio`,
  `answerImage`) isi `null` kalau belum ada asetnya — jangan taruh placeholder string kosong.
- Field opsional (`instruction`, `explanation`, `questionContextRef`, gambar/audio) boleh
  dihilangkan dari JSON sepenuhnya atau diisi `null` — dua-duanya valid.

## Contoh Lengkap

```json
{
  "testPackages": [
    {
      "name": "JLPT N5 - Contoh Paket",
      "jlptLevel": "N5",
      "questionContexts": [
        {
          "id": "ctx-1",
          "storyText": "わたしは まいにち 7じに おきます。あさごはんを たべてから、がっこうに いきます。"
        }
      ],
      "testPackageItems": [
        {
          "mondaiType": "MOJI_GOI_READ_KANJI",
          "section": "MOJI_GOI",
          "session": 1,
          "order": 1,
          "instruction": "＿＿の言葉の読み方として最もよいものを、1・2・3・4から一つえらびなさい。",
          "questions": [
            {
              "order": 1,
              "questionText": "明日、__{学校|がっこう}__に 行きます。",
              "questionAnswer": 1,
              "explanation": "「学校」は「がっこう」と読みます。",
              "questionChoices": [
                { "codeAnswer": 1, "answerText": "がっこう" },
                { "codeAnswer": 2, "answerText": "がこう" },
                { "codeAnswer": 3, "answerText": "がっこ" },
                { "codeAnswer": 4, "answerText": "がいこう" }
              ]
            }
          ]
        },
        {
          "mondaiType": "DOKKAI_SHORT_TEXT",
          "section": "DOKKAI",
          "session": 2,
          "order": 1,
          "instruction": "つぎの文章を読んで、質問に答えてください。",
          "questions": [
            {
              "order": 1,
              "questionText": "「わたし」は 何時に おきますか。",
              "questionAnswer": 1,
              "questionContextRef": "ctx-1",
              "questionChoices": [
                { "codeAnswer": 1, "answerText": "7じ" },
                { "codeAnswer": 2, "answerText": "8じ" },
                { "codeAnswer": 3, "answerText": "8じはん" },
                { "codeAnswer": 4, "answerText": "15ふん" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Referensi Lain

- `src/app/api/seed/test-package/types.ts` — source of truth TypeScript untuk schema di atas.
- `docs/database.md` — aturan schema & markup lengkap (dokumen ini adalah ringkasannya,
  dikhususkan untuk konteks import).
- `src/app/api/seed/demo-test-package/route.ts` — contoh seed sederhana (hardcoded, bukan dari
  JSON) untuk kebutuhan testing internal, bukan untuk data produksi.
