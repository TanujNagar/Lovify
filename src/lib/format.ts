export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const rounded = Math.floor(seconds)
  const minutes = Math.floor(rounded / 60)
  const rest = rounded % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

export function totalDuration(trackDurations: number[]): string {
  const minutes = Math.round(trackDurations.reduce((sum, value) => sum + value, 0) / 60)
  return `${minutes} min`
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
