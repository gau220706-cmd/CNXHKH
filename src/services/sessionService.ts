import { db, checkAndUnlockAchievements, updateLessonProgress } from '../db';
import { StudySession, Answer, Question, SessionMode } from '../types';

export interface ActiveSessionState {
  session: StudySession;
  questions: Question[];
  currentQuestionIndex: number;
  answers: Map<string, Answer>; // questionId -> Answer
  isFinished: boolean;
  remainingSeconds: number;
}

/**
 * Tạo một phiên ôn tập mới và lưu vào IndexedDB
 */
export async function createStudySession(
  mode: SessionMode,
  questions: Question[],
  lessonId?: string,
  lessonName?: string
): Promise<StudySession> {
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();
  // 25 phút cho bài học, 40 phút cho hỗn hợp
  const plannedDuration = mode === 'lesson' ? 25 * 60 * 1000 : 40 * 60 * 1000;
  const questionIds = questions.map((q) => q.id);

  const session: StudySession = {
    id: sessionId,
    mode,
    lessonId,
    lessonName,
    status: 'in_progress',
    startTime: now,
    plannedDuration,
    questionIds,
    totalQuestions: questions.length,
    answeredCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    unansweredCount: questions.length,
    accuracyRate: 0,
    score10: 0,
    xpEarned: 0
  };

  // Lưu phiên vào db
  await db.studySessions.put(session);

  // Lưu danh sách thứ tự câu hỏi trong phiên
  const sessionQuestions = questions.map((q, idx) => ({
    sessionId,
    questionId: q.id,
    order: idx + 1
  }));
  await db.sessionQuestions.bulkPut(sessionQuestions);

  return session;
}

/**
 * Kiểm tra xem có phiên đang dang dở (in_progress) để khôi phục không
 */
export async function getActiveSession(): Promise<StudySession | null> {
  const sessions = await db.studySessions
    .where('status')
    .equals('in_progress')
    .toArray();

  if (sessions.length === 0) return null;

  // Lấy phiên gần nhất
  const latest = sessions.sort((a, b) => b.startTime - a.startTime)[0];
  const now = Date.now();
  const plannedEndTime = latest.startTime + latest.plannedDuration;

  // Nếu đã hết giờ trong lúc đóng trình duyệt, tự động kết thúc phiên
  if (now >= plannedEndTime) {
    await finishSession(latest.id, true);
    return null;
  }

  return latest;
}

/**
 * Chấm điểm tức thì một câu hỏi và lưu ngay vào IndexedDB
 */
