import { useEffect } from 'react'
import BackupPanel, { type BackupData } from './BackupPanel'
import { CloseIcon, DeviceIcon, GearIcon, MoonIcon, SunIcon } from './Icons'
import type { Loan, ReserveMovement, ThemePreference, Transaction } from './types'

interface SettingsPanelProps {
  theme: ThemePreference
  onThemeChange: (theme: ThemePreference) => void
  transactions: Transaction[]
  reserveMovements: ReserveMovement[]
  loans: Loan[]
  onImportBackup: (data: BackupData) => void
  onClose: () => void
}

const themeOptions: Array<{ value: ThemePreference, label: string, description: string, icon: typeof SunIcon }> = [
  { value: 'system', label: 'Automático', description: 'Sigue el iPhone', icon: DeviceIcon },
  { value: 'light', label: 'Claro', description: 'Blanco y azul', icon: SunIcon },
  { value: 'dark', label: 'Oscuro', description: 'Cómodo de noche', icon: MoonIcon },
]

export default function SettingsPanel({ theme, onThemeChange, transactions, reserveMovements, loans, onImportBackup, onClose }: SettingsPanelProps) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

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

        <div className="settings-section settings-backup-section">
          <div className="settings-section-heading"><strong>Tus datos</strong><span>Una copia adicional que solo controlas tú.</span></div>
          <BackupPanel transactions={transactions} reserveMovements={reserveMovements} loans={loans} onImport={onImportBackup} />
        </div>
      </section>
    </div>
  )
}
