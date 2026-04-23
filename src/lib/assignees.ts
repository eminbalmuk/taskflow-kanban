export function normalizeAssignees(value: unknown): string[] {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : []

  const seen = new Set<string>()
  const normalized: string[] = []

  for (const item of values) {
    if (typeof item !== 'string') continue

    const name = item.trim()
    if (!name) continue

    const key = name.toLocaleLowerCase('tr-TR')
    if (seen.has(key)) continue

    seen.add(key)
    normalized.push(name)
  }

  return normalized
}

export function appendAssignee(existing: string[], value: string): string[] {
  return normalizeAssignees([...existing, value])
}
