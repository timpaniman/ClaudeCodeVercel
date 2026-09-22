// PWA 아이콘(public/icons/*.png)을 만든다. 외부 이미지 라이브러리 없이 도형("AI" 글자)을 직접 그려 PNG 로 저장한다.
// 결과 파일은 저장소에 포함되므로 평소에는 실행할 필요가 없다. 색·모양을 바꿀 때만:  node scripts/generate-pwa-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BG = [0x22, 0xc5, 0x5e] // #22c55e (brand)
const FG = [255, 255, 255]
const SS = 4 // 한 픽셀을 SS×SS 로 나눠 표본을 잡아 가장자리를 부드럽게 한다

// 글자 획: [x1,y1,x2,y2] (0~1 단위), 선 굵기 T, 끝은 둥글게
const T = 0.085
const STROKES = [
  [0.2, 0.72, 0.36, 0.28], // A 왼쪽 다리
  [0.36, 0.28, 0.52, 0.72], // A 오른쪽 다리
  [0.26, 0.58, 0.46, 0.58], // A 가로 획
  [0.66, 0.28, 0.66, 0.72], // I
]
const OFFSET_X = 0.03 // 글자 덩어리(0.20~0.74)를 가운데(0.5)로

const distToSegment = (px, py, [x1, y1, x2, y2]) => {
  const dx = x2 - x1, dy = y2 - y1
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

function inRoundedRect(x, y, r) {
  if (r === 0) return true
  const cx = Math.min(Math.max(x, r), 1 - r), cy = Math.min(Math.max(y, r), 1 - r)
  return Math.hypot(x - cx, y - cy) <= r
}

function render(size, { maskable }) {
  const radius = maskable ? 0 : 0.22
  const scale = maskable ? 0.8 : 1 // maskable 은 안전 영역(가운데 80%) 안에 글자를 둔다
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      let inside = 0, glyph = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size, v = (y + (sy + 0.5) / SS) / size
          if (!inRoundedRect(u, v, radius)) continue
          inside++
          // 글자 좌표로 역변환 (가운데 기준 확대/축소)
          const gx = (u - 0.5) / scale + 0.5 - OFFSET_X, gy = (v - 0.5) / scale + 0.5
          if (STROKES.some((s) => distToSegment(gx, gy, s) <= T / 2)) glyph++
        }
      }
      const n = SS * SS
      const o = y * (size * 4 + 1) + 1 + x * 4
      const g = inside ? glyph / inside : 0
      raw[o] = Math.round(BG[0] + (FG[0] - BG[0]) * g)
      raw[o + 1] = Math.round(BG[1] + (FG[1] - BG[1]) * g)
      raw[o + 2] = Math.round(BG[2] + (FG[2] - BG[2]) * g)
      raw[o + 3] = Math.round((inside / n) * 255)
    }
  }
  return raw
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function png(size, opts) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // 비트 깊이
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(render(size, opts), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const OUT = new URL('../public/icons/', import.meta.url)
mkdirSync(OUT, { recursive: true })
const FILES = [
  ['icon-192.png', 192, { maskable: false }],
  ['icon-512.png', 512, { maskable: false }],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['apple-touch-icon.png', 180, { maskable: true }], // iOS 는 모서리를 스스로 둥글게 자르므로 꽉 찬 배경을 쓴다
]
for (const [name, size, opts] of FILES) {
  writeFileSync(new URL(name, OUT), png(size, opts))
  console.log('생성:', 'public/icons/' + name)
}
