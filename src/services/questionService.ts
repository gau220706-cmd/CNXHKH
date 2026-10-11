import { Question, Lesson, Subject, QuestionOption } from '../types';
import { initialSubjects } from '../data/subjects';
import { initialLessons } from '../data/lessons';
import { initialQuestions } from '../data/questions';

// Danh sách lời khen khi trả lời đúng
export const POSITIVE_PRAISES = [
  'Chính xác! Cậu làm tốt lắm ✨',
  'Tuyệt vời, thêm một câu vững kiến thức! 🌟',
  'Quá tốt! Tiếp tục phát huy nào 🚀',
  'Chuẩn không cần chỉnh! Cố lên nhé 🎯',
  'Tuyệt hảo! Kiến thức của bạn rất vững! 💡',
  'Rất tự tin và chính xác! Cứ thế này nhé 🔥',
  'Xuất sắc! Một bước tiến nữa tới điểm 10 🎓'
];

// Danh sách lời động viên khi trả lời sai
export const ENCOURAGING_MESSAGES = [
  'Chưa sao cả, mình nhớ đáp án này nhé 💪',
  'Một cơ hội tuyệt vời để hiểu bài sâu hơn! 🌱',
  'Không sao, cậu đang tiến bộ qua từng câu đấy 🌈',
  'Đừng nản nhé, xem giải thích để nhớ lâu hơn! ✨',
  'Sai một lần để lần thi thật chắc chắn đúng! 📖',
  'Mỗi thử thách là một bài học bổ ích! Cố lên 👏'
];

export function getRandomPraise(): string {
  const idx = Math.floor(Math.random() * POSITIVE_PRAISES.length);
  return POSITIVE_PRAISES[idx];
}

export function getRandomEncouragement(): string {
  const idx = Math.floor(Math.random() * ENCOURAGING_MESSAGES.length);
  return ENCOURAGING_MESSAGES[idx];
}

/**
 * Tải ngân hàng câu hỏi, bài học, môn học (hỗ trợ fetch public/data hoặc dùng local bundle an toàn)
 */
export async function getQuestionBank(): Promise<{
  subjects: Subject[];
  lessons: Lesson[];
  questions: Question[];
}> {
  try {
    const base = import.meta.env.BASE_URL || './';
    const cleanBase = base.endsWith('/') ? base : `${base}/`;

    const [subRes, lesRes, qRes] = await Promise.all([
      fetch(`${cleanBase}data/subjects.json`).catch(() => null),
      fetch(`${cleanBase}data/lessons.json`).catch(() => null),
      fetch(`${cleanBase}data/questions.json`).catch(() => null)
    ]);

    if (subRes?.ok && lesRes?.ok && qRes?.ok) {
      const subjects = await subRes.json();
      const lessons = await lesRes.json();
      const questions = await qRes.json();
      return { subjects, lessons, questions };
    }
  } catch (err) {
    console.warn('Sử dụng dữ liệu khởi tạo trực tiếp:', err);
  }

  // Fallback an toàn bảo đảm luôn chạy được 100%
  return {
    subjects: initialSubjects,
    lessons: initialLessons,
    questions: initialQuestions
  };
}

/**
 * Fisher-Yates Shuffle
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Kiểm tra câu hỏi hợp lệ theo từng dạng câu hỏi
 */
export function isValidQuestion(q: Question): boolean {
  if (q.type === 'single_choice' || q.type === 'multiple_choice') {
    return Boolean(q.options && q.options.length >= 2 && q.correctOptionIds && q.correctOptionIds.length >= 1);
  }
  if (q.type === 'true_false') {
    return Boolean(q.tfItems && q.tfItems.length >= 1);
  }
  if (q.type === 'drag_drop') {
    return Boolean(q.ddItems && q.ddItems.length >= 1 && q.ddTargets && q.ddTargets.length >= 1);
  }
  return false;
}

/**
 * Xáo trộn phương án trả lời của một câu hỏi trắc nghiệm mà vẫn bảo toàn chính xác đáp án đúng
 */
export function shuffleQuestionOptions(question: Question): Question {
  if (question.type !== 'single_choice' && question.type !== 'multiple_choice') {
    return question;
  }
  if (!question.options || !question.correctOptionIds) {
    return question;
  }

  const correctTexts = new Set(
    question.options
      .filter((opt) => question.correctOptionIds!.includes(opt.id))
      .map((opt) => opt.text)
  );

  const shuffledOptionsRaw = shuffleArray(question.options);
  const letterLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

  const newOptions: QuestionOption[] = shuffledOptionsRaw.map((opt, idx) => ({
    id: letterLabels[idx] || String.fromCharCode(65 + idx),
    text: opt.text
  }));

  const newCorrectOptionIds = newOptions
    .filter((opt) => correctTexts.has(opt.text))
    .map((opt) => opt.id);

  return {
    ...question,
    options: newOptions,
    correctOptionIds: newCorrectOptionIds
  };
}

