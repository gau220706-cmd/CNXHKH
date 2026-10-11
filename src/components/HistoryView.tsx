import React, { useState, useEffect } from 'react';
import {
  History,
  Trash2,
  Calendar,
  ArrowRight,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { StudySession, Answer, Question } from '../types';
import { db, clearAllPersonalData } from '../db';
import { getSessionAnswers } from '../services/sessionService';

interface HistoryViewProps {
  allQuestions: Question[];
  onReviewMistakes: (mistakeQuestions: Question[]) => void;
  onRefreshStats: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  allQuestions,
  onReviewMistakes,
  onRefreshStats
}) => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null);
  const [sessionAnswers, setSessionAnswers] = useState<Answer[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load history from DB
  const loadHistory = async () => {
    setLoading(true);
    try {
      const list = await db.studySessions.toArray();
      // Sort newest first
      setSessions(list.sort((a, b) => b.startTime - a.startTime));
    } catch (err) {
      console.error('Lỗi tải lịch sử:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Khi chọn một phiên để xem chi tiết
  const handleSelectSession = async (session: StudySession) => {
    setSelectedSession(session);
    try {
      const answers = await getSessionAnswers(session.id);
      setSessionAnswers(answers);
    } catch (err) {
      console.error('Lỗi tải chi tiết phiên:', err);
    }
  };

  // Xóa toàn bộ lịch sử sau khi xác nhận
  const handleClearHistory = async () => {
    setShowClearConfirm(false);
    try {
      await clearAllPersonalData();
      await loadHistory();
      setSelectedSession(null);
      onRefreshStats();
    } catch (err) {
      console.error('Lỗi xóa lịch sử:', err);
    }
  };

  // Ôn lại câu sai của phiên đang xem
  const handleReviewSelectedSessionMistakes = () => {
    if (!selectedSession) return;
    const ansMap = new Map<string, Answer>();
    sessionAnswers.forEach((a) => ansMap.set(a.questionId, a));

    const mistakeQs = allQuestions.filter((q) => {
      const a = ansMap.get(q.id);
      return a && !a.isCorrect;
    });

    if (mistakeQs.length > 0) {
      onReviewMistakes(mistakeQs);
    }
  };

  return (
    <div style={{ padding: '2rem 0 5rem 0' }}>
      <div className="container" style={{ maxWidth: '920px' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              Lịch sử ôn tập
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Theo dõi và rà soát lại tất cả các phiên học tập của bạn trên thiết bị này.
            </p>
          </div>

          {sessions.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="btn btn-ghost"
              style={{ color: 'var(--error)', fontSize: '0.88rem' }}
            >
              <Trash2 size={16} />
              <span>Xóa lịch sử</span>
            </button>
          )}
        </div>

        {/* Danh sách các phiên */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Đang tải lịch sử...
          </div>
        ) : sessions.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <History size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Chưa có phiên ôn tập nào
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
              Hãy bắt đầu một phiên học theo bài hoặc thử thách đề hỗn hợp 50 câu để lưu lại tiến độ đầu tiên!
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: selectedSession ? '1fr' : '1fr', gap: '1rem' }}>
            {sessions.map((s) => {
              const startDate = new Date(s.startTime);
              const formattedDate = startDate.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={s.id}
                  className="glass-panel"
                  style={{
                    padding: '1.35rem 1.6rem',
                    borderLeft: `4px solid ${s.status === 'completed' ? (s.accuracyRate >= 80 ? 'var(--success)' : 'var(--primary)') : 'var(--warning)'}`,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  onClick={() => handleSelectSession(s)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <span className={`badge ${s.mode === 'mixed' ? 'badge-primary' : 'badge-primary'}`} style={{ fontSize: '0.72rem' }}>
                          {s.mode === 'mixed' ? 'Đề hỗn hợp' : 'Theo bài'}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={13} /> {formattedDate}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        {s.lessonName || 'Đề thi trắc nghiệm hỗn hợp'}
                      </h4>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Điểm</span>
                        <strong style={{ fontSize: '1.15rem', color: 'var(--primary)' }}>
                          {s.answeredCount > 0 ? `${s.score10}/10` : '—'}
                        </strong>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Chính xác</span>
                        <strong style={{ fontSize: '1.15rem', color: 'var(--success)' }}>
                          {s.answeredCount > 0 ? `${s.accuracyRate}%` : '—'}
                        </strong>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectSession(s);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                      >
                        <span>Chi tiết</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal / Panel Chi tiết phiên được chọn */}
        {selectedSession && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.25rem'
          }}>
            <div
              className="glass-panel animate-pop-in"
              style={{
                background: 'var(--bg-secondary)',
                maxWidth: '680px',
                width: '100%',
                maxHeight: '85vh',
                overflowY: 'auto',
                padding: '2rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <span className="badge badge-primary" style={{ marginBottom: '0.5rem' }}>
                    {selectedSession.mode === 'mixed' ? 'Đề hỗn hợp' : 'Theo bài'}
                  </span>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {selectedSession.lessonName || 'Đề ôn tập hỗn hợp'}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="btn btn-ghost"
                  style={{ padding: '0.35rem 0.75rem' }}
                >
                  ✕
                </button>
              </div>

              {/* Thông số chi tiết */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.5rem',
                background: 'var(--bg-tertiary)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)'
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Số câu hỏi</span>
                  <p style={{ fontWeight: 800, margin: 0 }}>{selectedSession.totalQuestions}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đã làm</span>
                  <p style={{ fontWeight: 800, margin: 0 }}>{selectedSession.answeredCount}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Đúng</span>
                  <p style={{ fontWeight: 800, color: 'var(--success)', margin: 0 }}>{selectedSession.correctCount}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sai</span>
                  <p style={{ fontWeight: 800, color: 'var(--error)', margin: 0 }}>{selectedSession.incorrectCount}</p>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>XP đạt được</span>
                  <p style={{ fontWeight: 800, color: 'var(--warning)', margin: 0 }}>+{selectedSession.xpEarned}</p>
                </div>
              </div>

              {/* Danh sách câu hỏi trong phiên */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                  Các câu trả lời trong phiên:
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {sessionAnswers.map((ans, idx) => {
                    const q = allQuestions.find((item) => item.id === ans.questionId);
                    const isPartial = q?.type === 'multiple_choice' && !ans.isCorrect && (() => {
                        const corr = q?.correctOptionIds || [];
                        const sel = ans.selectedOptionIds || [];
                        return sel.length > 0 && sel.every((id) => corr.includes(id)) && sel.length < corr.length;
                      })();

                      let bg = ans.isCorrect ? 'var(--success-bg)' : 'var(--error-bg)';
                      let border = `1px solid ${ans.isCorrect ? 'var(--success-border)' : 'var(--error-border)'}`;
                      let statusText = ans.isCorrect ? '✓ Đúng' : '✗ Sai';
                      let statusColor = ans.isCorrect ? 'var(--success-text)' : 'var(--error-text)';

                      if (isPartial) {
                        bg = 'var(--warning-bg)';
                        border = '1px solid var(--warning-border)';
                        statusText = '⚠ Đúng một phần';
                        statusColor = 'var(--warning)';
                      }

                      return (
                        <div
                          key={ans.questionId}
                          style={{
                            padding: '0.85rem 1rem',
                            borderRadius: 'var(--radius-sm)',
                            background: bg,
                            border,
                            fontSize: '0.88rem'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                            <span style={{ fontWeight: 700 }}>
                              {idx + 1}. {q?.content || ans.questionId}
                            </span>
                            <span style={{ fontWeight: 700, color: statusColor }}>
                              {statusText}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {q?.type === 'true_false' ? (
                              <span>Dạng Đúng / Sai: <strong>{ans.isCorrect ? 'Đạt toàn bộ mệnh đề' : 'Chưa đúng các mệnh đề'}</strong></span>
                            ) : q?.type === 'drag_drop' ? (
                              <span>Dạng Kéo thả / Nối: <strong>{ans.isCorrect ? 'Ghép chính xác hoàn toàn' : 'Vị trí ghép chưa đúng'}</strong></span>
                            ) : (
                              <span>
                                Đáp án bạn chọn: <strong>{ans.selectedOptionIds?.join(', ') || 'Chưa chọn'}</strong>{isPartial ? ' (Đúng một phần)' : ''} | Đáp án đúng: <strong>{q?.correctOptionIds?.join(', ')}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                {selectedSession.incorrectCount > 0 && (
                  <button
                    onClick={() => {
                      handleReviewSelectedSessionMistakes();
                      setSelectedSession(null);
                    }}
                    className="btn btn-primary"
                    style={{ background: 'var(--warning)' }}
                  >
                    <RotateCcw size={16} />
                    <span>Ôn lại các câu sai ({selectedSession.incorrectCount})</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedSession(null)}
                  className="btn btn-secondary"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Xác nhận xóa toàn bộ lịch sử */}
        {showClearConfirm && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.25rem'
          }}>
            <div
              className="glass-panel animate-pop-in"
              style={{
                background: 'var(--bg-secondary)',
                maxWidth: '440px',
                width: '100%',
                padding: '2rem'
              }}
            >
              <div style={{ color: 'var(--error)', marginBottom: '0.75rem' }}>
                <AlertTriangle size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                Xác nhận xóa lịch sử ôn tập?
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Hành động này sẽ xóa toàn bộ các phiên ôn tập, kết quả câu trả lời và tiến độ cá nhân được lưu trên trình duyệt này.
                Ngân hàng câu hỏi gốc không bị ảnh hưởng.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="btn btn-ghost"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleClearHistory}
                  className="btn btn-primary"
                  style={{ background: 'var(--error)' }}
                >
                  Đồng ý xóa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
