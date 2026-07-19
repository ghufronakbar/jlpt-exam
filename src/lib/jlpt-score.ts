import type { MondaiType } from "@prisma/client";
import { mondaiTypeFullLabel } from "@/constants/jlpt";

// Proyeksi skor ala JLPT asli: 3 scoring section (moji-goi + bunpou digabung
// jadi 言語知識), masing-masing diskalakan ke 60, total maks 180. Algoritma
// resmi JLPT (IRT/scaled scoring) tidak dipublikasikan, jadi ini aproksimasi
// dengan math biasa — lihat docs/plan.md Fase 8.4.
export type ScoringSectionKey = "GENGO_CHISHIKI" | "DOKKAI" | "CHOUKAI";

export const SCORING_SECTION_LABELS: Record<ScoringSectionKey, string> = {
  GENGO_CHISHIKI: "言語知識（文字・語彙・文法）",
  DOKKAI: "読解",
  CHOUKAI: "聴解",
};

const SCORING_SECTION_ORDER: ScoringSectionKey[] = ["GENGO_CHISHIKI", "DOKKAI", "CHOUKAI"];

const SECTION_MAX_SCORE = 60;

// Bobot kesulitan per mondai (aproksimasi berdasarkan karakter tiap tipe soal
// JLPT, karena bobot resminya tidak diketahui): recall sederhana seperti
// 漢字読み paling ringan; soal yang menuntut komposisi/integrasi seperti
// 文の組み立て (★) dan 統合理解 paling berat. Nilai absolutnya tidak penting —
// yang berpengaruh cuma rasio antar bobot, karena skor dinormalisasi:
//   skorSection = Σ(bobot × benar) / Σ(bobot × totalSoal) × 60
// sehingga kalau semua benar hasilnya pasti tepat 60 (dan total tepat 180).
export const MONDAI_WEIGHTS: Record<MondaiType, number> = {
  MOJI_GOI_READ_KANJI: 1.0,
  MOJI_GOI_WRITE_KANJI: 1.1,
  MOJI_GOI_WORD_FORMATION: 1.2,
  MOJI_GOI_CONTEXT: 1.3,
  MOJI_GOI_SYNONYM: 1.2,
  MOJI_GOI_WORD_USAGE: 1.4,
  BUNPOU_GRAMMAR: 1.2,
  BUNPOU_SENTENCE_COMPOSITION: 1.5,
  BUNPOU_TEXT_GRAMMAR: 1.4,
  DOKKAI_SHORT_TEXT: 1.2,
  DOKKAI_MEDIUM_TEXT: 1.4,
  DOKKAI_LONG_TEXT: 1.6,
  DOKKAI_INTEGRATED: 1.7,
  DOKKAI_MAIN_IDEA: 1.7,
  DOKKAI_INFORMATION_RETRIEVAL: 1.3,
  CHOUKAI_TASK_BASED: 1.2,
  CHOUKAI_MAIN_POINT: 1.2,
  CHOUKAI_OUTLINE: 1.4,
  CHOUKAI_EXPRESSION: 1.0,
  CHOUKAI_QUICK_RESPONSE: 1.1,
  CHOUKAI_INTEGRATED: 1.6,
};

const MONDAI_ORDER = Object.keys(MONDAI_WEIGHTS) as MondaiType[];

export function scoringSectionOf(mondaiType: MondaiType): ScoringSectionKey {
  if (mondaiType.startsWith("MOJI_GOI_") || mondaiType.startsWith("BUNPOU_")) {
    return "GENGO_CHISHIKI";
  }
  if (mondaiType.startsWith("DOKKAI_")) return "DOKKAI";
  return "CHOUKAI";
}

export type MondaiStatInput = {
  mondaiType: MondaiType;
  correct: number;
  total: number;
};

export type MondaiScoreRow = {
  mondaiType: MondaiType;
  label: string;
  weight: number;
  correct: number;
  total: number;
  accuracy: number;
};

export type ScoringSectionResult = {
  key: ScoringSectionKey;
  label: string;
  rows: MondaiScoreRow[];
  correct: number;
  total: number;
  accuracy: number;
  plainScore: number; // 0-60, bobot seragam
  weightedScore: number; // 0-60, pakai MONDAI_WEIGHTS
};

export type JlptScoreProjection = {
  sections: ScoringSectionResult[];
  correct: number;
  total: number;
  accuracy: number;
  plainScore: number;
  weightedScore: number;
  // 180 untuk full test; lebih kecil kalau cuma sebagian scoring section yang
  // ada datanya (mis. latihan per seksi) supaya proyeksinya tetap jujur.
  maxScore: number;
};

function percentage(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

export function computeJlptScoreProjection(stats: MondaiStatInput[]): JlptScoreProjection {
  const ordered = [...stats].sort(
    (a, b) => MONDAI_ORDER.indexOf(a.mondaiType) - MONDAI_ORDER.indexOf(b.mondaiType),
  );

  const sections: ScoringSectionResult[] = [];

  for (const key of SCORING_SECTION_ORDER) {
    const rows: MondaiScoreRow[] = ordered
      .filter((stat) => scoringSectionOf(stat.mondaiType) === key)
      .map((stat) => ({
        mondaiType: stat.mondaiType,
        label: mondaiTypeFullLabel(stat.mondaiType),
        weight: MONDAI_WEIGHTS[stat.mondaiType],
        correct: stat.correct,
        total: stat.total,
        accuracy: percentage(stat.correct, stat.total),
      }));

    if (rows.length === 0) continue;

    const correct = rows.reduce((sum, row) => sum + row.correct, 0);
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    const weightedCorrect = rows.reduce((sum, row) => sum + row.weight * row.correct, 0);
    const weightedTotal = rows.reduce((sum, row) => sum + row.weight * row.total, 0);

    sections.push({
      key,
      label: SCORING_SECTION_LABELS[key],
      rows,
      correct,
      total,
      accuracy: percentage(correct, total),
      plainScore: total > 0 ? Math.round((correct / total) * SECTION_MAX_SCORE) : 0,
      weightedScore:
        weightedTotal > 0 ? Math.round((weightedCorrect / weightedTotal) * SECTION_MAX_SCORE) : 0,
    });
  }

  const correct = sections.reduce((sum, section) => sum + section.correct, 0);
  const total = sections.reduce((sum, section) => sum + section.total, 0);

  return {
    sections,
    correct,
    total,
    accuracy: percentage(correct, total),
    // Skor section dibulatkan dulu baru dijumlah (seperti rapor JLPT asli yang
    // per section-nya integer), bukan dihitung ulang dari rasio gabungan.
    plainScore: sections.reduce((sum, section) => sum + section.plainScore, 0),
    weightedScore: sections.reduce((sum, section) => sum + section.weightedScore, 0),
    maxScore: sections.length * SECTION_MAX_SCORE,
  };
}
