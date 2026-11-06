// Download and upload speeds over the last minutes, kept while the page is open, for the graph
// in the statistics. Each sync/maindata reply adds one sample.

export interface SpeedSample {
  time: number
  down: number
  up: number
}

// Ten minutes at one sample every two seconds.
export const HISTORY_LENGTH = 300

let samples: SpeedSample[] = []
const listeners = new Set<() => void>()

export function recordSpeeds(sample: SpeedSample) {
  samples = [...samples.slice(-(HISTORY_LENGTH - 1)), sample]
  listeners.forEach(listener => listener())
}

export const getSpeedHistory = () => samples

export function onSpeedHistory(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// A round top for the graph's scale: 1, 2, or 5 times a power of ten, at least the given value.
export function niceCeiling(value: number) {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 5, 10].find(multiple => multiple * power >= value) ?? 10
  return step * power
}
