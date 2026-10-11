/**
 * Service phát âm thanh nhẹ nhàng sử dụng Web Audio API tích hợp sẵn của trình duyệt.
 * Không cần tải file âm thanh ngoài, hoạt động mượt mà và offline 100%.
 */

class SoundService {
  private ctx: AudioContext | null = null;
  private enabled = true;

  constructor() {
    // AudioContext sẽ được khởi tạo khi có thao tác người dùng đầu tiên
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Âm thanh chúc mừng nhẹ nhàng khi trả lời đúng (chime ngân vang tích cực)
   */
  public playCorrect() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // Nốt E5 -> G#5 -> B5 (hợp âm trưởng tích cực)
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(830.61, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.16);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {
      // Audio playback non-critical
    }
  }

  /**
   * Âm thanh êm dịu nhắc nhở khi trả lời sai (không gây tiêu cực hay giật mình)
   */
  public playIncorrect() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.exponentialRampToValueAtTime(293.66, now + 0.15); // D4

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      // Ignored
    }
  }

  /**
   * Âm thanh khi hoàn thành phiên học hoặc nhận huy hiệu (fanfare ngọt ngào)
   */
  public playComplete() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const now = this.ctx!.currentTime + idx * 0.1;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now);
        osc.stop(now + 0.4);
      });
    } catch (e) {
      // Ignored
    }
  }
}

export const soundService = new SoundService();
