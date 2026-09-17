import { ServiceWeekend } from '../types';

export const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function getMonthName(month: number): string {
  return INDONESIAN_MONTHS[month - 1] || '';
}

export function formatDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatNiceDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = d.getDate();
  const monthName = INDONESIAN_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${monthName} ${year}`;
}

/**
 * Gets all Service Weekends in a given month and year.
 * A Service Weekend is anchored on Sunday (the primary church service day) within the month.
 * If Sunday is the 1st of the month (e.g. 1 November 2026), its weekend includes the Saturday prior (31 October).
 */
export function getServiceWeekendsInMonth(month: number, year: number): ServiceWeekend[] {
  const weekends: ServiceWeekend[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  let weekendNumber = 1;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    if (d.getDay() === 0) { // 0 = Sunday (primary church service anchor)
      const sunday = new Date(d);
      const saturday = new Date(d);
      saturday.setDate(sunday.getDate() - 1);

      const satStr = formatDateStr(saturday);
      const sunStr = formatDateStr(sunday);

      const satDay = saturday.getDate();
      const sunDay = sunday.getDate();
      const satMonth = INDONESIAN_MONTHS[saturday.getMonth()].substring(0, 3);
      const sunMonth = INDONESIAN_MONTHS[sunday.getMonth()].substring(0, 3);

      let label = `${sunMonth} ${sunDay}, ${year}`;
      if (satMonth === sunMonth) {
        label = `${satMonth} ${satDay}-${sunDay}, ${year}`;
      } else {
        label = `${satMonth} ${satDay} - ${sunMonth} ${sunDay}, ${year}`;
      }

      weekends.push({
        id: satStr,
        saturday_date: satStr,
        sunday_date: sunStr,
        label,
        weekend_number: weekendNumber++,
        month,
        year,
      });
    }
  }

  return weekends;
}

/**
 * Finds the weekend that corresponds to a given date YYYY-MM-DD.
 */
export function getWeekendForDate(dateStr: string, weekends: ServiceWeekend[]): ServiceWeekend | undefined {
  if (!dateStr || weekends.length === 0) return undefined;

  // 1. Exact match with saturday or sunday date
  const exact = weekends.find((w) => w.saturday_date === dateStr || w.sunday_date === dateStr);
  if (exact) return exact;

  // 2. Find nearest weekend in the list
  const targetTime = new Date(dateStr).getTime();
  let closest = weekends[0];
  let minDiff = Math.abs(targetTime - new Date(closest.saturday_date).getTime());

  for (const w of weekends) {
    const diffSat = Math.abs(targetTime - new Date(w.saturday_date).getTime());
    const diffSun = Math.abs(targetTime - new Date(w.sunday_date).getTime());
    const currentMin = Math.min(diffSat, diffSun);
    if (currentMin < minDiff) {
      minDiff = currentMin;
      closest = w;
    }
  }

  return closest;
}
