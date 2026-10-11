import Dexie, { type Table } from 'dexie';
import {
  StudySession,
  SessionQuestion,
  Answer,
  StudyProgress,
  Achievement,
  UserSettings,
  BackupData,
  UserStats
} from '../types';

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'badge-first-session',
    code: 'first_session',
    name: 'Bắt đầu hành trình',
    description: 'Hoàn thành phiên ôn tập đầu tiên của bạn.',
    icon: 'Sparkles',
    unlocked: false,
    progress: 0,
    maxProgress: 1
  },
  {
    id: 'badge-perseverance',
    code: 'perseverance',
    name: 'Kiên trì bền bỉ',
    description: 'Hoàn thành 5 phiên ôn tập.',
    icon: 'Flame',
    unlocked: false,
    progress: 0,
    maxProgress: 5
  },
  {
    id: 'badge-mixed-champion',
    code: 'mixed_champion',
    name: 'Chiến binh Thử thách',
    description: 'Hoàn thành trọn vẹn phiên ôn tập hỗn hợp 50 câu.',
    icon: 'Trophy',
    unlocked: false,
    progress: 0,
    maxProgress: 1
  },
  {
    id: 'badge-high-accuracy',
    code: 'high_accuracy',
    name: 'Đỉnh cao chính xác',
    description: 'Đạt độ chính xác từ 90% trở lên trong một phiên có từ 15 câu trở lên.',
    icon: 'Target',
    unlocked: false,
    progress: 0,
    maxProgress: 1
  },
  {
    id: 'badge-centurion',
    code: 'centurion',
    name: 'Bách chiến bách thắng',
    description: 'Trả lời đúng tổng cộng 100 câu hỏi.',
    icon: 'Award',
    unlocked: false,
    progress: 0,
    maxProgress: 100
  },
  {
    id: 'badge-all-lessons',
    code: 'all_lessons',
    name: 'Toàn diện kiến thức',
    description: 'Ôn tập và hoàn thành đầy đủ cả 6 bài học.',
    icon: 'GraduationCap',
    unlocked: false,
    progress: 0,
    maxProgress: 6
  }
];

export const DEFAULT_SETTINGS: UserSettings = {
  id: 'current',
  theme: 'system',
  soundEnabled: true,
  reduceMotion: false,
  shuffleOptions: true,
  autoNextOnCorrect: false
};

export class StudyHubDatabase extends Dexie {
  studySessions!: Table<StudySession, string>;
  sessionQuestions!: Table<SessionQuestion, number>;
  answers!: Table<Answer, number>;
  studyProgress!: Table<StudyProgress, number>;
  achievements!: Table<Achievement, string>;
  settings!: Table<UserSettings, string>;

  constructor() {
    super('StudyHubDB');

    this.version(1).stores({
      studySessions: 'id, mode, lessonId, status, startTime, endTime',
      sessionQuestions: '++id, sessionId, questionId, order, [sessionId+questionId]',
      answers: '++id, sessionId, questionId, isCorrect, answeredAt, [sessionId+questionId]',
      studyProgress: '++id, &lessonId, lastStudiedAt',
      achievements: '&id, code, unlocked',
      settings: '&id'
    });
  }
}

export const db = new StudyHubDatabase();

/**
 * Tự động khởi tạo database khi người dùng truy cập lần đầu.
 * Không ghi đè dữ liệu cá nhân khi khởi động.
 */
export async function initializeDatabase(): Promise<void> {
  try {
    const existingSettings = await db.settings.get('current');
    if (!existingSettings) {
      await db.settings.put(DEFAULT_SETTINGS);
    }

    const count = await db.achievements.count();
    if (count === 0) {
      await db.achievements.bulkPut(INITIAL_ACHIEVEMENTS);
    }
  } catch (error) {
    console.error('Lỗi khởi tạo database cục bộ Dexie:', error);
  }
}

/**
 * Lấy thống kê tổng hợp thực tế của người dùng từ IndexedDB.
 */
export async function getUserStats(): Promise<UserStats> {
  const sessions = await db.studySessions.toArray();
  const completed = sessions.filter((s) => s.status === 'completed');
  const allAnswers = await db.answers.toArray();

  const totalAnswered = allAnswers.length;
  const totalCorrect = allAnswers.filter((a) => a.isCorrect).length;
  const totalIncorrect = totalAnswered - totalCorrect;
  const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const totalXp = completed.reduce((sum, s) => sum + (s.xpEarned || 0), 0);

  // Số câu cần ôn lại từ studyProgress
  const progresses = await db.studyProgress.toArray();
  const mistakeSet = new Set<string>();
  progresses.forEach((p) => {
    (p.mistakeQuestionIds || []).forEach((qId) => mistakeSet.add(qId));
  });

  const recentSessions = sessions
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, 10);

  return {
    totalSessions: sessions.length,
    completedSessions: completed.length,
    totalAnswered,
    totalCorrect,
    totalIncorrect,
    overallAccuracy,
    totalXp,
    reviewNeededCount: mistakeSet.size,
    recentSessions
  };
}

/**
 * Kiểm tra và trao thưởng huy hiệu dựa trên dữ liệu thực tế
 */
