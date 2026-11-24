import { useState, type InputHTMLAttributes } from 'react'
import { parseMoneyInput } from './money'

interface DecimalInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'type' | 'inputMode' | 'pattern'> {
  value: number
  onValueChange: (value: number, text: string) => void
}

function numericValue(text: string): number {
  const value = parseMoneyInput(text)
  return Number.isFinite(value) ? value : 0
}

export default function DecimalInput({ value, onValueChange, ...props }: DecimalInputProps) {
  const [draft, setDraft] = useState(() => ({ source: value, text: String(value).replace('.', ',') }))

  // Keep intermediate text ("12,", "0.0", or "") while the parent stores a
  // number. Still reflect external changes such as "Usar esta suma".
  if (draft.source !== value) {
    setDraft({
      source: value,
      text: numericValue(draft.text) === value ? draft.text : String(value).replace('.', ','),
    })
  }

  return <input
    {...props}
    type="text"
    inputMode="text"
    value={draft.text}
    onChange={(event) => {
      const text = event.target.value
      const number = numericValue(text)
      const outsideRange = props.min !== undefined && number < Number(props.min)
        || props.max !== undefined && number > Number(props.max)
      event.target.setCustomValidity(outsideRange ? 'Importe fuera de rango.' : '')
      setDraft({ source: value, text })
      onValueChange(number, text)
    }}
  />
}
