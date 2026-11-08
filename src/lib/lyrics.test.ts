import { describe, expect, it } from 'vitest'
import { activeLyricIndex, parseLrc } from '@/lib/lyrics'

describe('LRC parsing', () => {
  it('parses timestamps, hundredths and multiple stamps on one line', () => {
    const lines = parseLrc(
      [
        '[00:12.50]First light',
        '[00:15.00][01:30.250]Shared line',
        '[ar:Artist]',
        '[00:20]Last word',
      ].join('\n'),
    )

    expect(lines).toEqual([
      { time: 12.5, text: 'First light' },
      { time: 15, text: 'Shared line' },
      { time: 20, text: 'Last word' },
      { time: 90.25, text: 'Shared line' },
    ])
  })

  it('returns an empty list for plain text without timestamps', () => {
    expect(parseLrc('Just a line\nand another')).toEqual([])
  })
})

describe('active lyric index', () => {
  const lines = [
    { time: 0, text: 'Intro' },
    { time: 10, text: 'Verse' },
    { time: 25.5, text: 'Chorus' },
  ]

  it('returns -1 before the first line and handles empty lyrics', () => {
    expect(activeLyricIndex(lines, -3)).toBe(-1)
    expect(activeLyricIndex([], 12)).toBe(-1)
  })

  it('returns the last line whose timestamp has passed', () => {
    expect(activeLyricIndex(lines, 0)).toBe(0)
    expect(activeLyricIndex(lines, 9.9)).toBe(0)
    expect(activeLyricIndex(lines, 10)).toBe(1)
    expect(activeLyricIndex(lines, 25.5)).toBe(2)
    expect(activeLyricIndex(lines, 900)).toBe(2)
  })
})
