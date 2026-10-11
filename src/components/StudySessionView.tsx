import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Flag,
  Sparkles,
  HelpCircle,
  AlertCircle,
  LayoutGrid,
  Check,
  X,
  MoveHorizontal
} from 'lucide-react';
import { Question, StudySession, Answer } from '../types';
import { submitQuestionAnswer, finishSession } from '../services/sessionService';
import { getRandomPraise, getRandomEncouragement } from '../services/questionService';
import { soundService } from '../services/soundService';

interface StudySessionViewProps {
  session: StudySession;
  questions: Question[];
  initialAnswers: Answer[];
  onFinishSession: (finishedSession: StudySession, newBadges: string[]) => void;
  onExitEarly: () => void;
}

export const StudySessionView: React.FC<StudySessionViewProps> = ({
  session,
  questions,
  initialAnswers,
  onFinishSession,
  onExitEarly
}) => {
  // Bản đồ câu trả lời: questionId -> Answer
  const [answersMap, setAnswersMap] = useState<Map<string, Answer>>(() => {
    const map = new Map<string, Answer>();
    initialAnswers.forEach((a) => map.set(a.questionId, a));
    return map;
  });

  // Chỉ số câu hỏi đang hiển thị (0-indexed)
  const [currentIndex, setCurrentIndex] = useState(0);

  // 1. State cho single_choice & multiple_choice
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);

  // 2. State cho true_false: itemId -> 'Đúng' | 'Sai'
  const [tfAnswers, setTfAnswers] = useState<Record<string, 'Đúng' | 'Sai'>>({});

  // 3. State cho drag_drop: targetId -> array of itemIds
  const [ddMatches, setDdMatches] = useState<Record<string, string[]>>({});
  const [selectedChipId, setSelectedChipId] = useState<string | null>(null);

  // Động viên / lời khen cho câu hiện tại
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Trạng thái đang lưu/chấm để chống click đúp
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hiển thị bảng chọn câu hỏi nhanh
  const [showQuestionGrid, setShowQuestionGrid] = useState(false);

  // Modal xác nhận nộp bài sớm
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);

  // Bộ đếm thời gian thực dựa trên timestamp (Section 13)
  const [timeLeftMs, setTimeLeftMs] = useState<number>(() => {
    const endTime = session.startTime + session.plannedDuration;
    return Math.max(0, endTime - Date.now());
  });

  const timerRef = useRef<number | null>(null);
  const currentQ = questions[currentIndex];
  const existingAnswer = currentQ ? answersMap.get(currentQ.id) : undefined;

  // Khôi phục lựa chọn khi chuyển câu hỏi
  useEffect(() => {
    if (existingAnswer) {
      setSelectedOptionIds(existingAnswer.selectedOptionIds || []);
      setTfAnswers(existingAnswer.tfAnswers || {});
      setDdMatches(existingAnswer.ddMatches || {});

      if (currentQ.type === 'multiple_choice') {
        const correct = currentQ.correctOptionIds || [];
        const sel = existingAnswer.selectedOptionIds || [];
        const selCorrect = sel.filter((id) => correct.includes(id));
        const selWrong = sel.filter((id) => !correct.includes(id));
        const missing = correct.filter((id) => !sel.includes(id));

        if (selWrong.length === 0 && missing.length === 0) {
          setFeedbackMessage(existingAnswer.isCorrect ? 'Chính xác! ✨' : 'Hãy ghi nhớ đáp án đúng này nhé 💪');
        } else if (selCorrect.length > 0 && selWrong.length === 0 && missing.length > 0) {
          setFeedbackMessage('Đúng một phần, chưa đầy đủ');
        } else if (selCorrect.length > 0 && selWrong.length > 0) {
          setFeedbackMessage('Chưa chính xác (Có đáp án chọn sai)');
        } else {
          setFeedbackMessage('Chưa chính xác! Hãy ghi nhớ đáp án đúng này nhé 💪');
        }
      } else {
        setFeedbackMessage(
          existingAnswer.isCorrect ? 'Chính xác! ✨' : 'Hãy ghi nhớ đáp án đúng này nhé 💪'
        );
      }
    } else {
      setSelectedOptionIds([]);
      setTfAnswers({});
      setDdMatches({});
      setSelectedChipId(null);
      setFeedbackMessage(null);
    }
  }, [currentIndex, existingAnswer]);

  // Bộ đếm thời gian chuẩn xác theo timestamp
  useEffect(() => {
    const targetEndTime = session.startTime + session.plannedDuration;

    const checkTime = () => {
      const remaining = targetEndTime - Date.now();
      if (remaining <= 0) {
        setTimeLeftMs(0);
        if (timerRef.current) clearInterval(timerRef.current);
        handleAutoFinishOnTimeout();
      } else {
        setTimeLeftMs(remaining);
      }
    };

    checkTime();
    timerRef.current = window.setInterval(checkTime, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session]);

  const handleAutoFinishOnTimeout = async () => {
    try {
      const result = await finishSession(session.id, true);
      soundService.playComplete();
      onFinishSession(result.session, result.newBadges);
    } catch (err) {
      console.error('Lỗi tự động kết thúc phiên:', err);
    }
  };

  // Định dạng thời gian MM:SS
  const formatTime = (ms: number) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. Xử lý chọn phương án trắc nghiệm A, B, C, D
  const handleToggleOption = (optId: string) => {
    if (existingAnswer || isSubmitting) return;

    if (currentQ.type === 'single_choice') {
      setSelectedOptionIds([optId]);
    } else {
      if (selectedOptionIds.includes(optId)) {
        setSelectedOptionIds(selectedOptionIds.filter((id) => id !== optId));
      } else {
        setSelectedOptionIds([...selectedOptionIds, optId]);
      }
    }
  };

  // 2. Xử lý chọn Đúng / Sai
  const handleSetTrueFalse = (itemId: string, val: 'Đúng' | 'Sai') => {
    if (existingAnswer || isSubmitting) return;
    setTfAnswers((prev) => ({ ...prev, [itemId]: val }));
  };

  // 3. Xử lý Kéo thả / Ghép nối
  // Lấy các item đã được đặt vào target
  const placedItemIds = new Set(Object.values(ddMatches).flat());
  const availableChips = (currentQ?.ddItems || []).filter((item) => !placedItemIds.has(item.id));

  const handlePlaceChipOnTarget = (chipId: string, targetId: string) => {
    if (existingAnswer || isSubmitting) return;
    setDdMatches((prev) => {
      // Xóa chip khỏi bất kỳ target cũ nếu có
      const updated: Record<string, string[]> = {};
      for (const [tId, ids] of Object.entries(prev)) {
        updated[tId] = ids.filter((id) => id !== chipId);
      }
      updated[targetId] = [...(updated[targetId] || []), chipId];
      return updated;
    });
    setSelectedChipId(null);
  };

  const handleRemoveChipFromTarget = (chipId: string, targetId: string) => {
    if (existingAnswer || isSubmitting) return;
    setDdMatches((prev) => ({
      ...prev,
      [targetId]: (prev[targetId] || []).filter((id) => id !== chipId)
    }));
  };

  // Kiểm tra điều kiện nút nộp câu hỏi
  const canSubmit = (): boolean => {
    if (existingAnswer || isSubmitting) return false;
    if (currentQ.type === 'single_choice' || currentQ.type === 'multiple_choice') {
      return selectedOptionIds.length > 0;
    }
    if (currentQ.type === 'true_false') {
      const items = currentQ.tfItems || [];
      return items.length > 0 && items.every((it) => tfAnswers[it.id] !== undefined);
    }
    if (currentQ.type === 'drag_drop') {
      const targets = currentQ.ddTargets || [];
      return targets.length > 0 && targets.every((t) => (ddMatches[t.id] || []).length > 0);
    }
    return false;
  };

  // Xác nhận nộp câu trả lời & chấm điểm tức thì
  const handleSubmitAnswer = async () => {
    if (!canSubmit()) return;

    setIsSubmitting(true);
    try {
      const res = await submitQuestionAnswer(
        session,
        currentQ,
        selectedOptionIds,
        tfAnswers,
        ddMatches
      );

      const newMap = new Map(answersMap);
      newMap.set(currentQ.id, res.answer);
      setAnswersMap(newMap);

      if (currentQ.type === 'multiple_choice') {
        const correct = currentQ.correctOptionIds || [];
        const sel = selectedOptionIds;
        const selCorrect = sel.filter((id) => correct.includes(id));
        const selWrong = sel.filter((id) => !correct.includes(id));
        const missing = correct.filter((id) => !sel.includes(id));

        if (selWrong.length === 0 && missing.length === 0) {
          setFeedbackMessage(getRandomPraise());
          soundService.playCorrect();
        } else if (selCorrect.length > 0 && selWrong.length === 0 && missing.length > 0) {
          setFeedbackMessage('Đúng một phần, chưa đầy đủ');
          soundService.playIncorrect();
        } else if (selCorrect.length > 0 && selWrong.length > 0) {
          setFeedbackMessage('Chưa chính xác (Có đáp án chọn sai)');
          soundService.playIncorrect();
        } else {
          setFeedbackMessage(getRandomEncouragement());
          soundService.playIncorrect();
        }
      } else {
        if (res.isCorrect) {
          setFeedbackMessage(getRandomPraise());
          soundService.playCorrect();
        } else {
          setFeedbackMessage(getRandomEncouragement());
          soundService.playIncorrect();
        }
      }
    } catch (err) {
      console.error('Lỗi khi chấm câu trả lời:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleConfirmFinish = async () => {
    setShowConfirmFinish(false);
    try {
      const result = await finishSession(session.id, false);
      soundService.playComplete();
      onFinishSession(result.session, result.newBadges);
    } catch (err) {
      console.error('Lỗi kết thúc bài:', err);
    }
  };

  const answeredCount = answersMap.size;
  const progressPercent = Math.round((answeredCount / questions.length) * 100);
  const isTimeWarning = timeLeftMs < 3 * 60 * 1000;

  if (!currentQ) {
    return <div>Không có câu hỏi nào trong phiên.</div>;
  }

  // Label phân loại câu hỏi
  const getTypeBadgeLabel = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return '☑ Chọn nhiều đáp án';
      case 'true_false':
        return '⚖ Nhận định Đúng / Sai';
      case 'drag_drop':
        return '⇄ Kéo thả & Ghép nối';
      default:
        return '◉ Chọn 1 đáp án';
    }
  };

  return (
    <div style={{ padding: '1.5rem 0 4rem 0', minHeight: '85vh' }}>
      <div className="container" style={{ maxWidth: '880px' }}>
        {/* Top Session Header */}
        <div
          className="glass-panel"
          style={{
            padding: '1rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
              {session.mode === 'mixed' ? 'Đề hỗn hợp (50 câu)' : 'Ôn theo bài'}
            </span>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {session.lessonName || 'Chủ nghĩa xã hội khoa học'}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.9rem',
                borderRadius: 'var(--radius-full)',
                fontWeight: 800,
                fontSize: '1.05rem',
                background: isTimeWarning ? 'var(--error-bg)' : 'var(--bg-tertiary)',
                color: isTimeWarning ? 'var(--error)' : 'var(--text-primary)',
                border: isTimeWarning ? '1px solid var(--error-border)' : '1px solid var(--border-subtle)',
                transition: 'all 0.3s'
              }}
              title="Thời gian còn lại của phiên thi"
            >
              <Clock size={16} />
              <span>{formatTime(timeLeftMs)}</span>
            </div>

            <button
              onClick={() => setShowQuestionGrid(!showQuestionGrid)}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
              title="Danh sách câu hỏi"
            >
              <LayoutGrid size={16} />
              <span className="nav-text">{currentIndex + 1}/{questions.length}</span>
            </button>

            <button
              onClick={() => setShowConfirmFinish(true)}
              className="btn btn-ghost"
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}
            >
              <Flag size={16} />
              <span className="nav-text">Nộp bài</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            <span>Đã làm: {answeredCount} / {questions.length} câu</span>
            <span>{progressPercent}%</span>
          </div>
          <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'var(--primary-gradient)',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Question Navigation Grid (Drawer) */}
        {showQuestionGrid && (
          <div
            className="glass-panel animate-fade-in"
            style={{
              padding: '1.25rem',
              marginBottom: '1.5rem',
              maxHeight: '260px',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Bảng danh sách câu hỏi:
              </span>
              <button
                onClick={() => setShowQuestionGrid(false)}
                className="btn btn-ghost"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
              >
                Đóng
              </button>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
              gap: '0.45rem'
            }}>
              {questions.map((q, idx) => {
                const ans = answersMap.get(q.id);
                const isCurrent = idx === currentIndex;
                let bg = 'var(--bg-secondary)';
                let color = 'var(--text-primary)';
                let border = '1px solid var(--border-strong)';

                if (ans) {
                  const qItem = questions[idx];
                  const isPartiallyCorrect =
                    qItem.type === 'multiple_choice' &&
                    !ans.isCorrect &&
                    (() => {
                      const corr = qItem.correctOptionIds || [];
                      const sel = ans.selectedOptionIds || [];
                      return (
                        sel.length > 0 &&
                        sel.every((id) => corr.includes(id)) &&
                        sel.length < corr.length
                      );
                    })();

                  if (ans.isCorrect) {
                    bg = 'var(--success-bg)';
                    color = 'var(--success-text)';
                    border = '1px solid var(--success-border)';
                  } else if (isPartiallyCorrect) {
                    bg = 'var(--warning-bg)';
                    color = 'var(--warning)';
                    border = '1px solid var(--warning-border)';
                  } else {
                    bg = 'var(--error-bg)';
                    color = 'var(--error-text)';
                    border = '1px solid var(--error-border)';
                  }
                }

                if (isCurrent) {
                  border = '2px solid var(--primary)';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowQuestionGrid(false);
                    }}
                    style={{
                      height: '38px',
                      borderRadius: 'var(--radius-sm)',
                      background: bg,
                      color: color,
                      border: border,
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s'
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Question Card */}
        <div
          className="glass-panel animate-fade-in"
          style={{
            padding: '2rem',
            marginBottom: '1.75rem',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          {/* Header câu hỏi */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)' }}>
              CÂU {currentIndex + 1} / {questions.length}
            </span>
            <span className="badge" style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              fontSize: '0.75rem'
            }}>
              {getTypeBadgeLabel(currentQ.type)}
            </span>
          </div>

          {/* Nội dung câu hỏi */}
          <h3 style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            lineHeight: 1.6,
            marginBottom: '1.75rem',
            color: 'var(--text-primary)'
          }}>
            {currentQ.content}
          </h3>

          {/* ======================================================== */}
          {/* DẠNG 1 & 2: TRẮC NGHIỆM CHỌN 1 ĐÁP ÁN & NHIỀU ĐÁP ÁN    */}
          {/* ======================================================== */}
          {(currentQ.type === 'single_choice' || currentQ.type === 'multiple_choice') && currentQ.options && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.75rem' }}>
              {currentQ.options.map((opt) => {
                const isSelected = selectedOptionIds.includes(opt.id);
                const isGraded = Boolean(existingAnswer);

                let cardBg = 'var(--bg-secondary)';
                let borderColor = 'var(--border-subtle)';
                let textColor = 'var(--text-primary)';
                let circleBg = 'var(--bg-tertiary)';
                let circleColor = 'var(--text-secondary)';
                let circleBorder = 'none';
                let trailingIcon: React.ReactNode = null;

                if (!isGraded) {
                  if (isSelected) {
                    cardBg = 'var(--primary-light)';
                    borderColor = 'var(--primary)';
                    textColor = 'var(--primary)';
                    circleBg = 'var(--primary)';
                    circleColor = '#ffffff';
                  }
                } else if (currentQ.type === 'single_choice') {
                  const isCorrectAnswer = (currentQ.correctOptionIds || []).includes(opt.id);
                  const isIncorrectChoice = isSelected && !isCorrectAnswer;

                  if (isCorrectAnswer) {
                    cardBg = 'var(--success-bg)';
                    borderColor = 'var(--success)';
                    textColor = 'var(--success-text)';
                    circleBg = 'var(--success)';
                    circleColor = '#ffffff';
                    trailingIcon = <CheckCircle2 size={20} color="var(--success)" />;
                  } else if (isIncorrectChoice) {
                    cardBg = 'var(--error-bg)';
                    borderColor = 'var(--error)';
                    textColor = 'var(--error-text)';
                    circleBg = 'var(--error)';
                    circleColor = '#ffffff';
                    trailingIcon = <XCircle size={20} color="var(--error)" />;
                  } else {
                    cardBg = 'var(--bg-primary)';
                    borderColor = 'var(--border-subtle)';
                    textColor = 'var(--text-muted)';
                  }
                } else {
                  // currentQ.type === 'multiple_choice'
                  const correctIds = currentQ.correctOptionIds || [];
                  const selIds = selectedOptionIds;
                  const selCorrect = selIds.filter((id) => correctIds.includes(id));
                  const selWrong = selIds.filter((id) => !correctIds.includes(id));
                  const missingCorrect = correctIds.filter((id) => !selIds.includes(id));

                  const isFullCorrect = selWrong.length === 0 && missingCorrect.length === 0;
                  const isPartialCorrect = selCorrect.length > 0 && selWrong.length === 0 && missingCorrect.length > 0;
                  const isIncorrectWithCorrect = selCorrect.length > 0 && selWrong.length > 0;
                  const isKeyCorrect = correctIds.includes(opt.id);

                  if (isFullCorrect) {
                    if (isKeyCorrect) {
                      cardBg = 'var(--success-bg)';
                      borderColor = 'var(--success)';
                      textColor = 'var(--success-text)';
                      circleBg = 'var(--success)';
                      circleColor = '#ffffff';
                      trailingIcon = <CheckCircle2 size={20} color="var(--success)" />;
                    } else {
                      cardBg = 'var(--bg-primary)';
                      borderColor = 'var(--border-subtle)';
                      textColor = 'var(--text-muted)';
                    }
                  } else if (isPartialCorrect) {
                    if (isSelected && isKeyCorrect) {
                      // Đã chọn đúng một phần
                      cardBg = 'var(--warning-bg)';
                      borderColor = 'var(--warning)';
                      textColor = 'var(--text-primary)';
                      circleBg = 'var(--warning)';
                      circleColor = '#ffffff';
                      trailingIcon = (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                          <span className="badge badge-warning" style={{ fontSize: '0.72rem', textTransform: 'none' }}>
                            Đúng một phần
                          </span>
                          <CheckCircle2 size={20} color="var(--warning)" />
                        </div>
                      );
                    } else if (!isSelected && isKeyCorrect) {
                      // Đáp án đúng còn thiếu
                      cardBg = 'var(--bg-secondary)';
                      borderColor = 'var(--success)';
                      circleBorder = '1.5px dashed var(--success)';
                      textColor = 'var(--text-primary)';
                      trailingIcon = (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                          <span className="badge badge-success" style={{ fontSize: '0.72rem', textTransform: 'none' }}>
                            Đáp án đúng còn thiếu
                          </span>
                          <Check size={18} color="var(--success)" />
                        </div>
                      );
                    } else {
                      cardBg = 'var(--bg-primary)';
                      borderColor = 'var(--border-subtle)';
                      textColor = 'var(--text-muted)';
                    }
                  } else if (isIncorrectWithCorrect) {
                    if (isSelected && !isKeyCorrect) {
                      // Lựa chọn sai
                      cardBg = 'var(--error-bg)';
                      borderColor = 'var(--error)';
                      textColor = 'var(--error-text)';
                      circleBg = 'var(--error)';
                      circleColor = '#ffffff';
                      trailingIcon = (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                          <span className="badge" style={{ background: 'var(--error-bg)', color: 'var(--error-text)', border: '1px solid var(--error-border)', fontSize: '0.72rem', textTransform: 'none' }}>
                            Lựa chọn sai
                          </span>
                          <XCircle size={20} color="var(--error)" />
                        </div>
                      );
                    } else if (isSelected && isKeyCorrect) {
                      // Đã chọn đúng
                      cardBg = 'var(--success-bg)';
                      borderColor = 'var(--success-border)';
                      textColor = 'var(--success-text)';
                      circleBg = 'var(--success)';
                      circleColor = '#ffffff';
                      trailingIcon = (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                          <span className="badge badge-success" style={{ fontSize: '0.72rem', textTransform: 'none' }}>
                            Đã chọn đúng
                          </span>
                          <CheckCircle2 size={20} color="var(--success)" />
                        </div>
                      );
                    } else if (!isSelected && isKeyCorrect) {
                      // Đáp án đúng còn thiếu
                      cardBg = 'var(--bg-secondary)';
                      borderColor = 'var(--success)';
                      circleBorder = '1.5px dashed var(--success)';
                      textColor = 'var(--text-primary)';
                      trailingIcon = (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                          <span className="badge badge-success" style={{ fontSize: '0.72rem', textTransform: 'none' }}>
                            Đáp án đúng còn thiếu
                          </span>
                          <Check size={18} color="var(--success)" />
                        </div>
                      );
                    } else {
                      cardBg = 'var(--bg-primary)';
                      borderColor = 'var(--border-subtle)';
                      textColor = 'var(--text-muted)';
                    }
                  } else {
                    // Chọn hoàn toàn sai
                    if (isSelected && !isKeyCorrect) {
                      cardBg = 'var(--error-bg)';
                      borderColor = 'var(--error)';
                      textColor = 'var(--error-text)';
                      circleBg = 'var(--error)';
                      circleColor = '#ffffff';
                      trailingIcon = (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                          <span className="badge" style={{ background: 'var(--error-bg)', color: 'var(--error-text)', border: '1px solid var(--error-border)', fontSize: '0.72rem', textTransform: 'none' }}>
                            Lựa chọn sai
                          </span>
                          <XCircle size={20} color="var(--error)" />
                        </div>
                      );
                    } else if (!isSelected && isKeyCorrect) {
                      cardBg = 'var(--success-bg)';
                      borderColor = 'var(--success)';
                      textColor = 'var(--success-text)';
                      circleBg = 'var(--success)';
                      circleColor = '#ffffff';
                      trailingIcon = (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                          <span className="badge badge-success" style={{ fontSize: '0.72rem', textTransform: 'none' }}>
                            Đáp án đúng
                          </span>
                          <CheckCircle2 size={20} color="var(--success)" />
                        </div>
                      );
                    } else {
                      cardBg = 'var(--bg-primary)';
                      borderColor = 'var(--border-subtle)';
                      textColor = 'var(--text-muted)';
                    }
                  }
                }

                const isBorderDashed = isGraded && currentQ.type === 'multiple_choice' && !isSelected && (currentQ.correctOptionIds || []).includes(opt.id) && !existingAnswer?.isCorrect;

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleToggleOption(opt.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.9rem',
                      padding: '1rem 1.25rem',
                      borderRadius: 'var(--radius-md)',
                      background: cardBg,
                      border: isBorderDashed ? `1.5px dashed ${borderColor}` : `1.5px solid ${borderColor}`,
                      cursor: isGraded ? 'default' : 'pointer',
                      transition: 'all var(--transition-fast)',
                      userSelect: 'none'
                    }}
                  >
                    <div style={{
                      width: '1.9rem',
                      height: '1.9rem',
                      borderRadius: '50%',
                      background: circleBg,
                      color: circleColor,
                      border: circleBorder,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      flexShrink: 0
                    }}>
                      {opt.id}
                    </div>

                    <div style={{ flex: 1, paddingTop: '0.15rem' }}>
                      <span style={{ fontSize: '1rem', lineHeight: 1.5, color: textColor, fontWeight: isSelected || isGraded ? 600 : 400 }}>
                        {opt.text}
                      </span>
                    </div>

                    {trailingIcon}
                  </div>
                );
              })}
            </div>
          )}

          {/* ======================================================== */}
          {/* DẠNG 3: NHẬN ĐỊNH ĐÚNG / SAI                             */}
          {/* ======================================================== */}
          {currentQ.type === 'true_false' && currentQ.tfItems && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
              {currentQ.tfItems.map((item, idx) => {
                const isGraded = Boolean(existingAnswer);
                const userChoice = tfAnswers[item.id];
                const isCorrect = userChoice === item.correctAnswer;

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '1.15rem 1.25rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-secondary)',
                      border: isGraded ? (isCorrect ? '1.5px solid var(--success-border)' : '1.5px solid var(--error-border)') : '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                      <span style={{ fontWeight: 800, color: 'var(--primary)', flexShrink: 0 }}>
                        {idx + 1}.
                      </span>
                      <span style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--text-primary)', flex: 1 }}>
                        {item.statement}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {/* Nút ĐÚNG */}
                      <button
                        type="button"
                        onClick={() => handleSetTrueFalse(item.id, 'Đúng')}
                        disabled={isGraded}
                        className="btn"
                        style={{
                          padding: '0.45rem 1.15rem',
                          fontSize: '0.88rem',
                          background: userChoice === 'Đúng' ? (isGraded ? (isCorrect ? 'var(--success)' : 'var(--error)') : 'var(--primary)') : 'var(--bg-tertiary)',
                          color: userChoice === 'Đúng' ? '#ffffff' : 'var(--text-primary)',
                          border: '1px solid var(--border-strong)',
                          cursor: isGraded ? 'default' : 'pointer'
                        }}
                      >
                        <Check size={14} />
                        <span>Đúng</span>
                      </button>

                      {/* Nút SAI */}
                      <button
                        type="button"
                        onClick={() => handleSetTrueFalse(item.id, 'Sai')}
                        disabled={isGraded}
                        className="btn"
                        style={{
                          padding: '0.45rem 1.15rem',
                          fontSize: '0.88rem',
                          background: userChoice === 'Sai' ? (isGraded ? (isCorrect ? 'var(--success)' : 'var(--error)') : 'var(--primary)') : 'var(--bg-tertiary)',
                          color: userChoice === 'Sai' ? '#ffffff' : 'var(--text-primary)',
                          border: '1px solid var(--border-strong)',
                          cursor: isGraded ? 'default' : 'pointer'
                        }}
                      >
                        <X size={14} />
                        <span>Sai</span>
                      </button>

                      {isGraded && (
                        <span style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: isCorrect ? 'var(--success)' : 'var(--error)',
                          marginLeft: '0.5rem'
                        }}>
                          {isCorrect ? '✓ Đúng' : `✗ Sai (Đáp án: ${item.correctAnswer})`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ======================================================== */}
          {/* DẠNG 4: KÉO THẢ & GHÉP NỐI (DRAG AND DROP)              */}
          {/* ======================================================== */}
          {currentQ.type === 'drag_drop' && currentQ.ddTargets && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.75rem' }}>
              {/* Kho thẻ từ có sẵn để kéo / chọn */}
              {!existingAnswer && (
                <div style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-tertiary)',
                  border: '1px dashed var(--border-strong)'
                }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                    💡 Bấm hoặc kéo thẻ đáp án vào vị trí tương ứng bên dưới:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {availableChips.map((chip) => {
                      const isSelected = selectedChipId === chip.id;
                      return (
                        <div
                          key={chip.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', chip.id);
                          }}
                          onClick={() => setSelectedChipId(isSelected ? null : chip.id)}
                          style={{
                            padding: '0.5rem 0.95rem',
                            borderRadius: 'var(--radius-full)',
                            background: isSelected ? 'var(--primary)' : 'var(--bg-secondary)',
                            color: isSelected ? '#ffffff' : 'var(--text-primary)',
                            border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-strong)'}`,
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'grab',
                            boxShadow: 'var(--shadow-sm)',
                            transition: 'all 0.15s',
                            userSelect: 'none'
                          }}
                        >
                          <MoveHorizontal size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                          {chip.text}
                        </div>
                      );
                    })}
                    {availableChips.length === 0 && (
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        (Đã xếp hết các thẻ vào các vị trí)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Danh sách các vị trí đích (targets) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {currentQ.ddTargets.map((target, idx) => {
                  const isGraded = Boolean(existingAnswer);
                  const matchedChipIds = ddMatches[target.id] || [];
                  const isTargetCorrect = isGraded && (
                    matchedChipIds.length === target.correctItemIds.length &&
                    matchedChipIds.every((id) => target.correctItemIds.includes(id))
                  );

                  return (
                    <div
                      key={target.id}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const chipId = e.dataTransfer.getData('text/plain');
                        if (chipId) handlePlaceChipOnTarget(chipId, target.id);
                      }}
                      onClick={() => {
                        if (selectedChipId) {
                          handlePlaceChipOnTarget(selectedChipId, target.id);
                        }
                      }}
                      style={{
                        padding: '1.1rem 1.25rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-secondary)',
                        border: isGraded ? (isTargetCorrect ? '1.5px solid var(--success-border)' : '1.5px solid var(--error-border)') : (selectedChipId ? '1.5px dashed var(--primary)' : '1px solid var(--border-subtle)'),
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 800, color: 'var(--primary)', flexShrink: 0 }}>
                          Vị trí {idx + 1}:
                        </span>
                        <span style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--text-primary)', flex: 1 }}>
                          {target.prompt}
                        </span>
                      </div>

                      {/* Drop Zone Box */}
                      <div style={{
                        minHeight: '44px',
                        padding: '0.4rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-tertiary)',
                        border: '1px dashed var(--border-strong)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '0.45rem'
                      }}>
                        {matchedChipIds.map((chipId) => {
                          const chip = (currentQ.ddItems || []).find((c) => c.id === chipId);
                          if (!chip) return null;
                          return (
                            <span
                              key={chip.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.35rem 0.75rem',
                                borderRadius: 'var(--radius-full)',
                                background: isGraded ? (target.correctItemIds.includes(chip.id) ? 'var(--success-bg)' : 'var(--error-bg)') : 'var(--bg-secondary)',
                                color: isGraded ? (target.correctItemIds.includes(chip.id) ? 'var(--success-text)' : 'var(--error-text)') : 'var(--primary)',
                                border: '1px solid var(--border-strong)',
                                fontWeight: 700,
                                fontSize: '0.82rem'
                              }}
                            >
                              <span>{chip.text}</span>
                              {!isGraded && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveChipFromTarget(chip.id, target.id);
                                  }}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <X size={13} />
                                </button>
                              )}
                            </span>
                          );
                        })}

                        {matchedChipIds.length === 0 && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            {selectedChipId ? '👉 Bấm vào đây để đặt thẻ đã chọn' : 'Thả hoặc bấm đặt đáp án vào đây...'}
                          </span>
                        )}
                      </div>

                      {isGraded && !isTargetCorrect && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--success)', fontWeight: 600 }}>
                          Đáp án đúng: {(target.correctItemIds || []).map((id) => (currentQ.ddItems || []).find((c) => c.id === id)?.text).filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Phản hồi tức thì & Lời động viên (Section 8) */}
          {existingAnswer && feedbackMessage && (
            <div
              className="animate-fade-in"
              style={{
                padding: '1.15rem 1.4rem',
                borderRadius: 'var(--radius-md)',
                background: (() => {
                  if (currentQ.type === 'multiple_choice') {
                    const corr = currentQ.correctOptionIds || [];
                    const sel = existingAnswer.selectedOptionIds || [];
                    const selCorr = sel.filter((id) => corr.includes(id));
                    const selWr = sel.filter((id) => !corr.includes(id));
                    const missing = corr.filter((id) => !sel.includes(id));
                    if (existingAnswer.isCorrect) return 'var(--success-bg)';
                    if (selCorr.length > 0 && selWr.length === 0 && missing.length > 0) return 'var(--warning-bg)';
                    return 'var(--error-bg)';
                  }
                  return existingAnswer.isCorrect ? 'var(--success-bg)' : 'var(--bg-tertiary)';
                })(),
                border: (() => {
                  if (currentQ.type === 'multiple_choice') {
                    const corr = currentQ.correctOptionIds || [];
                    const sel = existingAnswer.selectedOptionIds || [];
                    const selCorr = sel.filter((id) => corr.includes(id));
                    const selWr = sel.filter((id) => !corr.includes(id));
                    const missing = corr.filter((id) => !sel.includes(id));
                    if (existingAnswer.isCorrect) return '1px solid var(--success-border)';
                    if (selCorr.length > 0 && selWr.length === 0 && missing.length > 0) return '1px solid var(--warning-border)';
                    return '1px solid var(--error-border)';
                  }
                  return `1px solid ${existingAnswer.isCorrect ? 'var(--success-border)' : 'var(--border-subtle)'}`;
                })(),
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              {(() => {
                if (currentQ.type === 'multiple_choice') {
                  const corr = currentQ.correctOptionIds || [];
                  const sel = existingAnswer.selectedOptionIds || [];
                  const selCorr = sel.filter((id) => corr.includes(id));
                  const selWr = sel.filter((id) => !corr.includes(id));
                  const missing = corr.filter((id) => !sel.includes(id));
                  if (existingAnswer.isCorrect) {
                    return <Sparkles size={22} color="var(--success)" />;
                  }
                  if (selCorr.length > 0 && selWr.length === 0 && missing.length > 0) {
                    return <AlertCircle size={22} color="var(--warning)" />;
                  }
                  return <XCircle size={22} color="var(--error)" />;
                }
                return existingAnswer.isCorrect ? (
                  <Sparkles size={22} color="var(--success)" />
                ) : (
                  <HelpCircle size={22} color="var(--warning)" />
                );
              })()}
              <div style={{ flex: 1 }}>
                <p style={{
                  fontWeight: 700,
                  fontSize: '0.98rem',
                  color: (() => {
                    if (currentQ.type === 'multiple_choice') {
                      const corr = currentQ.correctOptionIds || [];
                      const sel = existingAnswer.selectedOptionIds || [];
                      const selCorr = sel.filter((id) => corr.includes(id));
                      const selWr = sel.filter((id) => !corr.includes(id));
                      const missing = corr.filter((id) => !sel.includes(id));
                      if (existingAnswer.isCorrect) return 'var(--success-text)';
                      if (selCorr.length > 0 && selWr.length === 0 && missing.length > 0) return 'var(--warning)';
                      return 'var(--error-text)';
                    }
                    return existingAnswer.isCorrect ? 'var(--success-text)' : 'var(--text-primary)';
                  })(),
                  margin: 0
                }}>
                  {feedbackMessage}
                </p>

                {currentQ.type === 'multiple_choice' ? (
                  (() => {
                    const corr = currentQ.correctOptionIds || [];
                    const sel = existingAnswer.selectedOptionIds || [];
                    const selCorr = sel.filter((id) => corr.includes(id));
                    const selWr = sel.filter((id) => !corr.includes(id));
                    const missing = corr.filter((id) => !sel.includes(id));

                    if (existingAnswer.isCorrect) {
                      return currentQ.explanation ? (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                          <strong>Lưu ý:</strong> {currentQ.explanation}
                        </p>
                      ) : null;
                    }

                    if (selCorr.length > 0 && selWr.length === 0 && missing.length > 0) {
                      return (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                          <span>
                            Bạn đã chọn đúng <strong>{selCorr.length}/{corr.length}</strong> đáp án ({selCorr.join(', ')}), nhưng vẫn còn thiếu đáp án đúng: <strong style={{ color: 'var(--success-text)' }}>{missing.join(', ')}</strong>.
                          </span>
                          {currentQ.explanation && (
                            <span style={{ display: 'block', marginTop: '0.25rem' }}>
                              <strong>Lưu ý:</strong> {currentQ.explanation}
                            </span>
                          )}
                        </div>
                      );
                    }

                    if (selCorr.length > 0 && selWr.length > 0) {
                      return (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                          <span>
                            Bạn đã chọn đáp án chưa chính xác: <strong style={{ color: 'var(--error-text)' }}>{selWr.join(', ')}</strong>. Toàn bộ đáp án đúng là: <strong style={{ color: 'var(--success-text)' }}>{corr.join(', ')}</strong>.
                          </span>
                          {currentQ.explanation && (
                            <span style={{ display: 'block', marginTop: '0.25rem' }}>
                              <strong>Lưu ý:</strong> {currentQ.explanation}
                            </span>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                        <span>
                          Đáp án chính xác theo giáo trình: <strong style={{ color: 'var(--success-text)' }}>{corr.join(', ')}</strong>.
                        </span>
                        {currentQ.explanation && (
                          <span style={{ display: 'block', marginTop: '0.25rem' }}>
                            <strong>Lưu ý:</strong> {currentQ.explanation}
                          </span>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  currentQ.explanation && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                      {currentQ.explanation}
                    </p>
                  )
                )}
              </div>
            </div>
          )}

          {/* Action Button: Nộp câu trả lời hoặc Chuyển tiếp */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="btn btn-ghost"
              style={{ padding: '0.65rem 1.15rem' }}
            >
              <ArrowLeft size={16} />
              <span>Câu trước</span>
            </button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {!existingAnswer ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!canSubmit()}
                  className="btn btn-primary"
                  style={{ padding: '0.75rem 1.75rem' }}
                >
                  <span>{isSubmitting ? 'Đang chấm...' : 'Xác nhận trả lời'}</span>
                  <CheckCircle2 size={16} />
                </button>
              ) : (
                currentIndex < questions.length - 1 ? (
                  <button
                    onClick={handleNext}
                    className="btn btn-primary"
                    style={{ padding: '0.75rem 1.75rem' }}
                  >
                    <span>Câu tiếp theo</span>
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowConfirmFinish(true)}
                    className="btn btn-primary"
                    style={{ padding: '0.75rem 1.75rem', background: 'var(--success)' }}
                  >
                    <span>Hoàn thành & Tổng kết</span>
                    <CheckCircle2 size={16} />
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Xác nhận nộp bài sớm */}
      {showConfirmFinish && (
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
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Nộp bài và kết thúc phiên?
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Bạn đã trả lời <strong>{answeredCount}</strong> / <strong>{questions.length}</strong> câu hỏi.
              {answeredCount < questions.length && (
                <span style={{ display: 'block', marginTop: '0.35rem', color: 'var(--warning)' }}>
                  (Các câu chưa trả lời sẽ không bị tính là sai, nhưng chưa được ghi nhận kết quả).
                </span>
              )}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setShowConfirmFinish(false);
                  onExitEarly();
                }}
                className="btn btn-ghost"
                style={{ color: 'var(--text-muted)' }}
              >
                Rời phòng thi
              </button>
              <button
                onClick={() => setShowConfirmFinish(false)}
                className="btn btn-secondary"
              >
                Tiếp tục làm
              </button>
              <button
                onClick={handleConfirmFinish}
                className="btn btn-primary"
              >
                Đồng ý nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
