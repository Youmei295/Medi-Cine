// Booking progress (brief §4): a real sequence, so numbering is meaningful.
const STEPS = ['Chọn suất', 'Chọn ghế', 'Xác nhận', 'Thanh toán'] as const

/*
 * The bar often sits over a dimmed movie still, so every step keeps full
 * `dust` (8.22:1 on house) or `screen`; a faded `dust/70` dropped to
 * 3.9–4.2:1 there (Impeccable, Phase 3). States are told apart by mark and
 * weight, not by opacity: done = check mark, current = bold `screen` + aria-current,
 * to do = plain number. Below 640 px only the current step shows its name
 * (the others keep it for screen readers), so the bar stays on one line.
 */
export default function BookingSteps({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <nav aria-label="Các bước đặt vé">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-dust sm:gap-x-3">
        {STEPS.map((label, index) => {
          const step = index + 1
          const state = step < current ? 'done' : step === current ? 'current' : 'todo'
          return (
            <li key={label} className="flex items-center gap-2 sm:gap-3">
              <span
                aria-current={state === 'current' ? 'step' : undefined}
                className={`inline-flex items-center gap-1.5 ${state === 'current' ? 'font-semibold text-screen' : ''}`}
              >
                {state === 'done' ? <CheckIcon /> : <span className="tabular">{step}</span>}
                <span className={state === 'current' ? undefined : 'sr-only sm:not-sr-only'}>{label}</span>
                {state === 'done' && <span className="sr-only"> (đã xong)</span>}
              </span>
              {step < STEPS.length && <span aria-hidden="true" className="h-px w-4 bg-seat-line sm:w-6" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5 shrink-0">
      <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
