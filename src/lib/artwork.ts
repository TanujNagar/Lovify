const palettes = [
  ['#f95773', '#87233f', '#0e0e11'],
  ['#ffb2b9', '#e26a82', '#1f1f22'],
  ['#ff9cae', '#87233f', '#131316'],
  ['#e26a82', '#594042', '#0e0e11'],
  ['#ffd9dd', '#b42244', '#1b1b1e'],
  ['#8f3049', '#2a2a2d', '#0e0e11'],
  ['#ffb2bf', '#5b001a', '#131316'],
  ['#c75b78', '#39393c', '#0e0e11'],
]

function hash(value: string): number {
  let result = 0
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) | 0
  }
  return Math.abs(result)
}

export function artworkStyle(seed: string, id = 'art'): {
  backgroundImage: string
  backgroundColor: string
} {
  const palette = palettes[hash(seed) % palettes.length]
  const angle = 115 + (hash(`${seed}-angle`) % 80)
  const x = 16 + (hash(`${seed}-x`) % 48)
  const y = 18 + (hash(`${seed}-y`) % 46)

  return {
    backgroundColor: palette[2],
    backgroundImage: [
      `radial-gradient(ellipse at ${x}% ${y}%, ${palette[0]} 0%, transparent 54%)`,
      `radial-gradient(ellipse at ${100 - x}% ${100 - y}%, ${palette[1]} 0%, transparent 62%)`,
      `linear-gradient(${angle}deg, ${palette[1]} 0%, ${palette[2]} 100%)`,
      `url("data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='${id}'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='160' height='160' filter='url(#${id})' opacity='0.18'/></svg>`,
      )}")`,
    ].join(', '),
  }
}

export function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
