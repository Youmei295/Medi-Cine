// Vietnamese age rating labels (P, K, T13, T16, T18) and their meaning, so the
// UI never shows a rating without saying what it means (brief §4 screen 2).

const MEANING: Record<string, string> = {
  P: 'Phim dành cho mọi lứa tuổi',
  K: 'Phim dành cho khán giả dưới 13 tuổi, xem cùng cha mẹ hoặc người giám hộ',
  T13: 'Phim dành cho khán giả từ đủ 13 tuổi trở lên',
  T16: 'Phim dành cho khán giả từ đủ 16 tuổi trở lên',
  T18: 'Phim dành cho khán giả từ đủ 18 tuổi trở lên',
}

export const isKnownRating = (rating: string) => rating in MEANING

export const ageRatingMeaning = (rating: string) => MEANING[rating] ?? 'Phim chưa được phân loại độ tuổi'
