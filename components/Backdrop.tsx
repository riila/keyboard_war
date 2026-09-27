'use client';

import { useEffect, useRef } from 'react';

/** Layered jungle canopy, drifting fog and floating spores. Pure decoration. */
export default function Backdrop() {
  const spores = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = spores.current;
    if (!host || host.childElementCount) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 26; i++) {
      const d = document.createElement('div');
      d.className = 'spore';
      d.style.left = Math.random() * 100 + '%';
      d.style.bottom = '-4vh';
      d.style.setProperty('--dx', Math.random() * 90 - 45 + 'px');
      d.style.animationDuration = 16 + Math.random() * 22 + 's';
      d.style.animationDelay = -Math.random() * 30 + 's';
      d.style.opacity = String(0.3 + Math.random() * 0.5);
      const sc = 0.6 + Math.random() * 1.1;
      d.style.width = d.style.height = (3 * sc).toFixed(1) + 'px';
      frag.appendChild(d);
    }
    host.appendChild(frag);
  }, []);

  return (
    <div className="backdrop" aria-hidden="true">
      <div className="bg-base" />
      <div className="fog" />
      <div className="fog b" />
      <div className="canopy">
        <svg className="tl" viewBox="0 0 400 300">
          <g fill="#03100c">
            <path d="M0 0 C70 10 120 46 152 104 C170 138 176 176 168 214 C150 176 128 150 96 132 C124 176 132 216 122 258 C100 212 74 182 40 164 C60 200 66 232 60 266 C36 214 12 178 -20 156 Z" />
            <path d="M0 40 C58 56 100 92 124 142 C96 120 66 108 34 106 C60 132 74 158 78 188 C50 152 24 132 -10 124 Z" opacity=".75" />
          </g>
          <g stroke="#0d3a2c" strokeWidth="2" fill="none" opacity=".7">
            <path d="M0 6 C74 18 126 58 156 118" />
            <path d="M0 46 C60 62 104 100 128 150" />
          </g>
        </svg>
        <svg className="tr" viewBox="0 0 400 300">
          <g fill="#03100c">
            <path d="M0 0 C88 6 150 44 186 116 C204 152 208 192 198 230 C176 188 150 160 114 142 C144 190 150 232 138 274 C114 226 86 194 48 176 C70 214 76 246 70 278 C44 224 18 188 -16 166 Z" />
          </g>
          <g stroke="#0d3a2c" strokeWidth="2" fill="none" opacity=".6">
            <path d="M0 4 C90 16 150 60 186 128" />
          </g>
        </svg>
        <svg className="bl" viewBox="0 0 400 300">
          <g fill="#02100b">
            <path d="M0 0 C80 14 136 54 168 118 C184 150 188 186 180 220 C160 180 136 154 102 136 C130 182 136 222 126 262 C102 216 76 186 40 168 C60 204 66 236 60 268 C34 216 10 180 -22 158 Z" />
          </g>
        </svg>
        <svg className="br" viewBox="0 0 400 300">
          <g fill="#02100b">
            <path d="M0 0 C76 12 130 52 160 112 C176 144 180 180 172 214 C152 174 128 150 96 132 C122 178 128 216 118 254 C96 210 70 182 36 164 C56 200 62 230 56 262 C32 212 8 178 -24 156 Z" />
          </g>
        </svg>
      </div>
      <div className="spores" ref={spores} />
      <div className="vignette" />
    </div>
  );
}

export function Crest() {
  return (
    <div className="crest">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="gCrest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fdf3d9" />
            <stop offset=".55" stopColor="#c9a763" />
            <stop offset="1" stopColor="#6f5828" />
          </linearGradient>
        </defs>
        <path d="M50 4 92 26 92 70 50 96 8 70 8 26Z" fill="#07160f" stroke="url(#gCrest)" strokeWidth="2" />
        <path d="M50 12 84 30 84 66 50 88 16 66 16 30Z" fill="none" stroke="#7e6634" strokeWidth=".8" />
        <path d="M50 24 L50 74" stroke="url(#gCrest)" strokeWidth="4" strokeLinecap="round" />
        <path d="M34 40 L50 26 L66 40" stroke="url(#gCrest)" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path d="M36 62 L64 62" stroke="url(#gCrest)" strokeWidth="3.4" strokeLinecap="round" />
        <circle cx="50" cy="50" r="11" fill="none" stroke="#35e0a6" strokeWidth="1.4" opacity=".75" />
      </svg>
    </div>
  );
}
