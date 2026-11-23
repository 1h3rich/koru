import { useMemo, useState, type FormEvent } from 'react'
import { CryptoIcon, EditIcon, MinusIcon, PlusIcon, SavingsIcon, TrashIcon } from './Icons'
import { DEFAULT_CRYPTO_ASSET, getCryptoAllocation, getCryptoFees, getReserveTotals, normalizeCryptoAsset } from './finance'
import type { ReserveAction, ReserveMovement, ReserveType } from './types'

const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const dateFormatter = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' })
const suggestedCryptoAssets = ['USDT', 'BTC', 'ETH', 'SOL', 'XRP']

function getLocalDate() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = getLocalDate()

interface ReservesPanelProps {
  movements: ReserveMovement[]
  onAdd: (movement: ReserveMovement) => void
  onDelete: (id: string) => void
  onUpdate: (movement: ReserveMovement) => void
}

export default function ReservesPanel({ movements, onAdd, onDelete, onUpdate }: ReservesPanelProps) {
  const [reserve, setReserve] = useState<ReserveType>('savings')
  const [action, setAction] = useState<ReserveAction>('deposit')
  const [amount, setAmount] = useState('')
  const [fee, setFee] = useState('')
  const [cryptoAsset, setCryptoAsset] = useState(DEFAULT_CRYPTO_ASSET)
  const [cryptoSourceAsset, setCryptoSourceAsset] = useState(DEFAULT_CRYPTO_ASSET)
  const [description, setDescription] = useState('')
  const [movementDate, setMovementDate] = useState(today)
  const [editing, setEditing] = useState<ReserveMovement | null>(null)
  const [error, setError] = useState('')

  const totals = useMemo(() => getReserveTotals(movements), [movements])
  const cryptoAllocation = useMemo(() => getCryptoAllocation(movements), [movements])
  const cryptoFees = useMemo(() => getCryptoFees(movements), [movements])
  const cryptoAssetOptions = useMemo(() => Array.from(new Set([
    ...suggestedCryptoAssets,
    ...cryptoAllocation.map((allocation) => allocation.asset),
  ])), [cryptoAllocation])
  const fundedCryptoAssets = cryptoAllocation.map((allocation) => allocation.asset)
  const validationMovements = editing ? movements.filter((movement) => movement.id !== editing.id) : movements
  const validationTotals = getReserveTotals(validationMovements)
  const validationAllocation = getCryptoAllocation(validationMovements)

  function changeReserve(nextReserve: ReserveType) {
    setReserve(nextReserve)
    if (nextReserve === 'savings' && action === 'transfer') setAction('deposit')
    setError('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const numericAmount = Number(amount.replace(',', '.'))
    const numericFee = fee.trim() ? Number(fee.replace(',', '.')) : 0

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Introduce un importe mayor que cero.')
      return
    }
    if (!Number.isFinite(numericFee) || numericFee < 0) {
      setError('La comisión no puede ser negativa.')
      return
    }

    const destination = normalizeCryptoAsset(cryptoAsset)
    const source = normalizeCryptoAsset(cryptoSourceAsset)

    if (reserve === 'crypto' && !cryptoAsset.trim()) {
      setError('Indica el activo, por ejemplo USDT, BTC o ETH.')
      return
    }

    if (action === 'transfer') {
      if (source === destination) {
        setError('El origen y el destino deben ser distintos.')
        return
      }
      const sourceBalance = validationAllocation.find((allocation) => allocation.asset === source)?.balance ?? 0
      if (numericAmount + numericFee > sourceBalance) {
        setError(`En ${source} tienes ${currency.format(sourceBalance)}. La compra y la comisión no pueden superarlo.`)
        return
      }
    } else {
      const currentBalance = validationTotals[reserve]
      if (action === 'withdraw' && numericAmount > currentBalance) {
        setError(`No puedes retirar más de ${currency.format(currentBalance)}.`)
        return
      }
      if (reserve === 'crypto' && action === 'withdraw') {
        const assetBalance = validationAllocation.find((allocation) => allocation.asset === destination)?.balance ?? 0
        if (numericAmount > assetBalance) {
          setError(`En ${destination} tienes ${currency.format(assetBalance)}.`)
          return
        }
      }
    }

    const now = Date.now()
    const nextMovement: ReserveMovement = {
      id: editing?.id ?? crypto.randomUUID(),
      reserve,
      action,
      amount: numericAmount,
      cryptoAsset: reserve === 'crypto' ? destination : undefined,
      cryptoSourceAsset: action === 'transfer' ? source : undefined,
      fee: action === 'transfer' && numericFee > 0 ? numericFee : undefined,
      description: description.trim(),
      date: movementDate,
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    }
    if (editing) onUpdate(nextMovement)
    else onAdd(nextMovement)
    setAmount('')
    setFee('')
    setDescription('')
    setMovementDate(today)
    setEditing(null)
    setError('')
  }

  function startEdit(movement: ReserveMovement) {
    setEditing(movement)
    setReserve(movement.reserve)
    setAction(movement.action)
    setAmount(String(movement.amount).replace('.', ','))
    setFee(movement.fee ? String(movement.fee).replace('.', ',') : '')
    setCryptoAsset(normalizeCryptoAsset(movement.cryptoAsset))
    setCryptoSourceAsset(normalizeCryptoAsset(movement.cryptoSourceAsset))
    setDescription(movement.description)
    setMovementDate(movement.date)
    setError('')
    document.querySelector('#reserve-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function cancelEdit() {
    setEditing(null)
    setAmount('')
    setFee('')
    setDescription('')
    setMovementDate(today)
    setError('')
  }

  return (
    <details id="reserves-panel" className="panel reserves-panel">
      <summary className="reserve-manager-summary">
        <div className="reserve-manager-icon"><SavingsIcon /></div>
        <div>
          <strong>Gestionar reservas</strong>
          <span>Añadir, retirar o cambiar cripto</span>
        </div>
        <span className="details-plus" aria-hidden="true">+</span>
      </summary>

      <div className="reserve-lower-grid reserves-content">
        <form id="reserve-form" className="reserve-form" onSubmit={handleSubmit}>
          <div className="reserve-form-heading"><h3>{editing ? 'Corregir movimiento' : action === 'transfer' ? 'Comprar o cambiar cripto' : 'Mover dinero'}</h3>{editing && <button type="button" onClick={cancelEdit}>Cancelar</button>}</div>
          <div className="reserve-form-row">
            <div className="field">
              <label htmlFor="reserve-type">Apartado</label>
              <select id="reserve-type" value={reserve} onChange={(event) => changeReserve(event.target.value as ReserveType)}>
                <option value="savings">Ahorro</option>
                <option value="crypto">Criptomonedas</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="reserve-action">Movimiento</label>
              <select id="reserve-action" value={action} onChange={(event) => { setAction(event.target.value as ReserveAction); setError('') }}>
                <option value="deposit">Añadir fondos</option>
                <option value="withdraw">Retirar fondos</option>
                {reserve === 'crypto' && <option value="transfer">Comprar / cambiar</option>}
              </select>
            </div>
          </div>

          <div className="field reserve-date-field">
            <label htmlFor="reserve-date">Fecha</label>
            <input id="reserve-date" type="date" value={movementDate} onChange={(event) => setMovementDate(event.target.value)} required />
          </div>

          {reserve === 'crypto' && action === 'transfer' ? (
            <div className="crypto-trade-fields">
              <div className="reserve-form-row">
                <div className="field">
                  <label htmlFor="crypto-source-asset">Desde</label>
                  <select id="crypto-source-asset" value={cryptoSourceAsset} onChange={(event) => setCryptoSourceAsset(event.target.value)} required>
                    {fundedCryptoAssets.length === 0 && <option value={DEFAULT_CRYPTO_ASSET}>{DEFAULT_CRYPTO_ASSET}</option>}
                    {fundedCryptoAssets.map((asset) => <option key={asset} value={asset}>{asset}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="crypto-asset">Hacia</label>
                  <input
                    id="crypto-asset"
                    list="crypto-asset-options"
                    value={cryptoAsset}
                    onChange={(event) => setCryptoAsset(event.target.value.toUpperCase())}
                    placeholder="Ej. BTC"
                    maxLength={14}
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    required
                  />
                </div>
              </div>
              <div className="trade-direction" aria-hidden="true">
                <span>{cryptoSourceAsset}</span><b>→</b><span>{normalizeCryptoAsset(cryptoAsset)}</span>
              </div>
            </div>
          ) : reserve === 'crypto' ? (
            <div className="field crypto-target-field">
              <label htmlFor="crypto-asset">{action === 'deposit' ? 'Dónde se guarda' : 'Desde qué activo'}</label>
              <input
                id="crypto-asset"
                list="crypto-asset-options"
                value={cryptoAsset}
                onChange={(event) => setCryptoAsset(event.target.value.toUpperCase())}
                placeholder="Ej. USDT"
                maxLength={14}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                required
              />
              <small>Todo el saldo queda asignado; nunca habrá dinero “sin clasificar”.</small>
            </div>
          ) : null}

          <datalist id="crypto-asset-options">
            {cryptoAssetOptions.map((asset) => <option key={asset} value={asset} />)}
          </datalist>

          <div className="reserve-form-row">
            <div className="field">
              <label htmlFor="reserve-amount">{action === 'transfer' ? 'Importe que compras' : 'Importe'}</label>
              <div className="amount-input">
                <span>€</span>
                <input id="reserve-amount" inputMode="text" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" required />
              </div>
            </div>
            {action === 'transfer' ? (
              <div className="field">
                <label htmlFor="crypto-fee">Comisión <span>(opcional)</span></label>
                <div className="amount-input">
                  <span>€</span>
                  <input id="crypto-fee" inputMode="text" value={fee} onChange={(event) => setFee(event.target.value)} placeholder="0,00" />
                </div>
              </div>
            ) : (
              <div className="field">
                <label htmlFor="reserve-description">Nota <span>(opcional)</span></label>
                <input id="reserve-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ej. fondo de emergencia" maxLength={80} />
              </div>
            )}
          </div>

          {action === 'transfer' && (
            <div className="field trade-note-field">
              <label htmlFor="reserve-description">Nota <span>(opcional)</span></label>
              <input id="reserve-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ej. compra periódica" maxLength={80} />
              <small>La comisión se descuenta del activo de origen y reduce el total cripto.</small>
            </div>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="primary-button reserve-submit">
            {action === 'deposit' ? <PlusIcon /> : action === 'withdraw' ? <MinusIcon /> : <CryptoIcon />}
            {editing
              ? 'Guardar cambios'
              : action === 'transfer'
              ? `Cambiar ${cryptoSourceAsset} a ${normalizeCryptoAsset(cryptoAsset)}`
              : `${action === 'deposit' ? 'Añadir a' : 'Retirar de'} ${reserve === 'savings' ? 'ahorro' : normalizeCryptoAsset(cryptoAsset)}`}
          </button>
        </form>

        <div className="reserve-insights">
          {(reserve === 'crypto' || cryptoAllocation.length > 0) && (
            <section className="crypto-allocation" aria-labelledby="crypto-allocation-title">
              <div className="crypto-allocation-heading">
                <div>
                  <span className="crypto-allocation-icon"><CryptoIcon /></span>
                  <div>
                    <h3 id="crypto-allocation-title">Distribución cripto</h3>
                    <p>{currency.format(totals.crypto)} en total{cryptoFees > 0 ? ` · ${currency.format(cryptoFees)} en comisiones` : ''}</p>
                  </div>
                </div>
                <span>{cryptoAllocation.length}</span>
              </div>

              {cryptoAllocation.length === 0 ? (
                <p className="crypto-allocation-empty">Añade fondos a USDT, BTC u otro activo para empezar.</p>
              ) : (
                <ul className="crypto-allocation-list">
                  {cryptoAllocation.map((allocation) => (
                    <li key={allocation.asset}>
                      <div className="crypto-allocation-row">
                        <strong>{allocation.asset}</strong>
                        <span>{Math.round(allocation.percentage)}%</span>
                        <b>{currency.format(allocation.balance)}</b>
                      </div>
                      <div className="crypto-allocation-track" aria-label={`${allocation.asset}: ${Math.round(allocation.percentage)}%`}>
                        <span style={{ width: `${allocation.percentage}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <div className="reserve-history">
            <h3>Últimos movimientos</h3>
            {movements.length === 0 ? (
              <p className="reserve-empty">Aquí aparecerán los cambios de ahorro y criptomonedas.</p>
            ) : (
              <ul>
                {movements.slice(0, 5).map((movement) => {
                  const destination = normalizeCryptoAsset(movement.cryptoAsset)
                  const source = normalizeCryptoAsset(movement.cryptoSourceAsset)
                  const isTrade = movement.action === 'transfer'
                  return (
                    <li key={movement.id}>
                      <div className={`reserve-history-icon ${movement.reserve}`}>
                        {movement.reserve === 'savings' ? <SavingsIcon /> : <CryptoIcon />}
                      </div>
                      <div className="reserve-history-copy">
                        <strong>{movement.description || (movement.reserve === 'savings' ? 'Ahorro' : isTrade ? `${source} → ${destination}` : destination)}</strong>
                        <span>
                          {isTrade
                            ? `Cambio${movement.fee ? ` · Comisión ${currency.format(movement.fee)}` : ''}`
                            : `${movement.reserve === 'crypto' ? `${destination} · ` : ''}${movement.action === 'deposit' ? 'Suma' : 'Resta'}`}
                          {' · '}{dateFormatter.format(new Date(`${movement.date}T12:00:00`))}
                        </span>
                      </div>
                      <span className={`reserve-history-amount ${movement.action}`}>
                        {isTrade ? '' : movement.action === 'deposit' ? '+' : '−'}{currency.format(movement.amount)}
                      </span>
                      <button type="button" className="icon-button reserve-edit" onClick={() => startEdit(movement)} aria-label={`Editar movimiento de ${movement.reserve === 'savings' ? 'ahorro' : destination}`}>
                        <EditIcon />
                      </button>
                      <button type="button" className="icon-button reserve-delete" onClick={() => onDelete(movement.id)} aria-label={`Eliminar ${isTrade ? `cambio de ${source} a ${destination}` : `movimiento de ${movement.reserve === 'savings' ? 'ahorro' : destination}`}`}>
                        <TrashIcon />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </details>
  )
}