/**
 * Chuẩn bị đề thi theo bài:
 * - Chỉ lấy câu hỏi thuộc bài đã chọn từ file dữ liệu có sẵn.
 * - Đảo ngẫu nhiên thứ tự các câu hỏi của bài đó cho mỗi lượt ôn tập mới.
 * - Không thay đổi nội dung câu hỏi, danh sách phương án hay đáp án đúng.
 */
export function prepareLessonQuestions(
  allQuestions: Question[],
  lessonId: string
): Question[] {
  // 1. Chỉ lấy câu hỏi thuộc bài đó và hợp lệ
  const lessonQuestions = allQuestions.filter(
    (q) => q.lessonId === lessonId && isValidQuestion(q)
  );

  // 2. Đảo ngẫu nhiên thứ tự câu hỏi mỗi lượt mới
  return shuffleArray(lessonQuestions);
}

/**
 * Chuẩn bị đề thi ôn tập hỗn hợp:
 * - Chế độ duy nhất có đúng 50 câu hỏi được chọn ngẫu nhiên từ tất cả các bài trong file câu hỏi.
 * - Bao gồm tất cả các dạng câu hỏi: chọn 1 đáp án, chọn nhiều đáp án, đúng/sai, kéo thả.
 * - Mỗi lượt mới chọn ngẫu nhiên lại 50 câu và đảo thứ tự câu hỏi.
 * - Không có câu hỏi trùng lặp trong cùng một lượt.
 * - Nếu tổng số câu hỏi hợp lệ ít hơn 50: không tự tạo hoặc lặp câu; thông báo và lấy đúng số câu hiện có.
 */
export function prepareMixedQuestions(
  allQuestions: Question[],
  targetCount = 50
): { questions: Question[]; actualCount: number; message?: string } {
  // Lấy danh sách câu hỏi hợp lệ từ file câu hỏi hiện có (tất cả các dạng)
  const validQuestions = allQuestions.filter(isValidQuestion);

  if (validQuestions.length === 0) {
    return {
      questions: [],
      actualCount: 0,
      message: 'Không tìm thấy câu hỏi hợp lệ từ các file câu hỏi trong dự án!'
    };
  }

  // Trường hợp ngân hàng có ít hơn 50 câu: không tự tạo câu, không lặp câu
  if (validQuestions.length < targetCount) {
    const shuffledAll = shuffleArray(validQuestions);
    return {
      questions: shuffledAll,
      actualCount: validQuestions.length,
      message: `Ngân hàng hiện có ${validQuestions.length} câu hỏi hợp lệ (ít hơn mục tiêu ${targetCount} câu). Phiên thi sẽ diễn ra với toàn bộ ${validQuestions.length} câu hiện có mà không lặp lại câu hỏi.`
    };
  }

  // Nhóm câu hỏi theo từng bài học để bảo đảm phân bổ đại diện từ tất cả các bài
  const lessonGroups = new Map<string, Question[]>();
  for (const q of validQuestions) {
    if (!lessonGroups.has(q.lessonId)) {
      lessonGroups.set(q.lessonId, []);
    }
    lessonGroups.get(q.lessonId)!.push(q);
  }

  const lessonIds = Array.from(lessonGroups.keys());
  const selectedMap = new Map<string, Question>();

  // Lấy phân bổ cơ sở từ mỗi bài (ví dụ 6 bài -> mỗi bài lấy khoảng 8 câu)
  const basePerLesson = Math.floor(targetCount / lessonIds.length);
  for (const lessonId of lessonIds) {
    const pool = shuffleArray(lessonGroups.get(lessonId)!);
    const take = Math.min(pool.length, basePerLesson);
    for (let i = 0; i < take; i++) {
      selectedMap.set(pool[i].id, pool[i]);
    }
  }

  // Điền thêm các câu còn lại cho đủ đúng 50 câu ngẫu nhiên từ các câu chưa chọn
  if (selectedMap.size < targetCount) {
    const remainingQuestions = validQuestions.filter((q) => !selectedMap.has(q.id));
    const shuffledRemaining = shuffleArray(remainingQuestions);
    const needed = targetCount - selectedMap.size;
    for (let i = 0; i < needed && i < shuffledRemaining.length; i++) {
      selectedMap.set(shuffledRemaining[i].id, shuffledRemaining[i]);
    }
  }

  // Đảo ngẫu nhiên thứ tự của đúng 50 câu đã chọn cho lượt thi mới
  const finalQuestions = shuffleArray(Array.from(selectedMap.values()));

  return {
    questions: finalQuestions,
    actualCount: finalQuestions.length
  };
}
