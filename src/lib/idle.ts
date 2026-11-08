type Cancelable = { cancel: () => void }

/**
 * Runs startup work in small, separate macrotasks during idle time.
 *
 * Local storage hydration (Dexie open, seeding, reads) is not needed for the
 * first paint, but doing it all in one idle callback still produces a single
 * long task on slow phones. Splitting the steps keeps every task short, which
 * keeps the page responsive while the library fills in.
 */
export function runIdleSteps(steps: Array<() => void>, timeoutMs = 600): Cancelable {
  let cancelled = false
  let idleId: number | undefined
  let timer: number | undefined

  const runStep = (index: number) => {
    if (cancelled || index >= steps.length) return
    try {
      steps[index]()
    } finally {
      timer = window.setTimeout(() => runStep(index + 1), 0)
    }
  }

  const start = () => {
    idleId = undefined
    runStep(0)
  }

  if (typeof window.requestIdleCallback === 'function') {
    idleId = window.requestIdleCallback(start, { timeout: timeoutMs })
  } else {
    timer = window.setTimeout(start, Math.min(timeoutMs, 200))
  }

  return {
    cancel: () => {
      cancelled = true
      if (idleId !== undefined) window.cancelIdleCallback(idleId)
      if (timer !== undefined) window.clearTimeout(timer)
    },
  }
}
