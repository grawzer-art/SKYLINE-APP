/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Génère les visuels PLACEHOLDER (SVG → JPG) dans public/images.
 * À remplacer par de vraies photographies : gardez simplement les mêmes noms
 * de fichiers, ou changez les chemins dans src/data/demo.ts.
 * Usage : node scripts/generate-images.cjs
 */
const { chromium } = require("playwright");
const path = require("path");

const clouds = (id, seed, freq, color, op, y0, y1, contrast = 2.2) => `
<filter id="${id}" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="5" seed="${seed}"/>
  <feColorMatrix type="matrix" values="0 0 0 0 ${color[0]}  0 0 0 0 ${color[1]}  0 0 0 0 ${color[2]}  0 0 0 ${contrast} -${contrast * 0.62}"/>
</filter>
<mask id="m${id}"><linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1">
  <stop offset="${y0}" stop-color="#000"/><stop offset="${y1}" stop-color="#fff"/></linearGradient>
  <rect width="100%" height="100%" fill="url(#g${id})"/></mask>
<rect width="100%" height="100%" filter="url(#${id})" opacity="${op}" mask="url(#m${id})"/>`;

const grad = (stops) => `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">${stops
  .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</linearGradient>`;

const scenes = {
  // PLACEHOLDERS PHOTO — volontairement sans silhouette, sans avion, sans personnage.
  hero: { w: 1170, h: 1400, svg: (w, h) => `
    <defs>${grad([[0, "#0b1a33"], [0.25, "#1f4a8c"], [0.48, "#6f9fe0"], [0.62, "#bcd3f3"], [0.7, "#f4d9c0"], [1, "#f0b98e"]])}
    <radialGradient id="sun" cx="0.72" cy="0.64" r="0.42"><stop offset="0" stop-color="#fff3dc" stop-opacity=".95"/><stop offset=".4" stop-color="#ffd2a0" stop-opacity=".45"/><stop offset="1" stop-color="#ffd2a0" stop-opacity="0"/></radialGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/><rect width="${w}" height="${h}" fill="url(#sun)"/>
    ${clouds("a", 3, "0.0022 0.010", [0.9, 0.93, 1], 0.55, 0.4, 0.75, 2.8)}
    <g transform="translate(0 14)">${clouds("s1", 17, "0.004 0.013", [0.34, 0.44, 0.66], 0.85, 0.58, 0.82, 3.2)}</g>
    ${clouds("b", 17, "0.004 0.013", [1, 0.96, 0.92], 0.95, 0.58, 0.82, 3.2)}
    <g transform="translate(0 18)">${clouds("s2", 29, "0.007 0.02", [0.4, 0.46, 0.62], 0.9, 0.74, 0.95, 3.4)}</g>
    ${clouds("c", 29, "0.007 0.02", [1, 0.97, 0.94], 1, 0.74, 0.95, 3.4)}` },
  experience: { w: 1200, h: 750, svg: (w, h) => `
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#070b14"/><stop offset=".55" stop-color="#101c3a"/><stop offset="1" stop-color="#2a1c2c"/></linearGradient>
    <filter id="bl"><feGaussianBlur stdDeviation="22"/></filter><filter id="bl2"><feGaussianBlur stdDeviation="6"/></filter></defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    <g filter="url(#bl)">${[[180,200,120,"#8fb8ff",.55],[420,120,90,"#ff7a45",.45],[700,260,150,"#8fb8ff",.4],[960,150,110,"#ff7a45",.5],[1080,420,130,"#8fb8ff",.35],[300,430,100,"#ff7a45",.3]].map(([x,y,r,c,o])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="${o}"/>`).join("")}</g>
    <g filter="url(#bl2)">${[...Array(46)].map((_, i) => { const r = (n) => Math.abs((Math.sin(i * 77.7 + n * 13.1) * 10000) % 1); return `<circle cx="${r(1) * w}" cy="${r(2) * h * 0.8}" r="${3 + r(3) * 9}" fill="${r(4) > .5 ? "#c9dcff" : "#ffb089"}" opacity="${0.25 + r(5) * 0.5}"/>`; }).join("")}</g>` },
  sunset: { w: 1200, h: 900, svg: (w, h) => `
    <defs>${grad([[0, "#0e1830"], [0.4, "#6a4a7a"], [0.62, "#ff7a45"], [0.64, "#ffb27a"], [0.641, "#17314f"], [1, "#07101c"]])}
    <radialGradient id="sun" cx="0.5" cy="0.62" r="0.3"><stop offset="0" stop-color="#fff0d0"/><stop offset=".2" stop-color="#ffd2a0" stop-opacity=".9"/><stop offset="1" stop-color="#ff7a45" stop-opacity="0"/></radialGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    ${clouds("a", 8, "0.004 0.016", [1, 0.62, 0.5], 0.7, 0.05, 0.62)}
    <rect width="${w}" height="${h}" fill="url(#sun)" opacity=".9"/>
    ${[...Array(26)].map((_, i) => `<rect x="${w / 2 - 20 - i * 12}" y="${h * 0.65 + i * 9}" width="${40 + i * 24}" height="3" fill="#ffd2a0" opacity="${0.7 - i * 0.025}"/>`).join("")}` },
  day: { w: 1200, h: 900, svg: (w, h) => `
    <defs>${grad([[0, "#2f6fd6"], [0.55, "#8fb8ff"], [1, "#d9e8ff"]])}</defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    ${clouds("a", 2, "0.004 0.01", [1, 1, 1], 0.6, 0.1, 0.8)}${clouds("b", 14, "0.007 0.016", [1, 1, 1], 0.95, 0.45, 1, 2.8)}` },
  night: { w: 1200, h: 900, svg: (w, h) => `
    <defs>${grad([[0, "#03050a"], [0.6, "#0b1730"], [1, "#2a3f6b"]])}</defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    ${[...Array(140)].map((_, i) => { const r = (n) => (Math.sin(i * 999 + n) * 10000) % 1; return `<circle cx="${Math.abs(r(1)) * w}" cy="${Math.abs(r(2)) * h * 0.75}" r="${0.6 + Math.abs(r(3)) * 1.6}" fill="#f5f5f3" opacity="${0.3 + Math.abs(r(4)) * 0.7}"/>`; }).join("")}
    ${clouds("a", 31, "0.004 0.012", [0.45, 0.55, 0.8], 0.55, 0.5, 1)}` },
};

(async () => {
  const browser = await chromium.launch();
  for (const [name, { w, h, svg }] of Object.entries(scenes)) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.setContent(`<body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${svg(w, h)}</svg></body>`);
    await page.screenshot({ path: path.join(__dirname, "../public/images", `${name}.jpg`), type: "jpeg", quality: 82 });
    await page.close();
    console.log("✓", name);
  }
  // Icônes PWA
  for (const s of [192, 512]) {
    const page = await browser.newPage({ viewport: { width: s, height: s } });
    await page.setContent(`<body style="margin:0;background:#080A0D;display:grid;place-items:center;height:100vh"><svg width="${s * 0.6}" viewBox="0 0 24 24" fill="none" stroke="#F5F5F3" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" stroke="#FF7A45"/></svg></body>`);
    await page.screenshot({ path: path.join(__dirname, "../public", `icon-${s}.png`) });
    await page.close();
  }
  await browser.close();
})();
