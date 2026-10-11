export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false' | 'drag_drop';

export interface QuestionOption {
  id: string; // "A", "B", "C", "D"
  text: string;
}

export interface TrueFalseItem {
  id: string; // "1", "2", "3", ...
  statement: string;
  correctAnswer: 'Đúng' | 'Sai';
}

export interface DragDropItem {
  id: string;
  text: string;
}

export interface DragDropTarget {
  id: string;
  prompt: string;
  correctItemIds: string[];
}

export interface Question {
  id: string;
  lessonId: string;
  type: QuestionType;
  content: string;
  options?: QuestionOption[];
  correctOptionIds?: string[];
  tfItems?: TrueFalseItem[];
  ddItems?: DragDropItem[];
  ddTargets?: DragDropTarget[];
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface Lesson {
  id: string;
  order: number;
  name: string;
  description: string;
  questionCount?: number;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  description: string;
  icon?: string;
  totalLessons: number;
  totalQuestions: number;
}

export type SessionMode = 'lesson' | 'mixed';
export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface StudySession {
  id: string;
  mode: SessionMode;
  lessonId?: string;
  lessonName?: string;
  status: SessionStatus;
  startTime: number; // ms timestamp
  endTime?: number; // ms timestamp
  plannedDuration: number; // ms, 25 * 60 * 1000 or 40 * 60 * 1000
  questionIds: string[];
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  accuracyRate: number; // percentage 0 - 100
  score10: number; // 0 - 10
  xpEarned: number;
  badgesUnlocked?: string[];
}

export interface SessionQuestion {
  id?: number;
  sessionId: string;
  questionId: string;
  order: number;
}

export interface Answer {
  id?: number;
  sessionId: string;
  questionId: string;
  selectedOptionIds: string[];
  tfAnswers?: Record<string, 'Đúng' | 'Sai'>;
  ddMatches?: Record<string, string[]>;
  isCorrect: boolean;
  answeredAt: number;
}

export interface StudyProgress {
  id?: number;
  lessonId: string;
  totalAnswered: number;
  totalCorrect: number;
  lastStudiedAt: number;
  mistakeQuestionIds: string[]; // câu cần ôn lại
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
  progress: number;
  maxProgress: number;
}

export interface UserSettings {
  id: string; // 'current'
  theme: 'system' | 'light' | 'dark';
  soundEnabled: boolean;
  reduceMotion: boolean;
  shuffleOptions: boolean;
  autoNextOnCorrect: boolean;
}

export interface UserStats {
  totalSessions: number;
  completedSessions: number;
  totalAnswered: number;
  totalCorrect: number;
  totalIncorrect: number;
  overallAccuracy: number;
  totalXp: number;
  reviewNeededCount: number;
  recentSessions: StudySession[];
}

export interface BackupData {
  version: number;
  exportedAt: string;
  studySessions: StudySession[];
  answers: Answer[];
  studyProgress: StudyProgress[];
  achievements: Achievement[];
  settings?: UserSettings;
}
