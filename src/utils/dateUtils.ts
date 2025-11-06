export function formatDateBR(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTimeBR(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR');
}

export function formatCompetencia(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${year}`;
}

export function parseCompetencia(competencia: string): Date {
  const [month, year] = competencia.split('/');
  return new Date(parseInt(year), parseInt(month) - 1, 1);
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function getNextBusinessDay(date: Date): Date {
  const result = new Date(date);
  while (isWeekend(result)) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

export function calculateDueDate(
  competencia: string,
  diaVencimento: number,
  usarDiaUtil: boolean
): Date {
  const competenciaDate = parseCompetencia(competencia);
  const nextMonth = new Date(competenciaDate.getFullYear(), competenciaDate.getMonth() + 1, 1);

  const lastDayOfMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
  const day = Math.min(diaVencimento, lastDayOfMonth);

  const dueDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day);

  return usarDiaUtil ? getNextBusinessDay(dueDate) : dueDate;
}

export function getMonthsForRecurrence(
  startDate: Date,
  recorrencia: 'mensal' | 'trimestral' | 'anual'
): Date[] {
  const months: Date[] = [];
  const currentYear = startDate.getFullYear();

  switch (recorrencia) {
    case 'mensal':
      for (let month = 0; month < 12; month++) {
        months.push(new Date(currentYear, month, 1));
      }
      break;
    case 'trimestral':
      for (let month = 0; month < 12; month += 3) {
        months.push(new Date(currentYear, month, 1));
      }
      break;
    case 'anual':
      months.push(new Date(currentYear, 0, 1));
      break;
  }

  return months;
}

export function getDaysUntil(date: Date | string): number {
  const target = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isOverdue(date: Date | string): boolean {
  return getDaysUntil(date) < 0;
}
