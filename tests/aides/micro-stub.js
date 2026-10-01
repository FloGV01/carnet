// Micro factice injecté avant le chargement de la page : getUserMedia rend un flux,
// MediaRecorder rend, à l'arrêt, un vrai WAV (silence) de la durée enregistrée.
// Sert à tester la logique de l'app ; la capture réelle se vérifie sur l'iPhone.
export async function installerMicroFactice(page) {
  await page.addInitScript(() => {
    const wav = (secondes) => {
      const freq = 8000; const n = Math.max(1, Math.round(freq * secondes));
      const buf = new ArrayBuffer(44 + n * 2); const v = new DataView(buf);
      const ecrire = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
      ecrire(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); ecrire(8, 'WAVE'); ecrire(12, 'fmt ');
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, freq, true);
      v.setUint32(28, freq * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); ecrire(36, 'data'); v.setUint32(40, n * 2, true);
      return new Blob([buf], { type: 'audio/wav' });
    };
    const piste = () => ({ kind: 'audio', readyState: 'live', stop() { this.readyState = 'ended'; } });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => { const p = piste(); return { getTracks: () => [p] }; } } });
    window.__micro = { refus: false };
    class MediaRecorderFactice {
      static isTypeSupported(t) { return t === 'audio/wav'; }
      constructor(flux, options) { this.flux = flux; this.options = options; this.state = 'inactive'; this.mimeType = 'audio/wav'; }
      start() { this.state = 'recording'; this.debut = performance.now(); }
      stop() {
        if (this.state === 'inactive') return;
        this.state = 'inactive';
        const s = (performance.now() - this.debut) / 1000;
        setTimeout(() => { this.ondataavailable && this.ondataavailable({ data: wav(s) }); this.onstop && this.onstop(); }, 0);
      }
    }
    window.MediaRecorder = MediaRecorderFactice;
  });
}
