import { isIsoDate } from './reservations.js';

export const customerPayment = booking => ({ status: 'paid', amountGrosz: 0, note: '', ...(booking.customerPayment || {}) });
export function validateCustomerPayment(payment) {
  if (!['paid', 'cashToCollect'].includes(payment.status)) throw new Error('Invalid customer payment status.');
  if (payment.status === 'cashToCollect' && (!Number.isSafeInteger(payment.amountGrosz) || payment.amountGrosz <= 0)) throw new Error('A positive cash amount is required.');
  if (typeof payment.note !== 'string' || payment.note.length > 500) throw new Error('Invalid customer payment note.');
}
export const cleaningAmount = snapshot => snapshot.priceGrosz + (snapshot.dogBonus ? snapshot.dogBonusGrosz || 0 : 0);
export function checkoutDogSnapshot(snapshot, booking, defaultGrosz = 0) {
  return withDogBonus(snapshot, Boolean(booking?.hasDog), booking?.dogBonusGrosz ?? defaultGrosz);
}
export function withDogBonus(snapshot, enabled, amountGrosz = 0) {
  if (!Number.isSafeInteger(amountGrosz) || amountGrosz < 0) throw new Error('Invalid dog bonus.');
  return { ...snapshot, dogBonus: Boolean(enabled), dogBonusGrosz: enabled ? amountGrosz : 0 };
}
export function orderedApartments(apartments, categoryId) {
  return apartments.filter(item => (item.categoryId || '') === categoryId).sort((a, b) =>
    (Number.isFinite(a.sortOrder) ? a.sortOrder : Number.MAX_SAFE_INTEGER) - (Number.isFinite(b.sortOrder) ? b.sortOrder : Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name));
}
export function nextApartmentOrder(apartments, categoryId) {
  return Math.max(-1, ...apartments.filter(item => (item.categoryId || '') === categoryId).map(item => Number.isFinite(item.sortOrder) ? item.sortOrder : -1)) + 1;
}
// Additive, pure migration: no database writes, deletes or translation of business data.
export function migrateOperations(data) {
  const result = { ...data, owners: data.owners || [] };
  const categories = new Set((data.apartments || []).map(item => item.categoryId || ''));
  const order = new Map();
  for (const category of categories) orderedApartments(data.apartments, category).forEach((item, index) => order.set(item.id, index));
  result.apartments = (data.apartments || []).map(item => ({ ...item, ownerId: item.ownerId || '', sortOrder: order.get(item.id) }));
  result.reservations = (data.reservations || []).map(item => ({ ...item, customerPayment: customerPayment(item) }));
  result.assignments = (data.assignments || []).map(item => ({ ...item, apartments: item.apartments.map(snapshot => ({ dogBonus: false, dogBonusGrosz: 0, ...snapshot })) }));
  return result;
}
export function validateOperations(data) {
  const owners = data.owners || [];
  for (const owner of owners) if (!owner.id || typeof owner.name !== 'string' || !owner.name.trim() || (owner.active !== undefined && typeof owner.active !== 'boolean')) throw new Error('Invalid owner.');
  for (const booking of data.reservations || []) validateCustomerPayment(customerPayment(booking));
  for (const booking of data.reservations || []) {
    if(booking.hasDog !== undefined && typeof booking.hasDog !== 'boolean')throw new Error('Invalid booking dog option.');
    if(booking.dogBonusGrosz !== undefined && (!Number.isSafeInteger(booking.dogBonusGrosz)||booking.dogBonusGrosz<0))throw new Error('Invalid booking dog bonus.');
  }
  for (const job of data.assignments || []) for (const snapshot of job.apartments || []) {
    if (snapshot.dogBonus !== undefined && typeof snapshot.dogBonus !== 'boolean') throw new Error('Invalid dog bonus.');
    if (snapshot.dogBonusGrosz !== undefined && (!Number.isSafeInteger(snapshot.dogBonusGrosz) || snapshot.dogBonusGrosz < 0)) throw new Error('Invalid dog bonus.');
  }
  for (const apartment of data.apartments || []) {
    if (apartment.ownerCleaningChargeGrosz !== undefined && (!Number.isSafeInteger(apartment.ownerCleaningChargeGrosz) || apartment.ownerCleaningChargeGrosz < 0)) throw new Error('Invalid owner cleaning charge.');
    if (apartment.ownerId && !owners.some(owner => owner.id === apartment.ownerId)) throw new Error('Unknown apartment owner.');
    if (apartment.sortOrder !== undefined && (!Number.isSafeInteger(apartment.sortOrder) || apartment.sortOrder < 0)) throw new Error('Invalid apartment order.');
  }
  for (const setting of data.settings || []) if (setting.id === 'dogBonus' && (!Number.isSafeInteger(setting.amountGrosz) || setting.amountGrosz < 0)) throw new Error('Invalid dog bonus setting.');
  for (const key of ['staff','apartments','categories','owners','assignments','payments','reservations','checkoutStates','settings']) {
    const list = data[key] || [];
    if (list.some(item => !item || typeof item.id !== 'string') || new Set(list.map(item => item.id)).size !== list.length) throw new Error(`Invalid or duplicate IDs in ${key}.`);
  }
}
export function employeePeriod(data, staffId, start, end) {
  if (!isIsoDate(start) || !isIsoDate(end) || end < start) throw new Error('Invalid report period.');
  const staff = data.staff.find(item => item.id === staffId);
  if (!staff) throw new Error('Select an employee.');
  const jobs = data.assignments.filter(item => item.staffId === staffId && item.date >= start && item.date <= end);
  const rows = jobs.flatMap(job => job.apartments.map(snapshot => ({ ...snapshot, date: job.date, status: job.status, notes: job.notes || '', checkout: data.reservations.some(booking => booking.apartmentId === snapshot.apartmentId && booking.checkOut === job.date), categoryName: data.categories.find(category => category.id === data.apartments.find(apartment => apartment.id === snapshot.apartmentId)?.categoryId)?.name || '' }))).sort((a,b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  return { staff, start, end, rows, planned: rows.filter(row => row.status === 'planned').length, confirmed: rows.filter(row => row.status === 'confirmed').length };
}