export async function checkAndUnlockAchievements(completedSession: StudySession): Promise<string[]> {
  const newlyUnlocked: string[] = [];
  const achievements = await db.achievements.toArray();
  const allCompletedSessions = await db.studySessions.where('status').equals('completed').toArray();
  const allAnswers = await db.answers.toArray();
  const correctAnswersCount = allAnswers.filter((a) => a.isCorrect).length;

  for (const ach of achievements) {
    if (ach.unlocked) continue;

    let shouldUnlock = false;
    let newProgress = ach.progress;

    switch (ach.code) {
      case 'first_session':
        newProgress = allCompletedSessions.length;
        if (newProgress >= 1) shouldUnlock = true;
        break;

      case 'perseverance':
        newProgress = allCompletedSessions.length;
        if (newProgress >= 5) shouldUnlock = true;
        break;

      case 'mixed_champion':
        if (completedSession.mode === 'mixed' && completedSession.totalQuestions >= 50) {
          newProgress = 1;
          shouldUnlock = true;
        }
        break;

      case 'high_accuracy':
        if (completedSession.answeredCount >= 15 && completedSession.accuracyRate >= 90) {
          newProgress = 1;
          shouldUnlock = true;
        }
        break;

      case 'centurion':
        newProgress = correctAnswersCount;
        if (newProgress >= 100) shouldUnlock = true;
        break;

      case 'all_lessons': {
        const studiedLessons = new Set(
          allCompletedSessions
            .filter((s) => s.mode === 'lesson' && s.lessonId)
            .map((s) => s.lessonId)
        );
        newProgress = studiedLessons.size;
        if (newProgress >= 6) shouldUnlock = true;
        break;
      }
    }

    if (shouldUnlock) {
      ach.unlocked = true;
      ach.unlockedAt = Date.now();
      ach.progress = ach.maxProgress;
      await db.achievements.put(ach);
      newlyUnlocked.push(ach.name);
    } else if (newProgress !== ach.progress) {
      ach.progress = Math.min(newProgress, ach.maxProgress);
      await db.achievements.put(ach);
    }
  }

  return newlyUnlocked;
}

/**
 * Cập nhật tiến độ bài học sau khi có câu trả lời mới
 */
export async function updateLessonProgress(lessonId: string, questionId: string, isCorrect: boolean): Promise<void> {
  const existing = await db.studyProgress.where('lessonId').equals(lessonId).first();
  const now = Date.now();

  if (existing) {
    const mistakes = new Set(existing.mistakeQuestionIds || []);
    if (isCorrect) {
      mistakes.delete(questionId); // Đã làm đúng thì bỏ khỏi danh sách cần ôn
    } else {
      mistakes.add(questionId); // Làm sai thì thêm vào danh sách cần ôn
    }

    await db.studyProgress.update(existing.id!, {
      totalAnswered: existing.totalAnswered + 1,
      totalCorrect: existing.totalCorrect + (isCorrect ? 1 : 0),
      lastStudiedAt: now,
      mistakeQuestionIds: Array.from(mistakes)
    });
  } else {
    await db.studyProgress.add({
      lessonId,
      totalAnswered: 1,
      totalCorrect: isCorrect ? 1 : 0,
      lastStudiedAt: now,
      mistakeQuestionIds: isCorrect ? [] : [questionId]
    });
  }
}

/**
 * Xuất dữ liệu cá nhân ra định dạng Backup JSON chuẩn
 */
export async function exportPersonalData(): Promise<BackupData> {
  const [studySessions, answers, studyProgress, achievements, settings] = await Promise.all([
    db.studySessions.toArray(),
    db.answers.toArray(),
    db.studyProgress.toArray(),
    db.achievements.toArray(),
    db.settings.get('current')
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    studySessions,
    answers,
    studyProgress,
    achievements,
    settings
  };
}

/**
 * Nhập dữ liệu sao lưu từ JSON với kiểm tra định dạng và cảnh báo schema
 */
export async function importPersonalData(data: BackupData): Promise<{ success: boolean; message: string }> {
  if (!data || typeof data !== 'object') {
    return { success: false, message: 'Tệp JSON không hợp lệ hoặc bị hỏng!' };
  }

  if (typeof data.version !== 'number' || !Array.isArray(data.studySessions)) {
    return { success: false, message: 'Cấu trúc schema không khớp phiên bản tương thích của Study Hub!' };
  }

  try {
    await db.transaction('rw', [db.studySessions, db.answers, db.studyProgress, db.achievements, db.settings], async () => {
      // Clear existing user data before restoring
      await db.studySessions.clear();
      await db.answers.clear();
      await db.studyProgress.clear();
      await db.achievements.clear();

      if (data.studySessions?.length) {
        await db.studySessions.bulkPut(data.studySessions);
      }
      if (data.answers?.length) {
        await db.answers.bulkPut(data.answers);
      }
      if (data.studyProgress?.length) {
        await db.studyProgress.bulkPut(data.studyProgress);
      }
      if (data.achievements?.length) {
        await db.achievements.bulkPut(data.achievements);
      } else {
        await db.achievements.bulkPut(INITIAL_ACHIEVEMENTS);
      }
      if (data.settings) {
        await db.settings.put(data.settings);
      }
    });

    return { success: true, message: 'Khôi phục toàn bộ tiến độ và lịch sử thành công!' };
  } catch (err: any) {
    console.error('Lỗi nhập dữ liệu sao lưu:', err);
    return { success: false, message: `Lỗi khi nhập dữ liệu: ${err.message || 'Không xác định'}` };
  }
}

/**
 * Xóa toàn bộ lịch sử và tiến độ cá nhân (sau khi người dùng xác nhận)
 */
export async function clearAllPersonalData(): Promise<void> {
  await db.transaction('rw', [db.studySessions, db.sessionQuestions, db.answers, db.studyProgress, db.achievements], async () => {
    await db.studySessions.clear();
    await db.sessionQuestions.clear();
    await db.answers.clear();
    await db.studyProgress.clear();
    await db.achievements.clear();
    await db.achievements.bulkPut(INITIAL_ACHIEVEMENTS);
  });
}
