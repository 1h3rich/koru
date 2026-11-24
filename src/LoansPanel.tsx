import { useMemo, useState, type FormEvent } from 'react'
import { CalendarIcon, CheckIcon, EditIcon, HandCoinsIcon, PeopleIcon, PlusIcon, TrashIcon } from './Icons'
import { getLoanOutstanding, getLoanParticipants, getPaidLoanEntries } from './finance'
import type { Loan, LoanParticipant } from './types'

const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const dateFormatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
const monthFormatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })

type DueDateMode = 'none' | 'month' | 'date'

interface PaymentConfirmation {
  loanId: string
  participantIds: string[]
  label: string
  amount: number
}

function dueDateMode(value: string): DueDateMode {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date'
  if (/^\d{4}-\d{2}$/.test(value)) return 'month'
  return 'none'
}

function formatDueDate(value: string) {
  if (dueDateMode(value) === 'month') return monthFormatter.format(new Date(`${value}-15T12:00:00`))
  return dateFormatter.format(new Date(`${value}T12:00:00`))
}

function localDate() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

interface LoanDraft {
  participants: Array<{
    id: string
    name: string
    amount: string
    status: LoanParticipant['status']
    repaidAt?: string
  }>
  reason: string
  lentDate: string
  dueDate: string
  dueDateMode: DueDateMode
}

function emptyParticipant() {
  return { id: crypto.randomUUID(), name: '', amount: '', status: 'open' as const }
}

const emptyDraft = (): LoanDraft => ({ participants: [emptyParticipant()], reason: '', lentDate: localDate(), dueDate: '', dueDateMode: 'none' })

function loanWithParticipants(loan: Loan, participants: LoanParticipant[]): Loan {
  const total = participants.reduce((sum, participant) => sum + participant.amount, 0)
  const allRepaid = participants.every((participant) => participant.status === 'repaid')
  return {
    ...loan,
    person: participants.map((participant) => participant.name).join(', '),
    amount: total,
    participants,
    status: allRepaid ? 'repaid' : 'open',
    repaidAt: allRepaid ? localDate() : undefined,
    updatedAt: Date.now(),
  }
}

interface LoansPanelProps {
  loans: Loan[]
  onSave: (loan: Loan) => void
  onDelete: (id: string) => void
}

