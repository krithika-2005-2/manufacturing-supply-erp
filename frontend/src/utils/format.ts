export const formatDate = (value: string | undefined): string => {
  if (!value) {
    return '—'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10)
  }
  return date.toLocaleDateString()
}

export const formatMoney = (value: string | number | undefined): string => {
  const amount = Number(value ?? 0)
  if (!Number.isFinite(amount)) {
    return String(value ?? '—')
  }
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const formatQty = (value: string | number | undefined): string => {
  const amount = Number(value ?? 0)
  if (!Number.isFinite(amount)) {
    return String(value ?? '—')
  }
  return amount.toLocaleString(undefined, { maximumFractionDigits: 4 })
}

export const toDateInput = (value: string | undefined): string => {
  if (!value) {
    return ''
  }
  return value.slice(0, 10)
}

export const looksLikeEmail = (value: string): boolean => value.includes('@')
