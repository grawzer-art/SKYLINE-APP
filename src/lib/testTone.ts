/**
 * SIGNAL DE TEST du prototype — une simple tonalité générée dans le navigateur, JAMAIS un mix ni un contenu musical.
 * Sert uniquement à valider le comportement du lecteur (lecture, pause, position) en l'absence de média autorisé.
 */
let cached: string | undefined;

export function testToneUrl(seconds = 30): string {
  if (cached) return cached;
  const rate = 8000, n = rate * seconds;
  const buf = new ArrayBuffer(44 + n * 2); const v = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.sin((2 * Math.PI * 220 * i) / rate) * 2500), true); // faible volume
  cached = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
  return cached;
}