export default function LoansPanel({ loans, onSave, onDelete }: LoansPanelProps) {
  const [draft, setDraft] = useState<LoanDraft>(emptyDraft)
  const [editing, setEditing] = useState<Loan | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [paymentConfirmation, setPaymentConfirmation] = useState<PaymentConfirmation | null>(null)
  const orderedLoans = useMemo(() => loans.filter((loan) => getLoanOutstanding(loan) > 0).sort((a, b) => b.createdAt - a.createdAt), [loans])
  const paidEntries = useMemo(() => getPaidLoanEntries(loans), [loans])
  const outstanding = loans.reduce((sum, loan) => sum + getLoanOutstanding(loan), 0)
  const draftTotal = draft.participants.reduce((sum, participant) => sum + (Number(participant.amount.replace(',', '.')) || 0), 0)

  function startAdd() {
    setEditing(null)
    setDraft(emptyDraft())
    setError('')
    setShowForm(true)
  }

  function startEdit(loan: Loan) {
    setEditing(loan)
    setDraft({
      participants: getLoanParticipants(loan).map((participant) => ({ ...participant, name: participant.name, amount: String(participant.amount).replace('.', ',') })),
      reason: loan.reason,
      lentDate: loan.lentDate,
      dueDate: loan.dueDate,
      dueDateMode: dueDateMode(loan.dueDate),
    })
    setError('')
    setShowForm(true)
  }

  function updateParticipant(id: string, changes: Partial<LoanDraft['participants'][number]>) {
    setDraft((current) => ({ ...current, participants: current.participants.map((participant) => participant.id === id ? { ...participant, ...changes } : participant) }))
  }

  function addParticipant() {
    setDraft((current) => ({ ...current, participants: [...current.participants, emptyParticipant()] }))
  }

  function removeParticipant(id: string) {
    setDraft((current) => ({ ...current, participants: current.participants.filter((participant) => participant.id !== id) }))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const filledParticipants = draft.participants.filter((participant) => participant.name.trim() || participant.amount.trim())
    const participants = filledParticipants.map((participant) => ({
      id: participant.id,
      name: participant.name.trim(),
      amount: Number(participant.amount.replace(',', '.')),
      status: participant.status,
      repaidAt: participant.repaidAt,
    }))
    if (participants.length === 0 || participants.some((participant) => !participant.name || !Number.isFinite(participant.amount) || participant.amount <= 0)) {
      setError('Indica el nombre y una cantidad mayor que cero para cada persona.')
      return
    }
    const now = Date.now()
    const allRepaid = participants.every((participant) => participant.status === 'repaid')
    onSave({
      id: editing?.id ?? crypto.randomUUID(),
      person: participants.map((participant) => participant.name).join(', '),
      reason: draft.reason.trim(),
      amount: participants.reduce((sum, participant) => sum + participant.amount, 0),
      lentDate: draft.lentDate,
      dueDate: draft.dueDateMode === 'none' ? '' : draft.dueDate,
      status: allRepaid ? 'repaid' : 'open',
      repaidAt: allRepaid ? editing?.repaidAt ?? localDate() : undefined,
      participants,
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    })
    setShowForm(false)
    setEditing(null)
    setDraft(emptyDraft())
  }

  function requestPayment(loan: Loan, participants: LoanParticipant[]) {
    setPaymentConfirmation({
      loanId: loan.id,
      participantIds: participants.map((participant) => participant.id),
      label: participants.length === 1 ? participants[0].name : `${participants.length} personas`,
      amount: participants.reduce((sum, participant) => sum + participant.amount, 0),
    })
  }

  function confirmPayment() {
    if (!paymentConfirmation) return
    const loan = loans.find((current) => current.id === paymentConfirmation.loanId)
    if (!loan) {
      setPaymentConfirmation(null)
      return
    }
    const paidIds = new Set(paymentConfirmation.participantIds)
    const participants = getLoanParticipants(loan).map((participant) => paidIds.has(participant.id) && participant.status === 'open'
      ? { ...participant, status: 'repaid' as const, repaidAt: localDate() }
      : participant)
    onSave(loanWithParticipants(loan, participants))
    setPaymentConfirmation(null)
  }

  return (
    <details id="loans-panel" className="panel loans-panel">
      <summary className="transaction-manager-summary">
        <div className="transaction-manager-icon loan-icon"><HandCoinsIcon /></div>
        <div>
          <strong>Dinero prestado</strong>
          <span>{outstanding > 0 ? `${currency.format(outstanding)} pendientes de volver` : 'Controla lo que te deben'}</span>
        </div>
        <span className="details-plus" aria-hidden="true">+</span>
      </summary>

      <div className="loans-content">
        <div className="loans-toolbar">
          <div><span>Pendiente</span><strong>{currency.format(outstanding)}</strong></div>
          <button type="button" className="secondary-button" onClick={startAdd}><PlusIcon /> Nuevo préstamo</button>
        </div>

        {showForm && (
          <form className="loan-form" onSubmit={submit}>
            <div className="loan-form-heading">
              <div><span>{editing ? 'Corrigiendo' : 'Nuevo'}</span><strong>{editing ? 'Editar préstamo' : 'Apuntar préstamo'}</strong></div>
              <button type="button" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
            <div className="form-grid">
              <div className="field field-wide loan-people-field">
                <div className="loan-people-heading"><label htmlFor="loan-person">Personas que te deben</label><span>Cantidad</span></div>
                <div className="loan-person-rows">
                  {draft.participants.map((participant, index) => (
                    <div className="loan-person-row" key={participant.id}>
                      <input
                        id={index === 0 ? 'loan-person' : `loan-person-${index + 1}`}
                        aria-label={`Nombre de la persona ${index + 1}`}
                        value={participant.name}
                        onChange={(event) => updateParticipant(participant.id, { name: event.target.value })}
                        placeholder={index === 0 ? 'Ej. María' : 'Otra persona'}
                        required={index === 0}
                      />
                      <div className="amount-input">
                        <span>€</span>
                        <input
                          id={index === 0 ? 'loan-amount' : `loan-amount-${index + 1}`}
                          aria-label={`Cantidad que debe la persona ${index + 1}`}
                          inputMode="text"
                          value={participant.amount}
                          onChange={(event) => updateParticipant(participant.id, { amount: event.target.value })}
                          placeholder="0,00"
                          required={index === 0}
                        />
                      </div>
                      {draft.participants.length > 1 && <button type="button" className="icon-button loan-person-remove" onClick={() => removeParticipant(participant.id)} aria-label={`Quitar ${participant.name || `persona ${index + 1}`}`}><TrashIcon /></button>}
                    </div>
                  ))}
                </div>
                <div className="loan-people-footer">
                  <button type="button" className="loan-add-person" onClick={addParticipant}><PlusIcon /> Añadir otra persona</button>
                  <span>Total <strong>{currency.format(draftTotal)}</strong></span>
                </div>
              </div>
              <div className="field field-wide"><label htmlFor="loan-reason">Motivo</label><input id="loan-reason" value={draft.reason} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} placeholder="Ej. Entrada de un viaje" /></div>
              <div className="field"><label htmlFor="loan-date">Prestado el</label><div className="date-picker-shell loan-date-picker"><span>{dateFormatter.format(new Date(`${draft.lentDate}T12:00:00`))}</span><CalendarIcon /><input id="loan-date" type="date" value={draft.lentDate} onChange={(event) => setDraft({ ...draft, lentDate: event.target.value })} required /></div></div>
              <fieldset className="field field-wide loan-due-field">
                <legend>Cuándo piensa pagarlo <span>(opcional)</span></legend>
                <div className="loan-due-options" role="radiogroup" aria-label="Precisión de la fecha de devolución">
                  {([
                    ['none', 'No lo sé'],
                    ['month', 'Solo mes'],
                    ['date', 'Día exacto'],
                  ] as Array<[DueDateMode, string]>).map(([mode, label]) => (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={draft.dueDateMode === mode}
                      className={draft.dueDateMode === mode ? 'active' : ''}
                      key={mode}
                      onClick={() => setDraft({ ...draft, dueDateMode: mode, dueDate: mode === 'month' && draft.dueDate.length === 10 ? draft.dueDate.slice(0, 7) : mode === 'date' && draft.dueDate.length === 7 ? '' : draft.dueDate })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {draft.dueDateMode !== 'none' && (
                  <div className="date-picker-shell loan-due-picker">
                    <span>{draft.dueDate ? formatDueDate(draft.dueDate) : draft.dueDateMode === 'month' ? 'Selecciona el mes' : 'Selecciona la fecha'}</span>
                    <CalendarIcon />
                    <input
                      id="loan-due"
                      aria-label={draft.dueDateMode === 'month' ? 'Mes previsto de devolución' : 'Fecha prevista de devolución'}
                      type={draft.dueDateMode}
                      value={draft.dueDate}
                      onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })}
                    />
                  </div>
                )}
              </fieldset>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" className="primary-button loan-save"><CheckIcon /> {editing ? 'Guardar cambios' : 'Guardar préstamo'}</button>
          </form>
        )}

        {orderedLoans.length === 0 && paidEntries.length === 0 && !showForm ? (
          <div className="loan-empty"><PeopleIcon /><p>No tienes dinero prestado ahora mismo.</p><button type="button" onClick={startAdd}>Apuntar el primero</button></div>
        ) : (
          <div className="loan-list">
            {orderedLoans.map((loan) => {
              const participants = getLoanParticipants(loan)
              const pendingParticipants = participants.filter((participant) => participant.status === 'open')
              const pendingAmount = getLoanOutstanding(loan)
              const multiplePeople = pendingParticipants.length > 1
              const confirmation = paymentConfirmation?.loanId === loan.id ? paymentConfirmation : null
              return (
                <article className="loan-item" key={loan.id}>
                  <div className="loan-person"><span>{multiplePeople ? pendingParticipants.length : pendingParticipants[0]?.name.slice(0, 1).toUpperCase()}</span><div><strong>{multiplePeople ? `${pendingParticipants.length} personas` : pendingParticipants[0]?.name}</strong><small>{loan.reason || 'Sin motivo indicado'}</small></div></div>
                  <div className="loan-amount"><strong>{currency.format(pendingAmount)}</strong><span>{loan.dueDate ? <><CalendarIcon /> Previsto {formatDueDate(loan.dueDate)}</> : 'Sin fecha prevista'}</span></div>

                  {participants.length > 1 && (
                    <div className="loan-participants" aria-label="Personas incluidas en el préstamo">
                      {pendingParticipants.map((participant) => (
                        <div key={participant.id}>
                          <span>{participant.name}</span>
                          <strong>{currency.format(participant.amount)}</strong>
                          <button type="button" className="participant-repaid-button" onClick={() => requestPayment(loan, [participant])}>
                            <CheckIcon /> Devuelto
                          </button>
                        </div>
                      ))}
                      <p>{pendingParticipants.length} {pendingParticipants.length === 1 ? 'persona pendiente' : 'personas pendientes'}</p>
                    </div>
                  )}

                  {confirmation && (
                    <div className="loan-payment-confirmation" role="alertdialog" aria-label={`Confirmar pago de ${confirmation.label}`}>
                      <div><span>Confirmar pago</span><strong>{confirmation.label} · {currency.format(confirmation.amount)}</strong></div>
                      <button type="button" onClick={() => setPaymentConfirmation(null)}>Cancelar</button>
                      <button type="button" className="confirm-payment-button" onClick={confirmPayment}><CheckIcon /> Confirmar</button>
                    </div>
                  )}

                  <div className="loan-actions">
                    <button type="button" onClick={() => startEdit(loan)}><EditIcon /> Editar</button>
                    {(participants.length === 1 || pendingParticipants.length > 1) && <button type="button" className="repaid-button" onClick={() => requestPayment(loan, pendingParticipants)}><CheckIcon /> {multiplePeople ? 'Todos devueltos' : 'Devuelto'}</button>}
                    <button type="button" className="loan-delete" onClick={() => onDelete(loan.id)} aria-label={`Eliminar préstamo a ${loan.person}`}><TrashIcon /></button>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {paidEntries.length > 0 && (
          <section className="loan-paid-history" aria-labelledby="paid-loans-title">
            <div className="loan-paid-heading"><span id="paid-loans-title">Pagados</span><small>Historial</small></div>
            <ul>
              {paidEntries.map((entry) => (
                <li key={entry.id} title={`Pagado el ${formatDueDate(entry.repaidAt)}`}>
                  <span className="loan-paid-check"><CheckIcon /></span>
                  <span className="loan-paid-copy"><strong>{entry.name}</strong><i>·</i><span>{entry.reason || 'Sin motivo'}</span></span>
                  <b>{currency.format(entry.amount)}</b>
                  <em>Pagado</em>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </details>
  )
}
