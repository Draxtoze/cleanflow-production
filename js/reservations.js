const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DMY_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export const isIsoDate = value => {
  if (!ISO_DATE.test(value || '')) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
export const parseDmy = value => {
  const match = String(value || '').trim().match(DMY_DATE);
  if (!match) return null;
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  return isIsoDate(iso) ? iso : null;
};
export const formatDmy = date => isIsoDate(date) ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : '';
export const addDaysIso = (date, amount) => { const next = new Date(`${date}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + amount); return next.toISOString().slice(0, 10); };
export const nightsBetween = (checkIn, checkOut) => Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000);
export const overlaps = (left, right) => left.checkIn < right.checkOut && right.checkIn < left.checkOut;
export const reservationEvents = (reservation, date) => ({ checkIn: reservation.checkIn === date, checkOut: reservation.checkOut === date, occupied: reservation.checkIn <= date && date < reservation.checkOut });
export const checkoutsOn = (reservations, date) => reservations.filter(reservation => reservation.checkOut === date);
export const monthDays = anchor => { const [year, month] = anchor.slice(0, 7).split('-').map(Number); const first = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`; const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate(); return Array.from({ length: lastDay }, (_, index) => addDaysIso(first, index)); };

export function validateReservationRecord(record, reservations = [], ignoreId = null) {
  if (!record?.id || !record.apartmentId || !isIsoDate(record.checkIn) || !isIsoDate(record.checkOut)) throw new Error('Invalid reservation data.');
  if (record.checkOut <= record.checkIn) throw new Error('Check-out must be after check-in.');
  const conflict = reservations.find(item => item.id !== ignoreId && item.apartmentId === record.apartmentId && overlaps(record, item));
  if (conflict) throw new Error(`Reservation conflicts with ${conflict.checkIn}–${conflict.checkOut}.`);
  return true;
}
export function checkoutCleaningStatus(apartmentId, date, assignments, checkoutStates) {
  const ignored = checkoutStates.find(item => item.apartmentId === apartmentId && item.date === date);
  if (ignored?.status === 'ignored') return 'ignored';
  const assignment = assignments.find(item => item.date === date && item.apartments?.some(apartment => apartment.apartmentId === apartmentId));
  return assignment?.status === 'confirmed' ? 'confirmed' : assignment ? 'planned' : 'toPlan';
}
