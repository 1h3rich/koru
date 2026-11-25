import { useEffect, useState, type FormEvent } from 'react'
import BackupPanel, { type BackupData } from './BackupPanel'
import DecimalInput from './DecimalInput'
import { CheckIcon, CloseIcon, DeviceIcon, GearIcon, MoonIcon, SunIcon, WalletIcon } from './Icons'
import type { FixedExpense, FutureSavingsPlan, Loan, MonthlyBudget, ReserveMovement, ThemePreference, Transaction } from './types'

interface SettingsPanelProps {
  theme: ThemePreference
  onThemeChange: (theme: ThemePreference) => void
  currentBalance: number
  onAdjustBalance: (balance: number) => boolean | void
  transactions: Transaction[]
  reserveMovements: ReserveMovement[]
  loans: Loan[]
  fixedExpenses: FixedExpense[]
  monthlyBudget: MonthlyBudget
  futureSavings: FutureSavingsPlan | null
  onImportBackup: (data: BackupData) => void
  onClose: () => void
}

const themeOptions: Array<{ value: ThemePreference, label: string, description: string, icon: typeof SunIcon }> = [
  { value: 'system', label: 'Automático', description: 'Sigue el iPhone', icon: DeviceIcon },
  { value: 'light', label: 'Claro', description: 'Blanco y azul', icon: SunIcon },
  { value: 'dark', label: 'Oscuro', description: 'Cómodo de noche', icon: MoonIcon },
]

const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })

export default function SettingsPanel({ theme, onThemeChange, currentBalance, onAdjustBalance, transactions, reserveMovements, loans, fixedExpenses, monthlyBudget, futureSavings, onImportBackup, onClose }: SettingsPanelProps) {
  const [targetBalance, setTargetBalance] = useState(currentBalance)
  const [balanceNotice, setBalanceNotice] = useState('')
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  function submitBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBalanceNotice('')
    if (onAdjustBalance(targetBalance) === false) return
    setBalanceNotice(`Koru queda en ${currency.format(targetBalance)}. El ajuste aparece en Movimientos y puedes editarlo o borrarlo.`)
  }

  return (
    <div className="settings-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="settings-sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="settings-heading">
          <div className="settings-title-icon"><GearIcon /></div>
          <div><span>Preferencias</span><h2 id="settings-title">Ajustes</h2></div>
          <button type="button" onClick={onClose} aria-label="Cerrar ajustes"><CloseIcon /></button>
        </header>

        <div className="settings-section">
          <div className="settings-section-heading"><strong>Tema</strong><span>El cambio se guarda en este dispositivo.</span></div>
          <div className="theme-options" role="radiogroup" aria-label="Tema de la aplicación">
            {themeOptions.map((option) => {
              const Icon = option.icon
              return (
                <button type="button" key={option.value} className={theme === option.value ? 'active' : ''} onClick={() => onThemeChange(option.value)} role="radio" aria-checked={theme === option.value}>
                  <span><Icon /></span><strong>{option.label}</strong><small>{option.description}</small><i />
                </button>
              )
            })}
          </div>
        </div>

        <div className="settings-section balance-settings-section">
          <div className="settings-section-heading"><strong>Ajustar saldo disponible</strong><span>Iguala el saldo con lo que tienes ahora.</span></div>
          <form className="balance-adjustment-card" onSubmit={submitBalance}>
            <div className="balance-adjustment-current"><span><WalletIcon /></span><div><small>Ahora en Koru</small><strong className={currentBalance < 0 ? 'negative' : ''}>{currency.format(currentBalance)}</strong></div></div>
            <label htmlFor="target-balance">Lo que tienes realmente ahora</label>
            <div className="amount-input balance-adjustment-input"><span>€</span><DecimalInput id="target-balance" value={targetBalance} onValueChange={setTargetBalance} min={-1_000_000_000} max={1_000_000_000} required /></div>
            <p>Koru añadirá únicamente la diferencia como «Saldo anterior». No borrará ni cambiará ningún movimiento.</p>
            <button type="submit" className="primary-button"><CheckIcon /> Igualar saldo</button>
            {balanceNotice && <div className="balance-adjustment-notice" role="status">{balanceNotice}</div>}
          </form>
        </div>

        <div className="settings-section settings-backup-section">
          <div className="settings-section-heading"><strong>Tus datos</strong><span>Una copia adicional que solo controlas tú.</span></div>
          <BackupPanel transactions={transactions} reserveMovements={reserveMovements} loans={loans} fixedExpenses={fixedExpenses} monthlyBudget={monthlyBudget} futureSavings={futureSavings} onImport={onImportBackup} />
        </div>
      </section>
    </div>
  )
}