export async function submitQuestionAnswer(
  session: StudySession,
  question: Question,
  selectedOptionIds: string[],
  tfAnswers?: Record<string, 'Đúng' | 'Sai'>,
  ddMatches?: Record<string, string[]>
): Promise<{
  answer: Answer;
  isCorrect: boolean;
  xpAwarded: number;
}> {
  // Kiểm tra nếu đã trả lời câu này trong phiên thì không chấm lại
  const existingAnswer = await db.answers
    .where(['sessionId', 'questionId'])
    .equals([session.id, question.id])
    .first();

  if (existingAnswer) {
    return {
      answer: existingAnswer,
      isCorrect: existingAnswer.isCorrect,
      xpAwarded: 0
    };
  }

  // Thuật toán chấm điểm theo từng loại câu hỏi:
  let isCorrect = false;

  if (question.type === 'single_choice' || question.type === 'multiple_choice') {
    const correctSet = new Set(question.correctOptionIds || []);
    const selectedSet = new Set(selectedOptionIds);
    if (correctSet.size > 0 && correctSet.size === selectedSet.size) {
      isCorrect = Array.from(selectedSet).every((opt) => correctSet.has(opt));
    }
  } else if (question.type === 'true_false') {
    const items = question.tfItems || [];
    if (items.length > 0 && tfAnswers && Object.keys(tfAnswers).length === items.length) {
      isCorrect = items.every((it) => tfAnswers[it.id] === it.correctAnswer);
    }
  } else if (question.type === 'drag_drop') {
    const targets = question.ddTargets || [];
    if (targets.length > 0 && ddMatches) {
      isCorrect = targets.every((t) => {
        const userMatched = ddMatches[t.id] || [];
        const correctSet = new Set(t.correctItemIds);
        return userMatched.length === correctSet.size && userMatched.every((id) => correctSet.has(id));
      });
    }
  }

  const answer: Answer = {
    sessionId: session.id,
    questionId: question.id,
    selectedOptionIds,
    tfAnswers,
    ddMatches,
    isCorrect,
    answeredAt: Date.now()
  };

  // Lưu câu trả lời ngay vào db
  await db.answers.add(answer);

  // Cập nhật tiến độ bài học
  await updateLessonProgress(question.lessonId, question.id, isCorrect);

  // Tính điểm XP cho câu đúng (+10 XP)
  const xpAwarded = isCorrect ? 10 : 0;

  // Cập nhật trạng thái tức thời của session
  const newAnsweredCount = session.answeredCount + 1;
  const newCorrectCount = session.correctCount + (isCorrect ? 1 : 0);
  const newIncorrectCount = session.incorrectCount + (isCorrect ? 0 : 1);
  const newUnansweredCount = Math.max(0, session.totalQuestions - newAnsweredCount);
  const newAccuracy = newAnsweredCount > 0 ? Math.round((newCorrectCount / newAnsweredCount) * 100) : 0;
  const newScore10 = newAnsweredCount > 0 ? Math.round((newCorrectCount / newAnsweredCount) * 10 * 10) / 10 : 0;

  await db.studySessions.update(session.id, {
    answeredCount: newAnsweredCount,
    correctCount: newCorrectCount,
    incorrectCount: newIncorrectCount,
    unansweredCount: newUnansweredCount,
    accuracyRate: newAccuracy,
    score10: newScore10,
    xpEarned: (session.xpEarned || 0) + xpAwarded
  });

  return { answer, isCorrect, xpAwarded };
}

/**
 * Kết thúc phiên (do người dùng chủ động nộp bài, hết câu, hoặc hết giờ)
 */
export async function finishSession(
  sessionId: string,
  _timeOut = false
): Promise<{
  session: StudySession;
  newBadges: string[];
}> {
  const session = await db.studySessions.get(sessionId);
  if (!session) {
    throw new Error(`Không tìm thấy phiên có ID ${sessionId}`);
  }

  if (session.status === 'completed') {
    return { session, newBadges: session.badgesUnlocked || [] };
  }

  const now = Date.now();
  const answers = await db.answers.where('sessionId').equals(sessionId).toArray();
  const answeredCount = answers.length;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const incorrectCount = answeredCount - correctCount;
  const unansweredCount = Math.max(0, session.totalQuestions - answeredCount);

  const accuracyRate = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  const score10 = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 10 * 10) / 10 : 0;

  // Thưởng hoàn thành phiên: +50 XP
  const completionXp = 50;
  const currentXp = session.xpEarned || correctCount * 10;
  const finalXp = currentXp + completionXp;

  const updatedSession: StudySession = {
    ...session,
    status: 'completed',
    endTime: now,
    answeredCount,
    correctCount,
    incorrectCount,
    unansweredCount,
    accuracyRate,
    score10,
    xpEarned: finalXp
  };

  // Trao huy hiệu nếu đạt tiêu chuẩn
  const newBadges = await checkAndUnlockAchievements(updatedSession);
  updatedSession.badgesUnlocked = newBadges;

  await db.studySessions.put(updatedSession);

  return { session: updatedSession, newBadges };
}

/**
 * Lấy toàn bộ câu trả lời của một phiên đã lưu
 */
export async function getSessionAnswers(sessionId: string): Promise<Answer[]> {
  return await db.answers.where('sessionId').equals(sessionId).toArray();
}
