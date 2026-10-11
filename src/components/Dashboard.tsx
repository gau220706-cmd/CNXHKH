import React, { useState } from 'react';
import {
  BookOpen,
  Shuffle,
  Clock,
  HelpCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { Lesson, Subject, UserStats, StudyProgress } from '../types';

interface DashboardProps {
  subjects: Subject[];
  lessons: Lesson[];
  stats: UserStats | null;
  lessonProgressList: StudyProgress[];
  onStartLesson: (lesson: Lesson) => void;
  onStartMixed: () => void;
  onReviewMistakes: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  subjects,
  lessons,
  stats,
  lessonProgressList,
  onStartLesson,
  onStartMixed,
  onReviewMistakes
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLessonModal, setSelectedLessonModal] = useState<Lesson | null>(null);

  // Tạo map tra cứu tiến độ bài học
  const progressMap = new Map<string, StudyProgress>();
  lessonProgressList.forEach((lp) => progressMap.set(lp.lessonId, lp));

  // Lọc bài học theo tìm kiếm
  const filteredLessons = lessons.filter((l) =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem 0 4rem 0' }}>
      <div className="container">
        {/* Phần A: Lời chào và động viên */}
        <section
          className="glass-panel"
          style={{
            padding: '2.25rem',
            marginBottom: '2rem',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.15)'
          }}
        >
          <div style={{ maxWidth: '640px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span className="badge badge-primary">Học tập tích cực</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mỗi ngày thêm vững vàng</span>
            </div>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
              Chào mừng bạn đến với Study Hub 👋
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Nắm vững kiến thức qua từng câu hỏi tương tác, nhận phản hồi tức thì và rèn luyện tư duy tự tin mỗi ngày.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <button
                onClick={onStartMixed}
                className="btn btn-primary"
                style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}
              >
                <Shuffle size={18} />
                <span>Bắt đầu Đề hỗn hợp (50 câu)</span>
              </button>
              {stats && stats.reviewNeededCount > 0 && (
                <button
                  onClick={onReviewMistakes}
                  className="btn btn-secondary"
                  style={{ borderColor: 'var(--warning-border)', color: 'var(--warning)' }}
                >
                  <RotateCcw size={18} />
                  <span>Ôn lại {stats.reviewNeededCount} câu chưa đúng</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Phần B: Hai chế độ ôn tập chính */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Chế độ ôn tập
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.25rem'
          }}>
            {/* Card 1: Ôn theo từng bài */}
            <div
              className="glass-panel"
              style={{
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)'
              }}
            >
              <div>
                <div style={{
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '16px',
                  background: 'rgba(79, 70, 229, 0.12)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem'
                }}>
                  <BookOpen size={24} />
                </div>
                <h4 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Ôn theo từng bài
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
                  Ôn tập tập trung sâu vào một bài học cụ thể để nắm chắc toàn bộ kiến thức cốt lõi.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-primary">
                    <Clock size={12} /> 25 phút
                  </span>
                  <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                    <HelpCircle size={12} /> Tùy chọn bài
                  </span>
                </div>
              </div>
              <a
                href="#lesson-list"
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <span>Chọn bài học bên dưới</span>
                <ArrowRight size={16} />
              </a>
            </div>

            {/* Card 2: Ôn tập hỗn hợp */}
            <div
              className="glass-panel"
              style={{
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1.5px solid rgba(139, 92, 246, 0.35)',
                background: 'linear-gradient(to bottom, var(--bg-card), rgba(139, 92, 246, 0.05))',
                transition: 'transform var(--transition-normal), box-shadow var(--transition-normal)'
              }}
            >
              <div>
                <div style={{
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '16px',
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem'
                }}>
                  <Shuffle size={24} />
                </div>
                <h4 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Ôn tập hỗn hợp
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.25rem' }}>
                  Thử thách kiến thức từ nhiều bài với 50 câu hỏi phân bổ công bằng, mô phỏng cấu trúc thi thực tế.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-primary" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                    <Clock size={12} /> 40 phút
                  </span>
                  <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                    <HelpCircle size={12} /> 50 câu hỏi
                  </span>
                </div>
              </div>
              <button
                onClick={onStartMixed}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}
              >
                <Shuffle size={16} />
                <span>Tạo đề hỗn hợp mới</span>
              </button>
            </div>
          </div>
        </section>

        {/* Phần D: Tiến độ học tập thực tế */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Tiến độ & Kết quả thực tế
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem'
          }}>
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                <CheckCircle2 size={16} color="var(--primary)" />
                <span>Phiên hoàn thành</span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {stats?.completedSessions || 0}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                <HelpCircle size={16} color="var(--accent)" />
                <span>Số câu đã trả lời</span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {stats?.totalAnswered || 0}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                <TrendingUp size={16} color="var(--success)" />
                <span>Tỷ lệ trả lời đúng</span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)' }}>
                {stats?.overallAccuracy || 0}%
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                <AlertCircle size={16} color="var(--warning)" />
                <span>Câu cần ôn lại</span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning)' }}>
                {stats?.reviewNeededCount || 0}
              </div>
            </div>
          </div>
        </section>

        {/* Phần C: Danh sách môn học và bài học */}
        <section id="lesson-list">
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.25rem'
          }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Danh sách bài học
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Môn: {subjects[0]?.name || 'Chủ nghĩa xã hội khoa học'} ({lessons.length} bài • {subjects[0]?.totalQuestions || 204} câu có sẵn)
              </p>
            </div>

            {/* Ô tìm kiếm bài học */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              padding: '0.5rem 0.85rem',
              width: '100%',
              maxWidth: '300px'
            }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Tìm bài học..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  width: '100%'
                }}
              />
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem'
          }}>
            {filteredLessons.map((lesson) => {
              const progress = progressMap.get(lesson.id);
              const hasStudied = progress && progress.totalAnswered > 0;
              const needReview = progress && progress.mistakeQuestionIds?.length > 0;

              return (
                <div
                  key={lesson.id}
                  className="glass-panel"
                  style={{
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderLeft: hasStudied ? '4px solid var(--primary)' : '1px solid var(--border-subtle)',
                    transition: 'all var(--transition-normal)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                      <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                        Bài {lesson.order}
                      </span>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        {needReview && (
                          <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                            {progress.mistakeQuestionIds.length} câu cần ôn
                          </span>
                        )}
                        {hasStudied && !needReview && (
                          <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                            Đã ôn
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 style={{
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      marginBottom: '0.5rem',
                      lineHeight: 1.4,
                      color: 'var(--text-primary)'
                    }}>
                      {lesson.name}
                    </h4>
                    <p style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      lineHeight: 1.5,
                      marginBottom: '1rem'
                    }}>
                      {lesson.description}
                    </p>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border-subtle)'
                  }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {lesson.questionCount || 0} câu hỏi
                    </span>
                    <button
                      onClick={() => setSelectedLessonModal(lesson)}
                      className="btn btn-secondary"
                      style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem' }}
                    >
                      <span>Ôn tập bài này</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Modal Xác nhận trước khi bắt đầu Ôn theo bài (Section 6.1) */}
      {selectedLessonModal && (
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
              maxWidth: '460px',
              width: '100%',
              padding: '2rem',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '16px',
              background: 'rgba(79, 70, 229, 0.12)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <BookOpen size={24} />
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem', lineHeight: 1.3 }}>
              {selectedLessonModal.name}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              {selectedLessonModal.description}
            </p>

            <div style={{
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-around'
            }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Thời gian</span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>25 phút</strong>
              </div>
              <div style={{ width: '1px', background: 'var(--border-subtle)' }} />
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Số câu hỏi</span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  {selectedLessonModal.questionCount || 0} câu
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedLessonModal(null)}
                className="btn btn-ghost"
              >
                Quay lại
              </button>
              <button
                onClick={() => {
                  const target = selectedLessonModal;
                  setSelectedLessonModal(null);
                  onStartLesson(target);
                }}
                className="btn btn-primary"
              >
                <span>Bắt đầu ôn tập</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
