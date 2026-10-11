import React from 'react';
import { BookOpen, History, Settings, Moon, Sun, Sparkles } from 'lucide-react';
import { UserStats } from '../types';

interface NavbarProps {
  currentTab: 'dashboard' | 'history';
  onSelectTab: (tab: 'dashboard' | 'history') => void;
  onOpenSettings: () => void;
  stats: UserStats | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
  stats,
  theme,
  onToggleTheme
}) => {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-card)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '4.25rem'
      }}>
        {/* Brand */}
        <div
          onClick={() => onSelectTab('dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <div style={{
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: '12px',
            background: 'var(--primary-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
          }}>
            <BookOpen size={20} />
          </div>
          <div>
            <h1 style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: 'var(--primary-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline'
            }}>
              Study Hub
            </h1>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500, margin: 0 }}>
              Ôn tập thông minh & tương tác
            </p>
          </div>
        </div>

        {/* Navigation Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* XP Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.75rem',
            background: 'var(--warning-bg)',
            color: 'var(--warning)',
            border: '1px solid var(--warning-border)',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.82rem',
            fontWeight: 700
          }} title="Tổng điểm kinh nghiệm (XP) đạt được từ các phiên ôn tập thực tế">
            <Sparkles size={14} />
            <span>{stats?.totalXp || 0} XP</span>
          </div>

          {/* Tab: Dashboard */}
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`btn ${currentTab === 'dashboard' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.88rem' }}
          >
            <BookOpen size={16} />
            <span className="nav-text">Ôn tập</span>
          </button>

          {/* Tab: History */}
          <button
            onClick={() => onSelectTab('history')}
            className={`btn ${currentTab === 'history' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.88rem' }}
          >
            <History size={16} />
            <span className="nav-text">Lịch sử</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="btn btn-ghost"
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)' }}
            aria-label="Chuyển đổi giao diện sáng/tối"
            title="Đổi giao diện sáng / tối"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Settings / Backup */}
          <button
            onClick={onOpenSettings}
            className="btn btn-ghost"
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)' }}
            aria-label="Cài đặt và sao lưu dữ liệu"
            title="Cài đặt & Sao lưu dữ liệu"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
