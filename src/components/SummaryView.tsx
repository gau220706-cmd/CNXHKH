import React, { useEffect } from 'react';
import {
  Trophy,
  Clock,
  RotateCcw,
  Home,
  Award,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { StudySession, Question, Answer } from '../types';

interface SummaryViewProps {
  session: StudySession;
  questions: Question[];
  answers: Answer[];
  newBadges: string[];
  onReviewMistakes: (mistakeQuestions: Question[]) => void;
  onRestartSameLesson: () => void;
  onGoHome: () => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  session,
  questions,
  answers,
  newBadges,
  onReviewMistakes,
  onRestartSameLesson,
  onGoHome
}) => {
  // Bản đồ câu trả lời
  const answersMap = new Map<string, Answer>();
  answers.forEach((a) => answersMap.set(a.questionId, a));

  // Lọc ra danh sách câu sai
  const mistakeQuestions = questions.filter((q) => {
    const a = answersMap.get(q.id);
    return a && !a.isCorrect;
  });

  // Tính tổng thời gian đã sử dụng
  const elapsedMs = session.endTime ? Math.max(0, session.endTime - session.startTime) : session.plannedDuration;
  const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000));
  const elapsedSeconds = Math.floor((elapsedMs % (60 * 1000)) / 1000);

  // Hiệu ứng ăn mừng khi điểm cao hoặc đạt huy hiệu
  useEffect(() => {
    if (session.accuracyRate >= 80 || newBadges.length > 0) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // Confetti non-critical
      }
    }
  }, [session.accuracyRate, newBadges.length]);

  return (
    <div style={{ padding: '2rem 0 5rem 0' }}>
      <div className="container" style={{ maxWidth: '800px' }}>
        {/* Card Tổng kết chính */}
        <div
          className="glass-panel animate-pop-in"
          style={{
            padding: '2.5rem',
            textAlign: 'center',
            marginBottom: '2rem',
            background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-card) 100%)',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          {/* Trophy / Status Icon */}
          <div style={{
            width: '4.5rem',
            height: '4.5rem',
            borderRadius: '50%',
            background: session.accuracyRate >= 80 ? 'var(--warning-bg)' : 'var(--primary-light)',
            color: session.accuracyRate >= 80 ? 'var(--warning)' : 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto'
          }}>
            <Trophy size={36} />
          </div>

          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
            Tổng kết phiên ôn tập
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '1.5rem' }}>
            {session.lessonName || (session.mode === 'mixed' ? 'Đề ôn tập hỗn hợp 50 câu' : 'Chủ nghĩa xã hội khoa học')}
          </p>

          {/* New Badges Announcement */}
          {newBadges.length > 0 && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              borderRadius: 'var(--radius-full)',
              background: 'var(--warning-bg)',
              color: 'var(--warning)',
              border: '1px solid var(--warning-border)',
              fontWeight: 700,
              fontSize: '0.92rem',
              marginBottom: '1.75rem'
            }}>
              <Award size={18} />
              <span>Mở khóa huy hiệu mới: {newBadges.join(', ')} 🎉</span>
            </div>
          )}

          {/* Main Score Highlights */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            {/* Điểm thang 10 */}
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Điểm thang 10
              </span>
              <strong style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
                {session.answeredCount > 0 ? `${session.score10}/10` : '—'}
              </strong>
            </div>

            {/* Tỷ lệ chính xác */}
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Độ chính xác
              </span>
              <strong style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--success)' }}>
                {session.answeredCount > 0 ? `${session.accuracyRate}%` : '—'}
              </strong>
            </div>

            {/* XP nhận được */}
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Kinh nghiệm
              </span>
              <strong style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning)' }}>
                +{session.xpEarned || 0} XP
              </strong>
            </div>

            {/* Thời gian làm bài */}
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                Thời gian ôn
              </span>
              <strong style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', height: '100%', maxHeight: '42px' }}>
                <Clock size={18} />
                <span>{elapsedMinutes}m {elapsedSeconds}s</span>
              </strong>
            </div>
          </div>

          {/* Breakdown Statistics */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1.25rem',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '2rem'
          }}>
            <div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Đã trả lời</span>
              <p style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                {session.answeredCount} / {session.totalQuestions}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Số câu đúng</span>
              <p style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--success)' }}>
                {session.correctCount}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Số câu sai</span>
              <p style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--error)' }}>
                {session.incorrectCount}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Chưa trả lời</span>
              <p style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-muted)' }}>
                {session.unansweredCount}
              </p>
            </div>
          </div>

          {/* Navigation Action Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem' }}>
            {mistakeQuestions.length > 0 && (
              <button
                onClick={() => onReviewMistakes(mistakeQuestions)}
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)' }}
              >
                <RotateCcw size={16} />
                <span>Ôn lại {mistakeQuestions.length} câu làm sai</span>
              </button>
            )}

            <button
              onClick={onRestartSameLesson}
              className="btn btn-secondary"
            >
              <RotateCcw size={16} />
              <span>Bắt đầu phiên mới</span>
            </button>

            <button
              onClick={onGoHome}
              className="btn btn-ghost"
            >
              <Home size={16} />
              <span>Trang chủ</span>
            </button>
          </div>
        </div>

        {/* Danh sách câu hỏi làm sai và giải thích chi tiết */}
        {mistakeQuestions.length > 0 && (
          <section className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error-text)' }}>
              <AlertCircle size={20} color="var(--error)" />
              <span>Chi tiết {mistakeQuestions.length} câu cần lưu ý</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {mistakeQuestions.map((q, idx) => {
                const answer = answersMap.get(q.id);
                const selectedSet = new Set(answer?.selectedOptionIds || []);
                const correctSet = new Set(q.correctOptionIds);

                return (
                  <div
                    key={q.id}
                    style={{
                      background: 'var(--bg-secondary)',
                      padding: '1.35rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Câu {idx + 1}
                      </span>
                      <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>
                        Cần ôn lại
                      </span>
                    </div>

                    <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {q.content}
                    </p>

                    {/* Hiển thị chi tiết theo từng loại câu hỏi */}
                    {q.options && q.options.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                        {q.options.map((opt) => {
                          const isCorrect = correctSet.has(opt.id);
                          const isSelected = selectedSet.has(opt.id);

                          let bg = 'var(--bg-primary)';
                          let border = '1px solid var(--border-subtle)';
                          let color = 'var(--text-secondary)';

                          if (isCorrect) {
                            bg = 'var(--success-bg)';
                            border = '1px solid var(--success-border)';
                            color = 'var(--success-text)';
                          } else if (isSelected) {
                            bg = 'var(--error-bg)';
                            border = '1px solid var(--error-border)';
                            color = 'var(--error-text)';
                          }

                          return (
                            <div
                              key={opt.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.65rem 0.95rem',
                                borderRadius: 'var(--radius-sm)',
                                background: bg,
                                border,
                                color,
                                fontSize: '0.9rem'
                              }}
                            >
                              <span>
                                <strong>{opt.id}.</strong> {opt.text}
                              </span>
                              <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                                {isCorrect && '✓ Đáp án đúng'}
                                {isSelected && !isCorrect && '✗ Bạn đã chọn'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* True / False detail */}
                    {q.tfItems && q.tfItems.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                        {q.tfItems.map((item) => {
                          const userAns = answer?.tfAnswers?.[item.id];
                          const isRight = userAns === item.correctAnswer;
                          return (
                            <div
                              key={item.id}
                              style={{
                                padding: '0.65rem 0.95rem',
                                borderRadius: 'var(--radius-sm)',
                                background: isRight ? 'var(--success-bg)' : 'var(--error-bg)',
                                border: `1px solid ${isRight ? 'var(--success-border)' : 'var(--error-border)'}`,
                                fontSize: '0.88rem'
                              }}
                            >
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                                {item.id}. {item.statement}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: isRight ? 'var(--success-text)' : 'var(--error-text)' }}>
                                Bạn chọn: <strong>{userAns || 'Chưa chọn'}</strong> | Đáp án đúng: <strong>{item.correctAnswer}</strong>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Drag Drop detail */}
                    {q.ddTargets && q.ddTargets.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                        {q.ddTargets.map((target) => {
                          const matchedIds = answer?.ddMatches?.[target.id] || [];
                          const correctTexts = (target.correctItemIds || []).map((id) => (q.ddItems || []).find((c) => c.id === id)?.text).filter(Boolean);
                          const userTexts = matchedIds.map((id) => (q.ddItems || []).find((c) => c.id === id)?.text).filter(Boolean);
                          const isRight = matchedIds.length === target.correctItemIds.length && matchedIds.every((id) => target.correctItemIds.includes(id));
                          return (
                            <div
                              key={target.id}
                              style={{
                                padding: '0.65rem 0.95rem',
                                borderRadius: 'var(--radius-sm)',
                                background: isRight ? 'var(--success-bg)' : 'var(--error-bg)',
                                border: `1px solid ${isRight ? 'var(--success-border)' : 'var(--error-border)'}`,
                                fontSize: '0.88rem'
                              }}
                            >
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                                {target.prompt}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: isRight ? 'var(--success-text)' : 'var(--error-text)' }}>
                                Bạn chọn: <strong>{userTexts.join(', ') || 'Chưa chọn'}</strong> | Đáp án đúng: <strong>{correctTexts.join(', ')}</strong>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.explanation && (
                      <div style={{
                        padding: '0.75rem',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)'
                      }}>
                        <strong>Ghi nhớ:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
