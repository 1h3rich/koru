import { useState } from 'react'
import { validMonth } from './monthlyBudget'

const monthFormat = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' })

interface Props {
  id: string
  value: string
  onChange: (month: string) => void
  allowEmpty?: boolean
}

export default function MonthPicker({ id, value, onChange, allowEmpty = false }: Props) {
  const [hasNativePicker] = useState(() => {
    const input = document.createElement('input')
    input.type = 'month'
    return input.type === 'month'
  })

  if (!hasNativePicker) {
    return <input
      key={value}
      id={id}
      className="month-picker-fallback"
      type="text"
      defaultValue={value}
      placeholder="AAAA-MM"
      onBlur={(event) => {
        const next = event.target.value.trim()
        if (validMonth(next) || (allowEmpty && !next)) onChange(next)
        else event.target.value = value
      }}
      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
    />
  }

  return (
    <div className="date-picker-shell month-picker">
      <span aria-hidden="true" className={value ? undefined : 'month-picker-placeholder'}>
        {value ? monthFormat.format(new Date(`${value}-01T00:00:00Z`)) : 'Seleccionar mes'}
      </span>
      <input id={id} type="month" min="1900-01" max="9998-12" value={value}
        onChange={(event) => {
          const next = event.target.value
          if (validMonth(next) || (allowEmpty && !next)) onChange(next)
        }}
        onClick={(event) => {
          try {
            event.currentTarget.showPicker?.()
          } catch {
            // The input can still be opened through the browser's native controls.
          }
        }}
      />
    </div>
  )
}
