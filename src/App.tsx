import React, { useState, useEffect } from 'react';
import {
  Subject,
  Lesson,
  Question,
  StudySession,
  Answer,
  UserStats,
  StudyProgress,
  UserSettings
} from './types';
import {
  initializeDatabase,
  getUserStats,
  db,
  DEFAULT_SETTINGS
} from './db';
import {
  getQuestionBank,
  prepareLessonQuestions,
  prepareMixedQuestions,
  shuffleArray
} from './services/questionService';
import {
  createStudySession,
  getActiveSession,
  getSessionAnswers
} from './services/sessionService';
import { soundService } from './services/soundService';

import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { StudySessionView } from './components/StudySessionView';
import { SummaryView } from './components/SummaryView';
import { HistoryView } from './components/HistoryView';
import { SettingsBackupModal } from './components/SettingsBackupModal';

export const App: React.FC = () => {
  // Navigation State
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'history'>('dashboard');
  const [activeView, setActiveView] = useState<'dashboard' | 'study' | 'summary' | 'history'>('dashboard');

  // Question bank state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Active Session & Summary State
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [sessionAnswers, setSessionAnswers] = useState<Answer[]>([]);
  const [newBadges, setNewBadges] = useState<string[]>([]);

  // User Stats & Progress State
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [lessonProgressList, setLessonProgressList] = useState<StudyProgress[]>([]);

  // Settings & Theme
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Khởi tạo hệ thống
  useEffect(() => {
    const initApp = async () => {
      try {
        await initializeDatabase();

        // Tải settings
        const savedSettings = await db.settings.get('current');
        if (savedSettings) {
          setSettings(savedSettings);
          soundService.setEnabled(savedSettings.soundEnabled);
          if (savedSettings.theme === 'dark' || (savedSettings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            setTheme('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
          } else {
            setTheme('light');
            document.documentElement.setAttribute('data-theme', 'light');
          }
        }

        // Tải ngân hàng câu hỏi
        const bank = await getQuestionBank();
        setSubjects(bank.subjects);
        setLessons(bank.lessons);
        setQuestions(bank.questions);

        // Khôi phục phiên đang làm dở nếu có (Section 13)
        const uncompleted = await getActiveSession();
        if (uncompleted) {
          // Khôi phục câu hỏi theo đúng danh sách questionIds đã lưu
          const orderedQuestions: Question[] = [];
          for (const qId of uncompleted.questionIds) {
            const found = bank.questions.find((q) => q.id === qId);
            if (found) orderedQuestions.push(found);
          }

          if (orderedQuestions.length > 0) {
            const answers = await getSessionAnswers(uncompleted.id);
            setActiveSession(uncompleted);
            setSessionQuestions(orderedQuestions);
            setSessionAnswers(answers);
            setActiveView('study');
          }
        }

        // Tải stats và progress
        await refreshStatsAndProgress();
      } catch (err) {
        console.error('Lỗi khởi tạo ứng dụng:', err);
      } finally {
        setIsLoadingData(false);
      }
    };

    initApp();
  }, []);

  const refreshStatsAndProgress = async () => {
    try {
      const stats = await getUserStats();
      const progress = await db.studyProgress.toArray();
      setUserStats(stats);
      setLessonProgressList(progress);
    } catch (err) {
      console.error('Lỗi cập nhật số liệu thống kê:', err);
    }
  };

  // Đổi Theme
  const handleToggleTheme = async () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    const updated = { ...settings, theme: nextTheme as 'light' | 'dark' };
    setSettings(updated);
    await db.settings.put(updated);
  };

  // Cập nhật Settings
  const handleUpdateSettings = async (newSettings: UserSettings) => {
    setSettings(newSettings);
    soundService.setEnabled(newSettings.soundEnabled);
    await db.settings.put(newSettings);
  };

  // Bắt đầu Chế độ Ôn theo bài (Section 6)
  const handleStartLesson = async (lesson: Lesson) => {
    const prepared = prepareLessonQuestions(questions, lesson.id);
    if (prepared.length === 0) {
      alert(`Bài "${lesson.name}" chưa có câu hỏi hợp lệ!`);
      return;
    }

    const session = await createStudySession('lesson', prepared, lesson.id, lesson.name);
    setActiveSession(session);
    setSessionQuestions(prepared);
    setSessionAnswers([]);
    setActiveView('study');
  };

  // Bắt đầu Chế độ Hỗn hợp 50 câu (Section 7)
  const handleStartMixed = async () => {
    const { questions: mixedQs, actualCount, message } = prepareMixedQuestions(questions, 50);

    if (mixedQs.length === 0) {
      alert(message || 'Không có câu hỏi hợp lệ để tạo đề hỗn hợp!');
      return;
    }

    if (message && actualCount < 50) {
      const proceed = confirm(`${message}\n\nBạn có muốn bắt đầu với ${actualCount} câu này không?`);
      if (!proceed) return;
    }

    const session = await createStudySession('mixed', mixedQs, undefined, 'Đề thi trắc nghiệm hỗn hợp (50 câu)');
    setActiveSession(session);
    setSessionQuestions(mixedQs);
    setSessionAnswers([]);
    setActiveView('study');
  };

  // Bắt đầu phiên Ôn lại các câu sai
  const handleReviewMistakes = async (mistakeQuestions: Question[]) => {
    if (mistakeQuestions.length === 0) return;
    const shuffled = shuffleArray(mistakeQuestions);
    const session = await createStudySession('lesson', shuffled, undefined, `Ôn lại ${shuffled.length} câu chưa đúng`);
    setActiveSession(session);
    setSessionQuestions(shuffled);
    setSessionAnswers([]);
    setActiveView('study');
  };

  // Ôn lại tất cả các câu làm sai đã lưu trong tiến độ
  const handleReviewAllMistakesFromStats = async () => {
    const progresses = await db.studyProgress.toArray();
    const mistakeSet = new Set<string>();
    progresses.forEach((p) => {
      (p.mistakeQuestionIds || []).forEach((qId) => mistakeSet.add(qId));
    });

    const targetQuestions = questions.filter((q) => mistakeSet.has(q.id));
    if (targetQuestions.length > 0) {
      handleReviewMistakes(targetQuestions);
    } else {
      alert('Tuyệt vời! Hiện tại bạn không có câu nào cần ôn lại.');
    }
  };

  // Khi hoàn thành phiên học -> Mở màn hình Tổng kết (Section 10)
  const handleFinishSession = async (finishedSession: StudySession, badges: string[]) => {
    setActiveSession(finishedSession);
    setNewBadges(badges);
    const answers = await getSessionAnswers(finishedSession.id);
    setSessionAnswers(answers);
    setActiveView('summary');
    await refreshStatsAndProgress();
  };

  // Làm lại phiên cùng bài
  const handleRestartSameLesson = () => {
    if (!activeSession) return;
    if (activeSession.mode === 'mixed') {
      handleStartMixed();
    } else if (activeSession.lessonId) {
      const l = lessons.find((item) => item.id === activeSession.lessonId);
      if (l) handleStartLesson(l);
    } else {
      setActiveView('dashboard');
    }
  };

  if (isLoadingData) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-secondary)',
        fontSize: '1.1rem'
      }}>
        Đang khởi tạo Study Hub...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar luôn hiển thị */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setActiveView(tab === 'dashboard' ? 'dashboard' : 'history');
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        stats={userStats}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main View Router */}
      <main style={{ flex: 1 }}>
        {activeView === 'dashboard' && (
          <Dashboard
            subjects={subjects}
            lessons={lessons}
            stats={userStats}
            lessonProgressList={lessonProgressList}
            onStartLesson={handleStartLesson}
            onStartMixed={handleStartMixed}
            onReviewMistakes={handleReviewAllMistakesFromStats}
          />
        )}

        {activeView === 'study' && activeSession && (
          <StudySessionView
            session={activeSession}
            questions={sessionQuestions}
            initialAnswers={sessionAnswers}
            onFinishSession={handleFinishSession}
            onExitEarly={() => {
              setActiveSession(null);
              setActiveView('dashboard');
            }}
          />
        )}

        {activeView === 'summary' && activeSession && (
          <SummaryView
            session={activeSession}
            questions={sessionQuestions}
            answers={sessionAnswers}
            newBadges={newBadges}
            onReviewMistakes={handleReviewMistakes}
            onRestartSameLesson={handleRestartSameLesson}
            onGoHome={() => {
              setActiveSession(null);
              setActiveView('dashboard');
            }}
          />
        )}

        {activeView === 'history' && (
          <HistoryView
            allQuestions={questions}
            onReviewMistakes={handleReviewMistakes}
            onRefreshStats={refreshStatsAndProgress}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-card)',
        padding: '1.5rem 0',
        marginTop: 'auto'
      }}>
        <div className="container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.85rem',
          color: 'var(--text-muted)'
        }}>
          <div>
            <strong>Study Hub</strong> — Ứng dụng ôn tập thông minh & tương tác
          </div>
          <div>
            Lưu trữ an toàn trên thiết bị (IndexedDB) • Sẵn sàng ngoại tuyến
          </div>
        </div>
      </footer>

      {/* Modal Cài đặt & Sao lưu */}
      <SettingsBackupModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onDataRestored={refreshStatsAndProgress}
      />
    </div>
  );
};
