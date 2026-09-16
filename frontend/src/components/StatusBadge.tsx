type StatusBadgeProps = {
  status: string
}

const TONE: Record<string, string> = {
  NEW: 'neutral',
  DRAFT: 'neutral',
  PENDING: 'warn',
  QUOTED: 'info',
  SENT: 'info',
  ACCEPTED: 'ok',
  WON: 'ok',
  CONFIRMED: 'ok',
  DISPATCHED: 'ok',
  REJECTED: 'bad',
  LOST: 'bad',
  CANCELLED: 'bad',
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const tone = TONE[status] ?? 'neutral'
  return <span className={`badge badge-${tone}`}>{status}</span>
}
