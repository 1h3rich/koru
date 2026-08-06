-- Estado de asistencia del día: por defecto "presente" (se infiere
-- de tener hora_entrada, como hasta ahora), o marcado explícitamente
-- como ausencia justificada o vacaciones cuando el niño no viene.
alter table public.asistencia
  add column estado text not null default 'presente'
    check (estado in ('presente', 'ausente_justificado', 'vacaciones')),
  add column motivo text;
