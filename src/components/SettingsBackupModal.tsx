import React, { useState } from 'react';
import {
  Download,
  Upload,
  Volume2,
  VolumeX,
  Shuffle,
  CheckCircle2,
  AlertCircle,
  HardDrive
} from 'lucide-react';
import { UserSettings, BackupData } from '../types';
import { exportPersonalData, importPersonalData } from '../db';

interface SettingsBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onDataRestored: () => void;
}

export const SettingsBackupModal: React.FC<SettingsBackupModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onDataRestored
}) => {
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  // Xuất file JSON sao lưu
  const handleExport = async () => {
    try {
      const data = await exportPersonalData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `study-hub-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi khi xuất dữ liệu:', err);
    }
  };

  // Nhập file JSON sao lưu
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json: BackupData = JSON.parse(text);

      const result = await importPersonalData(json);
      if (result.success) {
        setImportStatus({ type: 'success', message: result.message });
        onDataRestored();
      } else {
        setImportStatus({ type: 'error', message: result.message });
      }
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        message: `Định dạng tệp JSON không hợp lệ: ${err.message || 'Lỗi đọc tệp'}`
      });
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.55)',
      backdropFilter: 'blur(5px)',
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
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Cài đặt & Sao lưu dữ liệu
          </h3>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem' }}>
            ✕
          </button>
        </div>

        {/* Thông báo kết quả nhập dữ liệu */}
        {importStatus && (
          <div style={{
            padding: '0.9rem 1.15rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            background: importStatus.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)',
            color: importStatus.type === 'success' ? 'var(--success-text)' : 'var(--error-text)',
            border: `1px solid ${importStatus.type === 'success' ? 'var(--success-border)' : 'var(--error-border)'}`,
            fontSize: '0.9rem'
          }}>
            {importStatus.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{importStatus.message}</span>
          </div>
        )}

        {/* Cài đặt trải nghiệm */}
        <section style={{ marginBottom: '1.75rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Trải nghiệm học tập
          </h4>

          {/* Toggle Âm thanh */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 0',
            borderBottom: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {settings.soundEnabled ? <Volume2 size={20} color="var(--primary)" /> : <VolumeX size={20} color="var(--text-muted)" />}
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.92rem', margin: 0 }}>Hiệu ứng âm thanh</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Âm thanh chúc mừng nhẹ nhàng khi trả lời đúng/sai</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) => onUpdateSettings({ ...settings, soundEnabled: e.target.checked })}
              style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer', accentColor: 'var(--primary)' }}
            />
          </div>

          {/* Toggle Xáo trộn phương án */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 0',
            borderBottom: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Shuffle size={20} color="var(--primary)" />
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.92rem', margin: 0 }}>Xáo trộn thứ tự đáp án</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Tránh học vẹt vị trí A, B, C, D</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.shuffleOptions}
              onChange={(e) => onUpdateSettings({ ...settings, shuffleOptions: e.target.checked })}
              style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer', accentColor: 'var(--primary)' }}
            />
          </div>
        </section>

        {/* Sao lưu và Khôi phục */}
        <section style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Sao lưu & Phục hồi dữ liệu
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            {/* Xuất dữ liệu */}
            <button
              onClick={handleExport}
              className="btn btn-secondary"
              style={{ justifyContent: 'center', padding: '0.75rem', fontSize: '0.88rem' }}
            >
              <Download size={16} />
              <span>Xuất JSON</span>
            </button>

            {/* Nhập dữ liệu */}
            <label
              className="btn btn-secondary"
              style={{ justifyContent: 'center', padding: '0.75rem', fontSize: '0.88rem', cursor: 'pointer' }}
            >
              <Upload size={16} />
              <span>Nhập JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {/* Lưu ý bảo mật & lưu trữ cục bộ */}
          <div style={{
            padding: '0.85rem 1rem',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              <HardDrive size={15} />
              <span>Lưu trữ cục bộ (IndexedDB)</span>
            </div>
            Tiến độ, điểm số và XP được lưu hoàn toàn trên trình duyệt của máy bạn. Ngân hàng câu hỏi gốc không bị ảnh hưởng khi xuất/nhập.
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-primary" style={{ padding: '0.65rem 1.4rem' }}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
