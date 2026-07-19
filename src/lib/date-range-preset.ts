export const DATE_RANGE_PRESETS = ["all", "thisWeek", "thisMonth", "last30Days", "custom"] as const;
export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

export function isDateRangePreset(value: string | undefined): value is DateRangePreset {
  return !!value && (DATE_RANGE_PRESETS as readonly string[]).includes(value);
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function startOfWeek(date: Date): Date {
  // Senin sebagai awal minggu.
  const result = startOfDay(date);
  const day = result.getDay();
  const diff = (day + 6) % 7;
  result.setDate(result.getDate() - diff);
  return result;
}

// Resolusi preset -> rentang tanggal aktual, dipanggil di server (page.tsx)
// sebelum diteruskan sebagai argumen ke getAnalytics() (bukan closure) agar
// unstable_cache bisa membedakan cache key otomatis dari argumennya.
export function resolveDateRangePreset(
  preset: DateRangePreset,
  customFrom?: string,
  customTo?: string,
): { from?: Date; to?: Date } {
  const now = new Date();

  switch (preset) {
    case "all":
      return {};
    case "thisWeek":
      return { from: startOfWeek(now) };
    case "thisMonth":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1) };
    case "last30Days": {
      const from = startOfDay(now);
      from.setDate(from.getDate() - 29);
      return { from };
    }
    case "custom": {
      const from = customFrom ? startOfDay(new Date(customFrom)) : undefined;
      const to = customTo ? endOfDay(new Date(customTo)) : undefined;
      return { from, to };
    }
  }
}
