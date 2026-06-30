export type Book = {
  id: string;
  title: string;
  author: string;
  category: string;
  difficulty: "Dễ đọc" | "Vừa phải" | "Chuyên sâu";
  readingTime: "Ngắn" | "Vừa" | "Dài";
  available: number;
  total: number;
  shelf: string;
  description: string;
  audience: string;
  coverImageUrl?: string | null;
};

function fnv1aHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const FALLBACK_PALETTES: Array<[string, string, string, string]> = [
  ["linear-gradient(150deg, #082f49 0%, #0f766e 45%, #f97316 100%)", "#ffffff", "#fde68a", "Kỹ năng sống"],
  ["linear-gradient(160deg, #fff7ed 0%, #fef3c7 45%, #e0f2fe 100%)", "#7c2d12", "#ea580c", "Phát triển bản thân"],
  ["linear-gradient(160deg, #f8fafc 0%, #c7d2fe 55%, #1d4ed8 100%)", "#111827", "#2563eb", "Kinh doanh"],
  ["linear-gradient(160deg, #dbeafe 0%, #f0f9ff 45%, #fef2f2 100%)", "#1e3a8a", "#ef4444", "Tâm lý"],
  ["linear-gradient(155deg, #f8fafc 0%, #e0f2fe 45%, #d1fae5 100%)", "#1e293b", "#0f766e", "Tài chính"],
  ["linear-gradient(160deg, #eff6ff 0%, #bfdbfe 44%, #0f766e 100%)", "#0f172a", "#0369a1", "Quản lý thời gian"],
  ["linear-gradient(160deg, #7c2d12 0%, #f97316 48%, #fde68a 100%)", "#fff7ed", "#fef3c7", "Văn học"],
  ["linear-gradient(160deg, #f4f4f5 0%, #d4d4d8 50%, #52525b 100%)", "#27272a", "#71717a", "Lịch sử"],
];

export function getBookPalette(id: string, category?: string): [string, string, string, string] {
  const paletteIndex = fnv1aHash(id) % FALLBACK_PALETTES.length;
  return FALLBACK_PALETTES[paletteIndex];
}

export const catalogFallbackBooks: Book[] = [
  {
    id: "dac-nhan-tam",
    title: "Đắc Nhân Tâm",
    author: "Dale Carnegie",
    category: "Giao tiếp",
    difficulty: "Dễ đọc",
    readingTime: "Vừa",
    available: 5,
    total: 7,
    shelf: "Tầng 1 - Kệ A - Ngăn 03",
    description: "Sách kinh điển về ứng xử, tạo thiện cảm và xây dựng quan hệ tích cực trong công việc lẫn đời sống.",
    audience: "Người mới đi làm, sinh viên, nhân viên bán hàng",
  },
  {
    id: "atomic-habits",
    title: "Atomic Habits",
    author: "James Clear",
    category: "Phát triển bản thân",
    difficulty: "Dễ đọc",
    readingTime: "Vừa",
    available: 6,
    total: 6,
    shelf: "Tầng 1 - Kệ A - Ngăn 03",
    description: "Hướng dẫn xây dựng thói quen nhỏ, giảm trì hoãn và tạo hệ thống tiến bộ mỗi ngày.",
    audience: "Người muốn kỷ luật cá nhân, sinh viên, người đi làm",
  },
  {
    id: "nha-gia-kim",
    title: "Nhà Giả Kim",
    author: "Paulo Coelho",
    category: "Văn học",
    difficulty: "Dễ đọc",
    readingTime: "Ngắn",
    available: 3,
    total: 5,
    shelf: "Tầng 1 - Kệ B - Ngăn 02",
    description: "Một câu chuyện nhẹ nhàng về hành trình theo đuổi ước mơ và lắng nghe tiếng nói bên trong.",
    audience: "Người muốn đọc nhẹ nhàng, tìm cảm hứng",
  },
  {
    id: "tam-ly-hoc-ve-tien",
    title: "Tâm Lý Học Về Tiền",
    author: "Morgan Housel",
    category: "Tài chính cá nhân",
    difficulty: "Dễ đọc",
    readingTime: "Vừa",
    available: 6,
    total: 6,
    shelf: "Tầng 2 - Kệ D - Ngăn 04",
    description: "Giải thích hành vi tài chính cá nhân qua những câu chuyện dễ hiểu về tiền bạc, rủi ro và thói quen.",
    audience: "Người muốn quản lý tiền, sinh viên, người mới đi làm",
  },
  {
    id: "think-again",
    title: "Think Again",
    author: "Adam Grant",
    category: "Kinh doanh",
    difficulty: "Vừa phải",
    readingTime: "Vừa",
    available: 2,
    total: 4,
    shelf: "Tầng 2 - Kệ C - Ngăn 01",
    description: "Khuyến khích tư duy lại, học cách nghi ngờ giả định cũ và ra quyết định linh hoạt hơn.",
    audience: "Quản lý, nhân sự, người làm tri thức",
  },
  {
    id: "sapiens",
    title: "Sapiens",
    author: "Yuval Noah Harari",
    category: "Lịch sử",
    difficulty: "Chuyên sâu",
    readingTime: "Dài",
    available: 0,
    total: 4,
    shelf: "Tầng 2 - Kệ C - Ngăn 01",
    description: "Góc nhìn rộng về lịch sử loài người, nhận thức, xã hội, kinh tế và công nghệ.",
    audience: "Độc giả thích lịch sử, tư duy hệ thống",
  },
  {
    id: "quan-ly-thoi-gian",
    title: "Quản Lý Thời Gian Hiệu Quả",
    author: "Brian Tracy",
    category: "Quản lý thời gian",
    difficulty: "Dễ đọc",
    readingTime: "Ngắn",
    available: 4,
    total: 4,
    shelf: "Tầng 1 - Kệ A - Ngăn 03",
    description: "Các phương pháp lập kế hoạch, ưu tiên nhiệm vụ và kiểm soát thời gian hàng ngày.",
    audience: "Người mới đi làm, sinh viên, nhân viên văn phòng",
  },
  {
    id: "dam-bi-ghet",
    title: "Dám Bị Ghét",
    author: "Ichiro Kishimi",
    category: "Tâm lý",
    difficulty: "Vừa phải",
    readingTime: "Vừa",
    available: 5,
    total: 5,
    shelf: "Tầng 2 - Kệ D - Ngăn 04",
    description: "Đối thoại triết học giúp người đọc giảm phụ thuộc vào đánh giá bên ngoài và sống tự chủ hơn.",
    audience: "Người hay overthinking, cần cân bằng cảm xúc",
  },
];

export const needChips = ["Dễ đọc", "Quản lý thời gian", "Giao tiếp", "Tài chính cá nhân", "Giảm stress"];
