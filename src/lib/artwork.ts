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

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

function darkenRgb(r: number, g: number, b: number, factor = 0.3): [number, number, number] {
  return [
    Math.round(r * factor),
    Math.round(g * factor),
    Math.round(b * factor),
  ]
}

/**
 * Extracts dominant colors from an image URL using a canvas.
 * Returns a palette of [primary, secondary, background] hex colors.
 * Falls back to generated palette if extraction fails.
 */
export async function extractArtworkPalette(
  imageUrl: string,
  seed: string,
): Promise<[string, string, string]> {
  if (typeof window === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    return generatedPalette(seed)
  }

  try {
    const response = await fetch(imageUrl, { mode: 'cors' })
    if (!response.ok) throw new Error('Failed to fetch')
    const blob = await response.blob()
    const bitmap = await createImageBitmap(blob)

    const canvas = new OffscreenCanvas(64, 64)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('No 2d context')

    ctx.drawImage(bitmap, 0, 0, 64, 64)
    const { data } = ctx.getImageData(0, 0, 64, 64)

    // Simple color quantization: bucket colors and find most frequent
    const buckets = new Map<string, number>()
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      if (a < 128) continue // Skip transparent
      // Quantize to 32 levels per channel
      const qr = Math.round(r / 8) * 8
      const qg = Math.round(g / 8) * 8
      const qb = Math.round(b / 8) * 8
      const key = `${qr},${qg},${qb}`
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }

    if (buckets.size === 0) throw new Error('No opaque pixels')

    // Sort by frequency
    const sorted = Array.from(buckets.entries()).sort((a, b) => b[1] - a[1])
    const dominant = sorted[0][0].split(',').map(Number) as [number, number, number]

    const primary = rgbToHex(...dominant)
    const secondary = rgbToHex(...darkenRgb(...dominant, 0.5))
    const background = rgbToHex(...darkenRgb(...dominant, 0.15))

    return [primary, secondary, background]
  } catch {
    return generatedPalette(seed)
  }
}

function generatedPalette(seed: string): [string, string, string] {
  const palette = palettes[hash(seed) % palettes.length]
  return [palette[0], palette[1], palette[2]]
}

const styleCache = new Map<string, { backgroundImage: string; backgroundColor: string }>()

/**
 * Soft generated cover used while provider artwork is missing or loading.
 *
 * Only gradients are used: the old SVG turbulence grain looked nice but every
 * card rasterised a fractal-noise filter, which is very expensive on phones.
 */
export function artworkStyle(seed: string): {
  backgroundImage: string
  backgroundColor: string
} {
  const cached = styleCache.get(seed)
  if (cached) return cached

  const [primary, secondary, background] = generatedPalette(seed)
  const angle = 115 + (hash(`${seed}-angle`) % 80)
  const x = 16 + (hash(`${seed}-x`) % 48)
  const y = 18 + (hash(`${seed}-y`) % 46)

  const style = {
    backgroundColor: background,
    backgroundImage: [
      `radial-gradient(ellipse at ${x}% ${y}%, ${primary} 0%, transparent 54%)`,
      `radial-gradient(ellipse at ${100 - x}% ${100 - y}%, ${secondary} 0%, transparent 62%)`,
      `linear-gradient(${angle}deg, ${secondary} 0%, ${background} 100%)`,
    ].join(', '),
  }

  if (styleCache.size > 400) styleCache.clear()
  styleCache.set(seed, style)
  return style
}

/**
 * Generates a CSS gradient string for the full-screen player background
 * based on the artwork palette.
 */
export function generatePlayerBackground(
  palette: [string, string, string],
): string {
  const [primary, secondary, background] = palette
  return `
    radial-gradient(ellipse at 20% 10%, ${primary}33 0%, transparent 50%),
    radial-gradient(ellipse at 80% 90%, ${secondary}44 0%, transparent 55%),
    radial-gradient(ellipse at 50% 50%, ${background} 0%, ${background} 100%)
  `.trim()
}

/**
 * Some providers serve the same cover at several sizes selected by a path
 * segment (`/480x480.jpg`). Small rows only need a thumbnail, so swap the
 * segment instead of downloading a large image for a 40px tile.
 */
export function artworkAtWidth(src: string | undefined, cssWidth: number): string | undefined {
  if (!src) return undefined
  const target = cssWidth <= 120 ? '150x150' : cssWidth <= 400 ? '480x480' : '1000x1000'
  return src.replace(/\/(150x150|480x480|1000x1000)\.(jpg|jpeg|png|webp)/i, `/${target}.$2`)
}

export function initials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
