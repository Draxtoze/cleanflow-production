import { Store } from './store.js';
import { checkoutDogSnapshot, migrateOperations, orderedApartments, nextApartmentOrder, customerPayment, validateCustomerPayment, withDogBonus, employeePeriod } from './operations.js';
import { setMoneyLanguage, BACKUP_VERSION, addDays, assignmentTotal, formatPLN, id, localDate, snapshotApartment, staffSummary, toGrosz, validateBackup, weekDays } from './business.js';
import { checkoutsOn, formatDmy, monthDays, nightsBetween, parseDmy, reservationEvents, validateReservationRecord } from './reservations.js';
import { bonusLabel, bookingNightLabel, departureLabel, formatBookingDate, formatBookingDay, formatBookingMonth, formatBookingWeekday, priorityLabel, t } from './i18n.js';
import { createEmployeePeriodPdf, createOwnerMonthlyPdf, createCategoryBookingsPdf, createCategoryZip, createWeeklyStaffPdf, downloadBlob, reportPeriodStatus } from './reports.js';

import {APP_VERSION,preferencesFrom} from './preferences.js';
import {createBackup,readBackup} from './backup.js';
import {createV2} from './v2.js';
const desktopInfo=window.cleanflowDesktop?await window.cleanflowDesktop.info():null;
const isDemo = Boolean(desktopInfo?.value?.demo) || (location.protocol!=='cleanflow:' && new URLSearchParams(location.search).get('demo') === '1');
const store = await new Store().open({ demo: isDemo });
if(isDemo && !(await store.all('staff')).length) { const { demoData } = await import('./demo.js'); await store.replace(demoData()); }
const initialData = migrateOperations(await store.data());
const initialPreferences=preferencesFrom(initialData,localStorage.getItem('cleanflow-language')||'pl');
if(!initialData.settings.some(item=>item.id==='preferences')){await store.put('settings',initialPreferences);initialData.settings.push(initialPreferences);}
const state = { page: 'planning', anchor: localDate(new Date()), bookingAnchor: `${localDate(new Date()).slice(0, 7)}-01`, bookingCategory: null, bookingSelection: null, reportWeek: localDate(new Date()), reportMonth: `${localDate(new Date()).slice(0, 7)}-01`, reportCategory: null, generatedCategoryReports: null, data: initialData, language: initialPreferences.language };const app = document.querySelector('#app');
const byId = key => state.data[key];
const active = key => byId(key).filter(item => item.active !== false);
const find = (key, keyId) => byId(key).find(item => item.id === keyId);
const staffOrder = person => Number.isFinite(person.sortOrder) ? person.sortOrder : Number.MAX_SAFE_INTEGER;
const orderedStaff = (activeOnly = false) => [...byId('staff')].filter(person => !activeOnly || person.active !== false).sort((a, b) => staffOrder(a) - staffOrder(b) || a.name.localeCompare(b.name));
const categoryName = categoryId => find('categories', categoryId)?.name || tr('legacy.uncategorized');
const categories = () => [...byId('categories')].sort((a, b) => a.name.localeCompare(b.name));
const save = async (key, value) => { await store.put(key, value); const index = byId(key).findIndex(item => item.id === value.id); index < 0 ? byId(key).push(value) : byId(key)[index] = value; toast(tr('legacy.savedAutomatically')); render(); };
const remove = async (key, keyId) => { await store.delete(key, keyId); state.data[key] = byId(key).filter(item => item.id !== keyId); toast(tr('legacy.savedAutomatically')); render(); };
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]);
const dateLabel = date => new Intl.DateTimeFormat(state.language === 'pl' ? 'pl-PL' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`));
const liveTranslations=new Map();
const tr = (key, values = {}) => {const en=t('en',key,values),pl=t('pl',key,values);liveTranslations.set(en,{en,pl});liveTranslations.set(pl,{en,pl});return state.language==='pl'?pl:en;};
const v2=createV2({state,store,app,tr,esc,render,toast,reportLabels,openPdfPreview,openCleaningSettings,isDemo});
function toast(message, type = 'success') { const item = document.createElement('div'); item.className = `toast ${type}`; item.textContent = message; document.querySelector('#toast-region').append(item);localize(item); setTimeout(() => item.remove(), 3200); }
function modal(title, body, onSubmit, { danger = false, submit = tr('legacy.save') } = {}) {
  const root = document.createElement('div'); root.className = 'modal-backdrop'; root.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h2>${esc(title)}</h2><button class="icon" data-close aria-label="${esc(tr('legacy.close'))}">×</button></header><div class="modal-body">${body}</div><footer><button class="secondary" data-close>${esc(tr('legacy.cancel'))}</button><button class="${danger ? 'danger' : ''}" data-submit>${esc(submit)}</button></footer></section>`;
  const close = () => root.remove(); root.querySelectorAll('[data-close]').forEach(button => button.onclick = close);
  root.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){const items=[...root.querySelectorAll('input:not(:disabled),textarea,select,button:not(:disabled)')].filter(item=>item.getClientRects().length);if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items.at(-1)?.focus();}else if(!event.shiftKey&&document.activeElement===items.at(-1)){event.preventDefault();items[0]?.focus();}}});
  root.querySelector('[data-submit]').onclick = async () => { const button=root.querySelector('[data-submit]');button.disabled=true;try { const result=await onSubmit(root.querySelector('form')); if(result!==false)close(); } catch (error) { const notice = root.querySelector('.form-error'); notice.textContent = localizedError(error);localize(notice); } finally {button.disabled=false;} };
  document.body.append(root);
  localize(root);
  const customerStatus=root.querySelector('[name=customerStatus]');if(customerStatus)customerStatus.onchange=()=>{root.querySelector('[data-cash-fields]').hidden=customerStatus.value==='paid';};
  root.querySelector('form')?.addEventListener('submit', event => event.preventDefault());
  root.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.matches('[data-assignment-search]')) { event.preventDefault(); event.stopPropagation(); } });  root.addEventListener('input', event => {
    if (!event.target.matches('[data-assignment-search]')) return;
    const query = event.target.value.trim().toLocaleLowerCase();
    const fieldset = root.querySelector('fieldset');
    const options = [...root.querySelectorAll('[data-apartment-option]')];
    options.forEach((option, index) => { if (!option.dataset.order) option.dataset.order = String(index); });
    options.forEach(option => { const checked = option.querySelector('input').checked; const match = checked || Boolean(query && option.dataset.search.toLocaleLowerCase().includes(query)); option.hidden = !match; option.style.display = match ? 'grid' : 'none'; });
    options.filter(option => !option.hidden).sort((a, b) => Number(a.dataset.order) - Number(b.dataset.order)).forEach(option => fieldset.append(option));
    const note = root.querySelector('[data-assignment-search-note]'); if (note) note.hidden = options.some(option => !option.hidden);
    fieldset.scrollTop = 0;
  });
  root.querySelector('[data-assignment-search]')?.dispatchEvent(new Event('input', { bubbles: true }));
  root.querySelector('input,select,textarea')?.focus();
  return root;
}
const shell = content => `
  <aside><a class="brand" href="#planning"><span>✦</span> CleanFlow</a><p class="brand-note">${esc(tr('legacy.apartmentCleaningOperations'))}</p><p class="app-version">${esc(tr('ops.version',{version:APP_VERSION}))}</p>
  <nav>${[['planning',tr('legacy.calendarPlanning')],['staff',tr('legacy.staff')],['apartments',tr('legacy.apartments')],['bookings',tr('nav.bookings')],['owners',tr('ops.owners')],['reports',tr('nav.reports')],['balances',tr('legacy.balancesPayments')],['backup',tr('legacy.backupRestore')],['about',tr('legacy.about')]].map(([key,label]) => `<button data-page="${key}" class="${state.page === key ? 'selected' : ''}">${label}</button>`).join('')}</nav><div class="language-switch"><button data-language="pl">PL</button><button data-language="en">EN</button></div><div class="save-state">● ${esc(tr('ops.autoSaved'))}</div></aside>
  <main>${isDemo?`<p class="review-note">${esc(tr('ops.demo'))}</p>`:''}${content}</main>`;function empty(title, copy, action = '') { return `<div class="empty"><h3>${title}</h3><p>${copy}</p>${action}</div>`; }
function checkoutSummary(date) {
  const departures = checkoutsOn(byId('reservations'), date).filter(reservation => checkoutCleaningStatus(reservation.apartmentId, date) !== 'ignored');
  const priority = departures.filter(reservation => byId('reservations').some(other => other.apartmentId === reservation.apartmentId && other.checkIn === date)).length;
  return { priority, bonus: departures.length - priority };
}
function checkoutCleaningStatus(apartmentId, date) { return byId('checkoutStates').find(item => item.apartmentId === apartmentId && item.date === date)?.status === 'ignored' ? 'ignored' : (byId('assignments').find(item => item.date === date && item.apartments?.some(apartment => apartment.apartmentId === apartmentId))?.status || 'toPlan'); }
function daySummaryMarkup(date) {
  const summary = checkoutSummary(date);
  if (!summary.priority && !summary.bonus) return '';
  return `<small class="day-cleaning-summary">${esc(tr('cleaning.daySummary', { priority: summary.priority, priorityLabel: priorityLabel(state.language, summary.priority), bonus: summary.bonus, bonusLabel: bonusLabel(state.language, summary.bonus) }))}</small>`;
}
function planningPage() {
  const days = weekDays(state.anchor); const people = orderedStaff(true);
  return shell(`<div class="page-heading"><div><p class="eyebrow">${esc(tr('legacy.dailyOperations'))}</p><h1>${esc(tr('legacy.calendarPlanning'))}</h1><p>${esc(tr('legacy.planAheadThenConfirmWhatWasActuallyCompleted'))}</p></div><div class="toolbar"><button class="secondary" data-nav="-7">${esc(tr('legacy.previous'))}</button><button class="secondary" data-today>${esc(tr('legacy.today'))}</button><button class="secondary" data-nav="7">${esc(tr('legacy.next'))}</button></div></div>
  <div class="week-title">${esc(tr('ops.weekOf'))} ${dateLabel(days[0])} ${days[0].slice(0, 4)} — ${dateLabel(days[6])} ${days[6].slice(0, 4)}</div>
  ${people.length ? `<div class="calendar"><div class="calendar-corner">${esc(tr('legacy.staffMember'))}</div>${days.map(day => `<div class="day-header ${day === localDate(new Date()) ? 'today' : ''}"><strong>${dateLabel(day)}</strong>${daySummaryMarkup(day)}</div>`).join('')}${people.map(person => `<div class="staff-cell"><strong>${esc(person.name)}</strong><small>${formatPLN(staffSummary(person.id, byId('assignments'), byId('payments')).dueGrosz)} ${esc(tr('ops.dueLabel'))}</small></div>${days.map(day => assignmentCell(person, day)).join('')}`).join('')}</div>` : empty(tr('legacy.startWithYourTeam'), tr('legacy.addAStaffMemberThenYouCanAssignApartments'), `<button data-page="staff">${esc(tr('legacy.addStaffMember83'))}</button>`)}`);
}
function assignmentCell(person, date) {
  const job = byId('assignments').find(item => item.staffId === person.id && item.date === date);
  const currentDay = date === localDate(new Date()) ? 'current-day' : '';
  if (!job) return `<button class="assignment blank ${currentDay}" data-assignment="new" data-staff="${person.id}" data-date="${date}">${esc(tr('legacy.plan'))}</button>`;
  const names = job.apartments.map(item => `${esc(item.name)}${item.dogBonus ? ` 🐾` : ''}`).join(', ');
  const priority = job.apartments.some(apartment => byId('reservations').some(reservation => reservation.apartmentId === apartment.apartmentId && reservation.checkOut === date) && byId('reservations').some(reservation => reservation.apartmentId === apartment.apartmentId && reservation.checkIn === date));
  return `<button class="assignment ${job.status} ${currentDay} ${priority ? 'priority-assignment' : ''}" data-assignment="${job.id}" title="${esc(tr('legacy.edit'))} ${names}"><span class="status">${job.status === 'confirmed' ? tr('legacy.confirmed') : tr('legacy.pending')}</span>${priority ? `<span class="priority-flag">${esc(tr('cleaning.priority'))}</span>` : ''}<strong>${names || tr('legacy.noApartments')}</strong><em>${formatPLN(assignmentTotal(job))}</em></button>`;
}
function bookingCategoryOptions() {
  const groups = categories().map(category => ({ id: category.id, name: category.name }));
  if (active('apartments').some(apartment => !(apartment.categoryId || ''))) groups.push({ id: '', name: tr('bookings.uncategorized') });
  return groups;
}
function bookingEventForCell(apartmentId, date) {
  const apartmentReservations = byId('reservations').filter(reservation => reservation.apartmentId === apartmentId);
  const events = apartmentReservations.filter(reservation => reservation.checkIn === date || reservation.checkOut === date);
  const stay = apartmentReservations.find(reservation => reservationEvents(reservation, date).occupied);
  const departure = events.find(reservation => reservation.checkOut === date);
  const priority = Boolean(departure && apartmentReservations.some(reservation => reservation.checkIn === date));
  return { events, stay, departure, priority };
}
function bookingsPage() {
  const groups = bookingCategoryOptions();
  if (state.bookingCategory === null || !groups.some(group => group.id === state.bookingCategory)) state.bookingCategory = groups[0]?.id ?? '';
  const apartments = orderedApartments(active('apartments'), state.bookingCategory);
  const days = monthDays(state.bookingAnchor);
  const selection = state.bookingSelection;
  const emptyState = apartments.length ? bookingTimeline(apartments,days,groups,selection) : `<div class="empty"><h3>${esc(tr('bookings.noApartments'))}</h3></div>`;
  return shell(`<div class="page-heading"><div><p class="eyebrow">${esc(tr('nav.bookings'))}</p><h1>${esc(tr('bookings.title'))}</h1><p>${esc(tr('bookings.subtitle'))}</p></div><div class="toolbar"><button class="secondary" data-bookings-nav="-1">← ${esc(tr('bookings.previous'))}</button><button class="secondary" data-bookings-today>${esc(tr('bookings.today'))}</button><button class="secondary" data-bookings-nav="1">${esc(tr('bookings.next'))} →</button></div></div><div class="booking-month"><h2>${esc(formatBookingMonth(state.language, state.bookingAnchor))}</h2>${selection ? `<div class="booking-selection"><span>${esc(tr('bookings.selectCheckIn', { apartment: find('apartments', selection.apartmentId)?.name || '', date: formatBookingDate(state.language, selection.checkIn) }))}</span><button class="secondary" data-cancel-booking-selection>${esc(tr('bookings.cancelSelection'))}</button></div>` : ''}</div><button class="secondary" data-apartment-order="${esc(state.bookingCategory)}">${esc(tr('ops.order'))}</button><div class="booking-category-tabs" role="tablist">${groups.map(group => `<button class="secondary ${group.id === state.bookingCategory ? 'selected-category' : ''}" data-booking-category="${esc(group.id)}" role="tab" aria-selected="${group.id === state.bookingCategory}">${esc(group.name)}</button>`).join('')}</div>${emptyState}`);
}
function bookingCell(apartment, date) {
  const { events, stay, departure, priority } = bookingEventForCell(apartment.id, date);
  const arrival = events.find(reservation => reservation.checkIn === date);
  const selected = state.bookingSelection?.apartmentId === apartment.id && state.bookingSelection?.checkIn === date;
  const tooltip = reservation => reservation ? tr('bookings.tooltip', { apartment: apartment.name, checkIn: formatBookingDate(state.language, reservation.checkIn), checkOut: formatBookingDate(state.language, reservation.checkOut), nights: nightsBetween(reservation.checkIn, reservation.checkOut), nightLabel: bookingNightLabel(state.language, nightsBetween(reservation.checkIn, reservation.checkOut)) }) : `${apartment.name} · ${formatBookingDate(state.language, date)}`;
  const half = (reservation, role) => `<button class="booking-half ${reservation ? role : 'empty'} ${selected && !reservation ? 'selection-start' : ''}" data-booking-cell="${apartment.id}" data-booking-date="${date}" data-reservation="${reservation?.id || ''}" data-booking-role="${role}" title="${esc(tooltip(reservation))}">${reservation ? esc(role === 'departure' ? tr('bookings.out') : tr('bookings.in')) : ''}</button>`;
  if (arrival || departure) return `<div class="booking-cell event-cell ${priority ? 'priority' : ''}">${half(departure, 'departure')}${half(arrival, 'arrival')}</div>`;
  if (stay) return `<button class="booking-cell booking-stay occupied" data-booking-cell="${apartment.id}" data-booking-date="${date}" data-reservation="${stay.id}" title="${esc(tooltip(stay))}"></button>`;
  return `<button class="booking-cell booking-empty ${selected ? 'selection-start' : ''}" data-booking-cell="${apartment.id}" data-booking-date="${date}" data-reservation="" title="${esc(tooltip(null))}"></button>`;
}
function bindCalendarDateHover() {
  const planning=app.querySelector('.calendar');
  if(planning){const days=weekDays(state.anchor);[...planning.children].forEach((cell,index)=>{const column=index%8;if(column)cell.dataset.hoverDate=days[column-1];});
    const highlight=date=>planning.querySelectorAll('[data-hover-date]').forEach(cell=>cell.classList.toggle('date-hover',Boolean(date)&&cell.dataset.hoverDate===date));
    planning.addEventListener('pointerover',event=>highlight(event.target.closest('[data-hover-date]')?.dataset.hoverDate));planning.addEventListener('pointerleave',()=>highlight(null));
    planning.addEventListener('focusin',event=>highlight(event.target.closest('[data-hover-date]')?.dataset.hoverDate));planning.addEventListener('focusout',()=>highlight(null));
  }
  const timeline=app.querySelector('.timeline');
  if(timeline){const days=monthDays(state.bookingAnchor);timeline.querySelectorAll('.timeline-dates,.timeline-days').forEach(row=>[...row.children].forEach((cell,index)=>cell.dataset.hoverDate=days[index]));let lastDate=null;
    const highlight=date=>{if(date===lastDate)return;lastDate=date;timeline.querySelectorAll('[data-hover-date]').forEach(cell=>cell.classList.toggle('date-hover',Boolean(date)&&cell.dataset.hoverDate===date));};
    timeline.addEventListener('pointermove',event=>{const track=event.target.closest('.timeline-track,.timeline-dates');if(!track){highlight(null);return;}const bounds=track.getBoundingClientRect();const index=Math.floor((event.clientX-bounds.left)/bounds.width*days.length);highlight(days[index]||null);});timeline.addEventListener('pointerleave',()=>highlight(null));
    timeline.addEventListener('focusin',event=>highlight(event.target.closest('[data-booking-date]')?.dataset.bookingDate));timeline.addEventListener('focusout',()=>highlight(null));
  }
}
function bookingDogFields(booking) {return `<label class="booking-dog-toggle"><input type="checkbox" name="hasDog" ${booking.hasDog?'checked':''}/><span>${esc(tr('ops.bookingDog'))}</span></label><small class="muted">${esc(tr('ops.bookingDogHelp'))}</small>`;}
function paymentFields(booking) {
  const payment=customerPayment(booking);
  return `<fieldset class="customer-payment"><legend>${esc(tr('ops.customerPayment'))}</legend><label>${esc(tr('ops.customerPayment'))}<select name="customerStatus"><option value="paid" ${payment.status==='paid'?'selected':''}>${esc(tr('ops.paid'))}</option><option value="cashToCollect" ${payment.status==='cashToCollect'?'selected':''}>${esc(tr('ops.cashToCollect'))}</option></select></label><div data-cash-fields ${payment.status==='paid'?'hidden':''}><label>${esc(tr('ops.cashAmount'))}<input name="customerAmount" inputmode="decimal" value="${payment.amountGrosz ? (payment.amountGrosz/100).toFixed(2):''}" /></label><label>${esc(tr('ops.paymentNote'))}<textarea name="customerNote" maxlength="500">${esc(payment.note)}</textarea></label></div></fieldset>`;
}
function readCustomerPayment(form) {
  const status=form.elements.customerStatus.value;
  try {const payment={status,amountGrosz:status==='paid'?0:toGrosz(form.elements.customerAmount.value),note:form.elements.customerNote.value.trim()};validateCustomerPayment(payment);return payment;}catch{throw new Error(tr('ops.cashRequired'));}
}
function bookingTimeline(apartments,days,groups,selection) {
  const start=days[0],end=addDays(days.at(-1),1),today=localDate(new Date());
  return `<div class="timeline-scroll"><div class="timeline" style="--days:${days.length}"><div class="timeline-head"><div class="timeline-label">${esc(groups.find(group=>group.id===state.bookingCategory)?.name||tr('bookings.uncategorized'))}</div><div class="timeline-dates">${days.map(date=>`<div class="timeline-date ${date===today?'today':''}"><span>${esc(formatBookingWeekday(state.language,date))}</span><strong>${Number(date.slice(-2))}</strong></div>`).join('')}</div></div>${apartments.map(apartment=>`<div class="timeline-row"><div class="timeline-label ${selection?.apartmentId===apartment.id?'selection-apartment':''}" data-user-text>${esc(apartment.name)}</div><div class="timeline-track"><div class="timeline-days">${days.map(date=>`<div class="timeline-day ${date===today?'today':''}">${[0,1].map(half=>`<button class="timeline-empty ${selection?.apartmentId===apartment.id&&selection.checkIn===date?'selection-start':''}" data-booking-cell="${apartment.id}" data-booking-date="${date}" aria-label="${esc(apartment.name)} · ${esc(formatBookingDate(state.language,date))}"></button>`).join('')}</div>`).join('')}</div>${byId('reservations').filter(booking=>booking.apartmentId===apartment.id&&booking.checkIn<end&&booking.checkOut>=start).map(booking=>{const inOffset=nightsBetween(start,booking.checkIn)+.5,outOffset=nightsBetween(start,booking.checkOut)+.5;const left=Math.max(0,inOffset),right=Math.min(days.length,outOffset);if(right<=left)return '';const payment=customerPayment(booking);return `<button class="timeline-stay ${payment.status==='cashToCollect'?'cash':''}" style="left:${left/days.length*100}%;width:${(right-left)/days.length*100}%" data-booking-cell="${apartment.id}" data-booking-date="${booking.checkIn}" data-reservation="${booking.id}" title="${esc(apartment.name)} · ${formatDmy(booking.checkIn)} — ${formatDmy(booking.checkOut)} · ${esc(tr(`ops.${payment.status}`))}${payment.status==='cashToCollect'?` · ${formatPLN(payment.amountGrosz)}`:''}"><span>${byId('reservations').some(other=>other.id!==booking.id&&other.apartmentId===booking.apartmentId&&other.checkOut===booking.checkIn)?'⚡ ':''}${inOffset>=0?esc(tr('bookings.in')):'←'}</span><span class="timeline-payment">${booking.hasDog?'🐾 ':''}${esc(tr(`ops.${payment.status}`))}${payment.status==='cashToCollect'?` · ${formatPLN(payment.amountGrosz)}`:''}</span><span>${outOffset<=days.length?esc(tr('bookings.out')):'→'}</span></button>`;}).join('')}</div></div>`).join('')}</div></div>`;
}
function ownersPage() {
  return shell(`<div class="page-heading"><h1>${esc(tr('ops.owners'))}</h1><button data-add-owner>${esc(tr('ops.addOwner'))}</button></div><div class="owner-filters"><input type="search" data-owner-search aria-label="${esc(tr('ops.searchOwners'))}" placeholder="${esc(tr('ops.searchOwners'))}"/><select data-owner-filter><option value="all">${esc(tr('ops.all'))}</option><option value="active">${esc(tr('ops.active'))}</option><option value="archived">${esc(tr('ops.archived'))}</option></select></div><div class="cards">${byId('owners').length?byId('owners').map(owner=>`<article class="card owner-card" data-owner-card data-active="${owner.active!==false}" data-search="${esc(`${owner.name} ${owner.phone||''} ${owner.email||''}`.toLocaleLowerCase())}"><h2 data-user-text>${esc(owner.name)}</h2><p data-user-text>${esc(owner.phone)} · ${esc(owner.email)}</p><p data-user-text>${esc(owner.address)}</p><p data-user-text>${esc(owner.notes)}</p><p>${byId('apartments').filter(apartment=>apartment.ownerId===owner.id).length} ${esc(tr('reports.apartments'))}</p><div class="card-actions"><button data-edit-owner="${owner.id}" class="secondary">${esc(tr('ops.edit'))}</button><button data-archive-owner="${owner.id}" class="secondary">${esc(tr(owner.active===false?'ops.reactivate':'ops.archive'))}</button><button data-delete-owner="${owner.id}" class="danger">${esc(tr('ops.delete'))}</button></div></article>`).join(''):`<p>${esc(tr('ops.noOwners'))}</p>`}</div>`);
}
function openOwner(owner) {
  modal(tr(owner?'ops.editOwner':'ops.addOwner'),`<form>${[['name','ops.ownerName'],['phone','ops.phone'],['email','ops.email'],['address','ops.address']].map(([name,key])=>`<label>${esc(tr(key))}<input name="${name}" ${name==='email'?'type="email"':''} ${name==='name'?'required':''} maxlength="200" value="${esc(owner?.[name])}" /></label>`).join('')}<label>${esc(tr('ops.notes'))}<textarea name="notes" maxlength="500">${esc(owner?.notes)}</textarea></label><p class="form-error" role="alert"></p></form>`,async form=>{if(!form.reportValidity())return false;const values=Object.fromEntries(['name','phone','email','address','notes'].map(key=>[key,form.elements[key].value.trim()]));if(!values.name)throw Error(tr('ops.ownerRequired'));await save('owners',{...owner,...values,id:owner?.id||id(),active:owner?.active??true,createdAt:owner?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()});},{submit:tr('ops.save')});
}
function ownerSelect(apartment) {
  return `<label>${esc(tr('ops.owner'))}<select name="ownerId"><option value="">${esc(tr('ops.unassigned'))}</option>${byId('owners').filter(owner=>owner.active!==false||owner.id===apartment?.ownerId).map(owner=>`<option value="${owner.id}" ${owner.id===apartment?.ownerId?'selected':''}>${esc(owner.name)}</option>`).join('')}</select></label>`;
}
function deleteOwner(owner) {
  modal(tr('ops.deleteOwner'),`<form><h3 data-user-text>${esc(owner.name)}</h3><p>${esc(tr('ops.deleteOwnerCopy'))}</p><label>${esc(tr('ops.reassign'))}<select name="ownerId"><option value="">${esc(tr('ops.unassigned'))}</option>${active('owners').filter(item=>item.id!==owner.id).map(item=>`<option value="${item.id}">${esc(item.name)}</option>`).join('')}</select></label><p class="form-error" role="alert"></p></form>`,async form=>{const updates=byId('apartments').filter(item=>item.ownerId===owner.id).map(item=>({...item,ownerId:form.elements.ownerId.value}));const tx=store.db.transaction(['apartments','owners'],'readwrite');updates.forEach(item=>tx.objectStore('apartments').put(item));tx.objectStore('owners').delete(owner.id);await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});state.data=migrateOperations(await store.data());render();},{danger:true,submit:tr('ops.delete')});
}
function operationsReportPanels() {
  const start=state.employeeStart||weekDays(state.reportWeek)[0],end=state.employeeEnd||addDays(start,6),selected=state.employeeId||orderedStaff()[0]?.id;
  let count=0;try{count=employeePeriod(state.data,selected,start,end).rows.length;}catch{}
  return `<div class="report-layout"><article class="report-panel"><h2>${esc(tr('ops.employeeReport'))}</h2><label>${esc(tr('ops.employee'))}<select data-employee-id>${orderedStaff().map(person=>`<option value="${person.id}" ${person.id===selected?'selected':''}>${esc(person.name)}</option>`).join('')}</select></label><div class="report-controls"><label>${esc(tr('ops.start'))}<input data-employee-start type="date" value="${start}"/></label><label>${esc(tr('ops.end'))}<input data-employee-end type="date" value="${end}"/></label></div><label><input data-employee-money type="checkbox" ${state.employeeMoney?'checked':''}/> ${esc(tr('ops.includeMoney'))}</label><p data-employee-count>${esc(tr('ops.count',{count}))}</p><div class="report-actions"><button data-ops-pdf="employee-preview">${esc(tr('reports.preview'))}</button><button data-ops-pdf="employee-download" class="secondary">${esc(tr('reports.download'))}</button></div></article><article class="report-panel"><h2>${esc(tr('ops.ownerReport'))}</h2><label>${esc(tr('ops.owner'))}<select data-owner-report><option value="">${esc(tr('ops.chooseOwner'))}</option>${byId('owners').map(owner=>`<option value="${owner.id}" ${owner.id===state.ownerReportId?'selected':''}>${esc(owner.name)}</option>`).join('')}</select></label><label>${esc(tr('reports.month'))}<input data-owner-month type="month" value="${(state.ownerReportMonth||state.reportMonth).slice(0,7)}"/></label><div class="report-nav"><button class="secondary" data-owner-nav="-1">${esc(tr('reports.previousMonth'))}</button><button class="secondary" data-owner-nav="today">${esc(tr('reports.thisMonth'))}</button><button class="secondary" data-owner-nav="1">${esc(tr('reports.nextMonth'))}</button></div><label><input data-owner-charges type="checkbox" ${state.ownerCharges?'checked':''}/> ${esc(tr('ops.includeCharges'))}</label><div class="report-actions"><button data-ops-pdf="owner-preview">${esc(tr('reports.preview'))}</button><button data-ops-pdf="owner-download" class="secondary">${esc(tr('reports.download'))}</button></div></article></div>`;
}
function bindOperations() { document.documentElement.lang=state.language;app.querySelectorAll('[data-owner-nav]').forEach(button=>button.onclick=()=>{const month=new Date(`${state.ownerReportMonth||state.reportMonth}T12:00:00`);if(button.dataset.ownerNav==='today')state.ownerReportMonth=localDate(new Date()).slice(0,7)+'-01';else{month.setMonth(month.getMonth()+Number(button.dataset.ownerNav));state.ownerReportMonth=localDate(month).slice(0,7)+'-01';}render();});
  const fields=[['[data-employee-id]','employeeId'],['[data-employee-start]','employeeStart'],['[data-employee-end]','employeeEnd'],['[data-employee-money]','employeeMoney'],['[data-owner-report]','ownerReportId'],['[data-owner-month]','ownerReportMonth'],['[data-owner-charges]','ownerCharges']];
  for(const [selector,key] of fields){const input=app.querySelector(selector);if(input)input.onchange=()=>{state[key]=input.type==='checkbox'?input.checked:input.type==='month'?input.value+'-01':input.value;const count=app.querySelector('[data-employee-count]');if(count)try{count.textContent=tr('ops.count',{count:employeePeriod(state.data,state.employeeId||orderedStaff()[0]?.id,state.employeeStart||weekDays(state.reportWeek)[0],state.employeeEnd||addDays(state.employeeStart||weekDays(state.reportWeek)[0],6)).rows.length});}catch{count.textContent=tr('ops.invalidPeriod');}};}
  app.querySelectorAll('[data-ops-pdf]').forEach(button=>button.onclick=()=>reportAction(button,async()=>{const kind=button.dataset.opsPdf,report=kind.startsWith('employee')?await createEmployeePeriodPdf({data:state.data,staffId:state.employeeId||orderedStaff()[0]?.id,start:state.employeeStart||weekDays(state.reportWeek)[0],end:state.employeeEnd||addDays(state.employeeStart||weekDays(state.reportWeek)[0],6),includeMoney:Boolean(state.employeeMoney),language:state.language,labels:reportLabels()}):await createOwnerMonthlyPdf({data:state.data,ownerId:state.ownerReportId,monthStart:state.ownerReportMonth||state.reportMonth,includeCharges:Boolean(state.ownerCharges),language:state.language,labels:reportLabels()});if(kind.endsWith('preview'))await openPdfPreview(report);else downloadBlob(report.blob,report.fileName);}));

  const search=app.querySelector('[data-owner-search]'),filter=app.querySelector('[data-owner-filter]');
  const apply=()=>app.querySelectorAll('[data-owner-card]').forEach(card=>{card.hidden=!card.dataset.search.includes(search.value.trim().toLocaleLowerCase()) || filter.value!=='all' && card.dataset.active!==String(filter.value==='active');});
  if(search){search.oninput=apply;filter.onchange=apply;}
}
function openCleaningSettings() {
  const amount=find('settings','dogBonus')?.amountGrosz||0;
  modal(tr('ops.settings'),`<form><label>${esc(tr('ops.defaultDog'))}<input name="amount" inputmode="decimal" value="${(amount/100).toFixed(2)}"/></label><p class="form-error" role="alert"></p></form>`,async form=>{let amountGrosz;try{amountGrosz=toGrosz(form.elements.amount.value);}catch{throw Error(tr('ops.bonusInvalid'));}await save('settings',{id:'dogBonus',amountGrosz});},{submit:tr('ops.save')});
}
function installDogFields(dialog,options) {
  for(const row of dialog.querySelectorAll('[data-apartment-option]')) {
    const selected=row.querySelector('input[name=apartment]'),option=options.find(item=>item.id===selected.value);
    const holder=document.createElement('div');holder.className='dog-fields';holder.innerHTML=`<label class="dog-toggle"><input type="checkbox" data-dog ${option.snapshot.dogBonus?'checked':''}/><span>${esc(tr('ops.dog'))}</span></label><label class="dog-amount"><span>${esc(tr('ops.dogAmount'))}</span><input data-dog-amount inputmode="decimal" value="${((option.snapshot.dogBonus?option.snapshot.dogBonusGrosz:find('settings','dogBonus')?.amountGrosz||0)/100).toFixed(2)}"/></label><small data-dog-breakdown></small>`;
    row.append(holder);
    const update=()=>{holder.hidden=!selected.checked;const dog=holder.querySelector('[data-dog]');holder.querySelector('[data-dog-amount]').disabled=!dog.checked;try{const bonus=dog.checked?toGrosz(holder.querySelector('[data-dog-amount]').value):0;holder.querySelector('[data-dog-breakdown]').textContent=tr('ops.bonusBreakdown',{base:formatPLN(option.snapshot.priceGrosz),bonus:formatPLN(bonus),total:formatPLN(option.snapshot.priceGrosz+bonus)});}catch{holder.querySelector('[data-dog-breakdown]').textContent=tr('ops.bonusInvalid');}};
    holder.onclick=event=>event.stopPropagation();holder.oninput=update;dialog.addEventListener('cleanflow-language',update);selected.addEventListener('change',()=>{update();dialog.querySelector('[data-assignment-search]')?.dispatchEvent(new Event('input',{bubbles:true}));});update();
  }
}
function readCleaningSnapshot(input,options) {
  const snapshot=options.find(option=>option.id===input.value).snapshot, holder=input.closest('[data-apartment-option]').querySelector('.dog-fields'), enabled=holder.querySelector('[data-dog]').checked;
  try{return withDogBonus(snapshot,enabled,enabled?toGrosz(holder.querySelector('[data-dog-amount]').value):0);}catch{throw Error(tr('ops.bonusInvalid'));}
}
function openApartmentOrder(categoryId) {
  const items=orderedApartments(active('apartments'),categoryId);const original=items.map(item=>item.id);let current=[...original];let dirty=false;
  const root=modal(tr('ops.order'),`<form><p>${esc(tr('ops.orderHelp'))}</p><p class="order-dirty" hidden>${esc(tr('ops.orderDirty'))}</p><div class="order-list">${items.map(item=>`<div class="order-card" data-order-id="${item.id}"><span class="drag-handle" role="button" tabindex="0" aria-label="${esc(tr('ops.drag'))}">⠿</span><strong data-user-text>${esc(item.name)}<small>${esc(item.reference)}</small></strong><button type="button" class="secondary" data-order-move="-1" aria-label="${esc(tr('ops.up'))}">↑</button><button type="button" class="secondary" data-order-move="1" aria-label="${esc(tr('ops.down'))}">↓</button></div>`).join('')}</div><p class="form-error" role="alert"></p></form>`,async()=>{if(!dirty)return;const updates=current.map((key,index)=>({...find('apartments',key),sortOrder:index}));const tx=store.db.transaction('apartments','readwrite');updates.forEach(item=>tx.objectStore('apartments').put(item));await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});state.data.apartments=byId('apartments').map(item=>updates.find(update=>update.id===item.id)||item);toast(tr('ops.orderSaved'));render();},{submit:tr('ops.save')});
  const orderModal=root.querySelector('.modal');orderModal.classList.add('order-modal');
  const actions=root.querySelector('footer');actions.classList.add('order-top-actions');orderModal.insertBefore(actions,root.querySelector('.modal-body'));
  const list=root.querySelector('.order-list');
  const changed=()=>{current=[...list.querySelectorAll('[data-order-id]')].map(card=>card.dataset.orderId);dirty=current.join()!==original.join();root.querySelector('.order-dirty').hidden=!dirty;};
  const reflow=action=>{const rects=new Map([...list.children].map(card=>[card,card.getBoundingClientRect()]));action();for(const card of list.children){const before=rects.get(card);if(!before)continue;const after=card.getBoundingClientRect();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)card.animate([{transform:`translate(${before.left-after.left}px,${before.top-after.top}px)`},{transform:'translate(0,0)'}],{duration:180,easing:'ease-out'});}changed();};
  list.onclick=event=>{const button=event.target.closest('[data-order-move]');if(!button)return;const card=button.closest('[data-order-id]');reflow(()=>{if(Number(button.dataset.orderMove)<0&&card.previousElementSibling)list.insertBefore(card,card.previousElementSibling);else if(card.nextElementSibling)list.insertBefore(card.nextElementSibling,card);});};
  list.onpointerdown=event=>{const handle=event.target.closest('.drag-handle');if(!handle||event.button!==0)return;event.preventDefault();const card=handle.closest('[data-order-id]'),rect=card.getBoundingClientRect(),ghost=card.cloneNode(true),placeholder=document.createElement('div');ghost.classList.add('order-ghost');ghost.style.width=`${rect.width}px`;ghost.style.left=`${rect.left}px`;ghost.style.top=`${rect.top}px`;placeholder.className='order-placeholder';placeholder.style.height=`${rect.height}px`;card.replaceWith(placeholder);document.body.append(ghost);const offset=event.clientY-rect.top;const move=ev=>{ghost.style.top=`${ev.clientY-offset}px`;const target=[...list.querySelectorAll('[data-order-id]')].find(item=>{const bounds=item.getBoundingClientRect();return ev.clientY>=bounds.top&&ev.clientY<=bounds.bottom;});if(target)reflow(()=>{const bounds=target.getBoundingClientRect();list.insertBefore(placeholder,ev.clientY<bounds.top+bounds.height/2?target:target.nextSibling);});};const finish=ev=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);ghost.remove();placeholder.replaceWith(card);if(ev.type==='pointercancel'){original.forEach(key=>list.append(list.querySelector(`[data-order-id="${key}"]`)));}changed();};window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);};
  root.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>{if(!dirty||window.confirm(tr('ops.discard')))root.remove();});
}
function reservationMessage(error) {
  if (/^Reservation conflicts with /.test(error.message || '')) return tr('bookings.conflict', { details: error.message.replace(/^Reservation conflicts with /, '') });
  return tr('bookings.invalidDate');
}
function handleBookingCell(apartmentId, date, reservationId) {
  const selected = state.bookingSelection;
  if (selected) {
    if (selected.apartmentId !== apartmentId) { state.bookingSelection = null; toast(tr('bookings.selectionCancelled'), 'warning'); render(); return; }
    if (date === selected.checkIn) { state.bookingSelection = null; toast(tr('bookings.sameDate'), 'warning'); render(); return; }
    if (date < selected.checkIn) { state.bookingSelection = null; toast(tr('bookings.checkoutAfter'), 'warning'); render(); return; }
    const apartment = find('apartments', apartmentId);
    const candidate = { id: id(), apartmentId, apartmentName: apartment?.name || '', categoryId: apartment?.categoryId || '', categoryName: categoryName(apartment?.categoryId), checkIn: selected.checkIn, checkOut: date, notes: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    state.bookingSelection = null;
    render();
    modal(tr('bookings.createTitle'), `<form><p>${esc(tr('bookings.createSummary', { apartment: candidate.apartmentName, checkIn: formatBookingDate(state.language, candidate.checkIn), checkOut: formatBookingDate(state.language, candidate.checkOut), nights: nightsBetween(candidate.checkIn, candidate.checkOut), nightLabel: bookingNightLabel(state.language, nightsBetween(candidate.checkIn, candidate.checkOut)) }))}</p><label>${esc(tr('bookings.notes'))}<textarea name="notes" maxlength="500"></textarea></label>${bookingDogFields(candidate)}${paymentFields(candidate)}<p class="form-error" role="alert"></p></form>`, async form => { const next = { ...candidate, hasDog:form.elements.hasDog.checked, dogBonusGrosz:form.elements.hasDog.checked?(find('settings','dogBonus')?.amountGrosz||0):0, notes: form.elements.notes.value.trim(), customerPayment: readCustomerPayment(form) }; try { validateReservationRecord(next, byId('reservations')); } catch (error) { throw new Error(reservationMessage(error)); } await save('reservations', next); toast(tr('bookings.saved')); }, { submit: tr('bookings.create') });
    return;
  }
  if (reservationId) { openBookingDetails(find('reservations', reservationId)); return; }
  state.bookingSelection = { apartmentId, checkIn: date };
  toast(tr('bookings.selectCheckIn', { apartment: find('apartments', apartmentId)?.name || '', date: formatBookingDate(state.language, date) }));
  render();
}
function openBookingDetails(reservation) {
  if (!reservation) return;
  const apartment = find('apartments', reservation.apartmentId);
  const status = checkoutCleaningStatus(reservation.apartmentId, reservation.checkOut);
  const root = modal(tr('bookings.details'), `<form><div class="detail-list"><h3>${esc(reservation.apartmentName || apartment?.name || '')}</h3><p><strong>${esc(tr('bookings.category'))}:</strong> ${esc(reservation.categoryName || categoryName(reservation.categoryId || apartment?.categoryId))}</p><p><strong>${esc(tr('bookings.checkIn'))}:</strong> ${esc(formatBookingDate(state.language, reservation.checkIn))}</p><p><strong>${esc(tr('bookings.checkOut'))}:</strong> ${esc(formatBookingDate(state.language, reservation.checkOut))} · ${nightsBetween(reservation.checkIn, reservation.checkOut)} ${esc(bookingNightLabel(state.language, nightsBetween(reservation.checkIn, reservation.checkOut)))}</p>${reservation.hasDog?`<p>🐾 ${esc(tr('ops.bookingDog'))}</p>`:''}<p><strong>${esc(tr('ops.customerPayment'))}:</strong> ${esc(tr(`ops.${customerPayment(reservation).status}`))}${customerPayment(reservation).status==='cashToCollect'?` · ${formatPLN(customerPayment(reservation).amountGrosz)}`:''}</p><p data-user-text>${esc(customerPayment(reservation).note)}</p><p><strong>${esc(tr('bookings.notes'))}:</strong> ${esc(reservation.notes || '—')}</p><p><strong>${esc(tr('cleaning.departure'))}:</strong> ${esc(tr(`cleaning.${status}`))}</p></div><p class="form-error" role="alert"></p></form>`, async () => {}, { submit: tr('bookings.edit') });
  root.querySelector('footer [data-close]').remove();
  root.querySelector('[data-submit]').onclick = () => { root.remove(); openBookingEditor(reservation); };
  const deleteButton = document.createElement('button'); deleteButton.className = 'danger'; deleteButton.textContent = tr('bookings.delete'); deleteButton.onclick = () => { root.remove(); deleteBooking(reservation); }; root.querySelector('footer').append(deleteButton);
  if (status !== 'ignored') { const ignoreButton = document.createElement('button'); ignoreButton.className = 'secondary'; ignoreButton.textContent = tr('bookings.ignore'); ignoreButton.onclick = () => { root.remove(); ignoreCheckout(reservation); }; root.querySelector('footer').prepend(ignoreButton); }
}
function openBookingEditor(reservation) {
  modal(tr('bookings.editTitle'), `<form><label>${esc(tr('bookings.checkIn'))}<input name="checkIn" inputmode="numeric" maxlength="10" placeholder="DD/MM/YYYY" value="${formatDmy(reservation.checkIn)}" required /><small>${esc(tr('bookings.dateHelp'))}</small></label><label>${esc(tr('bookings.checkOut'))}<input name="checkOut" inputmode="numeric" maxlength="10" placeholder="DD/MM/YYYY" value="${formatDmy(reservation.checkOut)}" required /></label><label>${esc(tr('bookings.notes'))}<textarea name="notes" maxlength="500">${esc(reservation.notes)}</textarea></label>${bookingDogFields(reservation)}${paymentFields(reservation)}<p class="form-error" role="alert"></p></form>`, async form => { const checkIn = parseDmy(form.elements.checkIn.value); const checkOut = parseDmy(form.elements.checkOut.value); if (!checkIn || !checkOut) throw new Error(tr('bookings.invalidDate')); const payment=readCustomerPayment(form);if(JSON.stringify(payment)!==JSON.stringify(customerPayment(reservation))&&!window.confirm(tr('ops.paymentChanged')))return false;const next = { ...reservation, hasDog:form.elements.hasDog.checked, dogBonusGrosz:form.elements.hasDog.checked?(reservation.hasDog?reservation.dogBonusGrosz??find('settings','dogBonus')?.amountGrosz??0:find('settings','dogBonus')?.amountGrosz||0):0, customerPayment:payment, checkIn, checkOut, notes: form.elements.notes.value.trim(), updatedAt: new Date().toISOString() }; try { validateReservationRecord(next, byId('reservations'), reservation.id); } catch (error) { throw new Error(reservationMessage(error)); } await save('reservations', next); toast(tr('bookings.updated')); }, { submit: tr('bookings.saveDates') });
}
function deleteBooking(reservation) {
  modal(tr('bookings.deleteTitle'), `<form><p>${esc(tr('bookings.deleteCopy', { apartment: reservation.apartmentName || find('apartments', reservation.apartmentId)?.name || '', checkIn: formatBookingDate(state.language, reservation.checkIn), checkOut: formatBookingDate(state.language, reservation.checkOut) }))}</p><p class="form-error" role="alert"></p></form>`, async () => { await remove('reservations', reservation.id); toast(tr('bookings.deleted')); }, { danger: true, submit: tr('bookings.confirmDelete') });
}
function ignoreCheckout(reservation) {
  modal(tr('bookings.ignoreTitle'), `<form><p>${esc(tr('bookings.ignoreCopy', { apartment: reservation.apartmentName || find('apartments', reservation.apartmentId)?.name || '', date: formatBookingDate(state.language, reservation.checkOut) }))}</p><p class="form-error" role="alert"></p></form>`, async () => { await save('checkoutStates', { id: `checkout-${reservation.id}`, apartmentId: reservation.apartmentId, date: reservation.checkOut, status: 'ignored', createdAt: new Date().toISOString() }); }, { submit: tr('bookings.confirmIgnore') });
}
function staffPage() {
  const people = orderedStaff();
  return shell(`<div class="page-heading"><div><p class="eyebrow">${esc(tr('legacy.people'))}</p><h1>${esc(tr('legacy.staff'))}</h1><p>${esc(tr('legacy.contactDetailsAndPaymentPreferencesForYourCleaningTeam'))}</p></div><button data-add-staff>${esc(tr('legacy.addStaffMember'))}</button></div><p class="staff-order-help"><strong>${esc(tr('legacy.orderInCalendar'))}</strong><span> ${esc(tr('legacy.newStaffAreAddedAtTheEndDragThe'))}</span></p><div class="cards staff-cards">${people.length ? people.map(person => `<article class="card ${person.active === false ? 'inactive' : ''}" data-staff-card data-staff-id="${person.id}"><div class="staff-card-heading"><div><h2>${esc(person.name)}</h2><span class="pill">${person.active === false ? tr('legacy.archived') : tr('legacy.active')}</span></div><span class="drag-handle" data-drag-staff="${person.id}" role="button" aria-label="${esc(tr('legacy.dragToReorder'))}" title="${esc(tr('legacy.dragToReorder'))}">⠿</span></div><dl class="staff-details"><div><dt>${esc(tr('legacy.phone'))}</dt><dd>${esc(person.phone || '—')}</dd></div><div><dt>${esc(tr('legacy.preferredPaymentMethod'))}</dt><dd>${esc(person.paymentMethod || tr('legacy.notSet'))}</dd></div></dl>${person.notes ? `<p class="staff-note">${esc(person.notes)}</p>` : ''}<div class="card-actions"><button class="secondary" data-edit-staff="${person.id}">${esc(tr('legacy.edit'))}</button><button class="secondary" data-archive-staff="${person.id}">${person.active === false ? tr('legacy.reactivate') : tr('legacy.archive')}</button></div></article>`).join('') : empty(tr('legacy.noStaffYet'), tr('legacy.addThePeopleWhoCarryOutCleaningAssignments'), `<button data-add-staff>${esc(tr('legacy.addYourFirstStaffMember'))}</button>`)}</div>`);
}function apartmentCard(item) {
  const category = categoryName(item.categoryId);
  const owner = state.data.owners.find(owner=>owner.id===item.ownerId)?.name || tr('ops.unassigned');
  return `<article class="card apartment-card ${item.active === false ? 'inactive' : ''}" data-apartment-card data-search="${esc(`${item.name} ${item.reference} ${item.notes} ${category}`).toLowerCase()}"><div><h2>${esc(item.name)}</h2><span class="pill">${item.active === false ? tr('legacy.archived') : tr('legacy.active')}</span></div><div class="apartment-summary"><p class="apartment-category">${esc(category)}</p><p class="apartment-owner"><small>${esc(tr('v2.owner'))}</small><strong data-user-text>${esc(owner)}</strong></p></div><p class="apartment-reference">${esc(item.reference || tr('legacy.noAddressOrInternalReference'))}</p><strong class="price">${formatPLN(item.priceGrosz)} <small>${esc(tr('legacy.perClean'))}</small></strong><div class="card-actions"><button class="secondary" data-apartment-details="${item.id}">${esc(tr('legacy.details'))}</button><button class="secondary" data-edit-apartment="${item.id}">${esc(tr('legacy.edit'))}</button><button class="secondary" data-archive-apartment="${item.id}">${item.active === false ? tr('legacy.reactivate') : tr('legacy.archive')}</button></div></article>`;
}
function apartmentsPage() {
  const apartmentList = byId('apartments');
  const groups = [...categories().map(category => ({ id: category.id, name: category.name })), { id: '', name: 'Uncategorized' }].map(group => ({ ...group, apartments: apartmentList.filter(item => (item.categoryId || '') === group.id) })).filter(group => group.apartments.length);
  return shell(`<div class="page-heading"><div><p class="eyebrow">${esc(tr('legacy.locations'))}</p><h1>${esc(tr('legacy.apartments'))}</h1><p>${esc(tr('legacy.organiseApartmentsInYourOwnCategoriesWhilePlanningStays'))}</p></div><div class="toolbar"><button class="secondary" data-manage-categories>${esc(tr('legacy.manageCategories'))}</button><button data-add-apartment>${esc(tr('legacy.addApartment'))}</button><button class="secondary" data-cleaning-settings>${esc(tr('ops.settings'))}</button></div></div><div class="category-overview"><strong>${esc(tr('legacy.apartmentCategories'))}</strong>${categories().length ? categories().map(category => `<span class="pill">${esc(category.name)}</span>`).join('') : `<span class="muted">${esc(tr('legacy.noCategoriesYet'))}</span>`}</div><label class="search-field"><span>${esc(tr('legacy.searchApartments'))}</span><input data-apartment-search type="search" placeholder="${esc(tr('legacy.searchByApartmentNameOrAddress'))}" /></label>${apartmentList.length ? `<div class="apartment-groups">${groups.map(group => `<section class="apartment-group" data-category-section><h2>${esc(group.name)} <span>${group.apartments.length}</span></h2><div class="cards">${group.apartments.map(apartmentCard).join('')}</div></section>`).join('')}<div class="empty search-empty" hidden><h3>${esc(tr('legacy.noApartmentsFound'))}</h3></div></div>` : empty(tr('legacy.noApartmentsYet'), tr('legacy.addApartmentsAndTheirCleaningPricesBeforePlanningWork'), `<button data-add-apartment>${esc(tr('legacy.addYourFirstApartment'))}</button>`)}`);
}function reportLabels() { return { status: { final: tr('reports.final'), temporary: tr('reports.temporary'), forecast: tr('reports.forecast') }, statusCopy: { final: tr('reports.finalCopy'), temporary: tr('reports.temporaryCopy'), forecast: tr('reports.forecastCopy') }, weeklyTitle: tr('reports.staffWeekly'), period: tr('reports.period'), generated: tr('reports.generated'), page: tr('reports.page'), summary: tr('reports.summary'), planned: tr('reports.planned'), confirmed: tr('reports.confirmed'), expected: tr('reports.expected'), real: tr('reports.real'), payments: tr('reports.payments'), due: tr('reports.due'), date: tr('reports.date'), apartment: tr('reports.apartment'), apartmentCategory: tr('reports.apartmentCategory'), statusLabel: tr('reports.status'), amount: tr('reports.amount'), method: tr('reports.method'), notes: tr('reports.notes'), noStaff: tr('reports.noStaff'), noCleanings: tr('reports.noCleanings'), apartments: tr('reports.apartments'), stays: tr('reports.stays'), checkIns: tr('reports.checkIns'), checkOuts: tr('reports.checkOuts'), checkIn: tr('bookings.checkIn'), checkOut: tr('bookings.checkOut'), nights: tr('reports.nights'), turnovers: tr('reports.turnovers'), noApartments: tr('reports.noApartments'), noBookings: tr('reports.noBookings'), none: tr('reports.none'), cleaning: tr('reports.cleaning'), ignored: tr('reports.ignored'), cleaningToPlan: tr('reports.cleaningToPlan'), priorityTurnover: tr('reports.priorityTurnover'), uncategorized: tr('reports.uncategorized'), weeklyFile: tr('reports.weeklyFile') }; }
function reportStatusMarkup(status) { return `<p class="report-status ${status}"><strong>${esc(tr(`reports.${status}`))}</strong><span>${esc(tr(`reports.${status}Copy`))}</span></p>`; }
function reportsPage(){return shell(v2.reportCatalog());}
async function openPdfPreview(report) { if(/mac/i.test(navigator.platform||'')&&window.webkit?.messageHandlers?.cleanflowPDF){ const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(report.blob);});window.webkit.messageHandlers.cleanflowPDF.postMessage({dataUrl,title:tr('reports.previewTitle')});return;}  const root=document.createElement('div'); root.className='modal-backdrop report-preview-backdrop'; const url=URL.createObjectURL(report.blob); root.innerHTML=`<section class="modal report-preview" role="dialog" aria-modal="true" aria-label="${esc(tr('reports.previewTitle'))}"><header><h2>${esc(tr('reports.previewTitle'))}</h2><button class="icon" data-close aria-label="${esc(tr('reports.close'))}">×</button></header><div class="pdf-frame"><iframe title="${esc(tr('reports.previewTitle'))}" src="${url}"></iframe></div><footer><button class="secondary" data-print>${esc(tr('reports.print'))}</button><button data-download>${esc(tr('reports.download'))}</button></footer></section>`; const close=()=>{URL.revokeObjectURL(url);root.remove();}; root.querySelector('[data-close]').onclick=close; root.querySelector('[data-download]').onclick=()=>downloadBlob(report.blob,report.fileName); root.querySelector('[data-print]').onclick=()=>root.querySelector('iframe').contentWindow?.print(); document.body.append(root); }
async function createWeeklyReport() { return createWeeklyStaffPdf({ data: state.data, weekStart: state.reportWeek, language: state.language, labels: reportLabels() }); }
async function createCategoryReport() { if (state.reportCategory === 'all') throw new Error(tr('reports.emptyCategories')); return createCategoryBookingsPdf({ data: state.data, monthStart: state.reportMonth, categoryId: state.reportCategory, language: state.language, labels: reportLabels() }); }
async function generateAllCategoryReports() { const groups=bookingCategoryOptions(); if(!groups.length) throw new Error(tr('reports.emptyCategories')); const reports=[]; for(const group of groups) reports.push(await createCategoryBookingsPdf({data:state.data,monthStart:state.reportMonth,categoryId:group.id,language:state.language,labels:reportLabels()})); state.generatedCategoryReports=reports; state.generatedCategoryReports.monthStart=state.reportMonth; toast(tr('reports.readyAll',{count:reports.length})); render(); }
async function reportAction(button, action) { const original=button.textContent; const wasDisabled=button.disabled; button.disabled=true; button.textContent=tr('reports.generating'); try { await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));await action(); } catch(error) { console.error(error); toast(error.message || tr('reports.error'),'warning'); } finally { if(document.body.contains(button)){button.disabled=wasDisabled;button.textContent=original;} } }function balancesPage() { return shell(`<div class="page-heading"><div><p class="eyebrow">${esc(tr('legacy.payrollControl'))}</p><h1>${esc(tr('legacy.balancesPayments'))}</h1><p>${esc(tr('legacy.plannedJobsDoNotAffectTheRealBalanceUntil'))}</p></div></div><div class="balance-list">${byId('staff').length ? byId('staff').map(person => { const summary=staffSummary(person.id,byId('assignments'),byId('payments')); const payments=byId('payments').filter(item=>item.staffId===person.id).sort((a,b)=>b.date.localeCompare(a.date)); const latest=payments[0]; return `<article class="balance-card ${person.active===false?'inactive':''}"><div class="balance-heading"><div><h2>${esc(person.name)}</h2><span class="pill">${person.active===false?tr('legacy.archived'):tr('legacy.active')}</span></div><button data-payment="${person.id}">${esc(tr('legacy.recordPayment'))}</button></div><dl class="balance-summary"><div><dt>${esc(tr('legacy.realBalanceDue'))}</dt><dd class="due">${formatPLN(summary.dueGrosz)}</dd></div><div><dt>${esc(tr('legacy.confirmedEarnings'))}</dt><dd>${formatPLN(summary.confirmedGrosz)}</dd></div><div><dt>${esc(tr('legacy.totalPaid'))}</dt><dd>${formatPLN(summary.paidGrosz)}</dd></div><div><dt>${esc(tr('legacy.expectedUnconfirmed'))}</dt><dd class="pending">${formatPLN(summary.expectedGrosz)}</dd></div></dl><div class="latest-payment"><div><strong>${esc(tr('legacy.latestPayment'))}</strong><span>${latest?`${esc(latest.date)} · ${esc(latest.method||tr('v2.noMethod'))}${latest.note?` · ${esc(latest.note)}`:''}`:tr('legacy.noPaymentsRecorded')}</span></div>${latest?`<strong>−${formatPLN(latest.amountGrosz)}</strong>`:''}</div><button class="secondary history-button" data-payment-history="${person.id}">${tr('payments.historyButton',{count:payments.length})}</button></article>`; }).join('') : empty(tr('legacy.noStaffYet'),tr('legacy.addStaffToTrackTheirBalances'))}</div>`); }function backupPage() { return shell(`<div class="page-heading"><div><p class="eyebrow">${esc(tr('legacy.dataOwnership'))}</p><h1>${esc(tr('legacy.backupRestore'))}</h1><p>${esc(tr('legacy.yourDataStaysOnThisDeviceUntilYouExport'))}</p></div></div><div class="cards two"><article class="card"><h2>${esc(tr('legacy.exportFullBackup'))}</h2><p>${esc(tr('legacy.downloadStaffApartmentsAssignmentsPaymentsSettingsAndMetadata'))}</p><button data-export>${esc(tr('legacy.downloadBackup'))}</button></article><article class="card"><h2>${esc(tr('legacy.importABackup'))}</h2><p>${esc(tr('legacy.validateACleanflowJsonFileBeforeReplacingTheCurrent'))}</p><input id="import-file" type="file" accept="application/json,.json" hidden /><div class="backup-file-picker"><button class="secondary" type="button" data-import-file>${esc(tr('backup.chooseFile'))}</button><span data-import-file-name>${esc(tr('backup.noFile'))}</span></div><button class="secondary" data-import>${esc(tr('legacy.reviewImport'))}</button></article><article class="card danger-card"><h2>${esc(tr('legacy.deleteAllAppData'))}</h2><p>${esc(tr('legacy.permanentlyRemoveAllStaffApartmentsPlansCompletedWorkPayments'))}</p><button class="danger" data-reset>${esc(tr('legacy.deleteAllData'))}</button></article></div>`); }
function aboutPage(){return shell(v2.about());}function render() { setMoneyLanguage(state.language);app.innerHTML = ({ planning: planningPage, staff: staffPage, apartments: apartmentsPage, bookings: bookingsPage, balances: balancesPage, backup: backupPage, reports: reportsPage, owners: ownersPage, about: aboutPage })[state.page](); bind(); v2.onRender(); localize(app); }
function bind() {
  app.onclick = event => {
    const button = event.target.closest('button');
    if (!button || !app.contains(button) || button.disabled) return;
    if (button.dataset.page) { state.page = button.dataset.page; render(); return; }
    if (button.dataset.language) { v2.updatePreferences({language:button.dataset.language}).then(()=>document.querySelectorAll('.modal-backdrop,#toast-region').forEach(root=>{localize(root);root.dispatchEvent(new Event('cleanflow-language'));})).catch(()=>{}); return; }
    if (button.dataset.nav) { state.anchor = addDays(state.anchor, Number(button.dataset.nav)); render(); return; }
    if (button.matches('[data-today]')) { state.anchor = localDate(new Date()); render(); return; }
    if (button.dataset.bookingsNav) { const month = new Date(`${state.bookingAnchor}T12:00:00`); month.setMonth(month.getMonth() + Number(button.dataset.bookingsNav)); state.bookingAnchor = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-01`; render(); return; }
    if (button.matches('[data-bookings-today]')) { state.bookingAnchor = `${localDate(new Date()).slice(0, 7)}-01`; render(); return; }
    if (button.dataset.reportWeekNav) { state.reportWeek=addDays(state.reportWeek,Number(button.dataset.reportWeekNav)); render(); return; }
    if (button.matches('[data-report-week-today]')) { state.reportWeek=localDate(new Date()); render(); return; }
    if (button.dataset.reportMonthNav) { const date=new Date(`${state.reportMonth}T12:00:00`); date.setMonth(date.getMonth()+Number(button.dataset.reportMonthNav)); state.reportMonth=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-01`; state.generatedCategoryReports=null; render(); return; }
    if (button.matches('[data-report-month-today]')) { state.reportMonth=`${localDate(new Date()).slice(0,7)}-01`; state.generatedCategoryReports=null; render(); return; }
    if (button.matches('[data-report-preview-week]')) { reportAction(button,async()=>openPdfPreview(await createWeeklyReport())); return; }
    if (button.matches('[data-report-download-week]')) { reportAction(button,async()=>{const report=await createWeeklyReport();downloadBlob(report.blob,report.fileName);}); return; }
    if (button.matches('[data-report-preview-category]')) { reportAction(button,async()=>openPdfPreview(await createCategoryReport())); return; }
    if (button.matches('[data-report-download-category]')) { reportAction(button,async()=>{const report=await createCategoryReport();downloadBlob(report.blob,report.fileName);}); return; }
    if (button.matches('[data-report-generate-all]')) { reportAction(button,()=>generateAllCategoryReports()); return; }
    if (button.matches('[data-report-download-all]')) { reportAction(button,async()=>{const zip=await createCategoryZip(state.generatedCategoryReports,`${tr('reports.categoryMonthly')} — ${formatBookingMonth(state.language,state.reportMonth)}`);downloadBlob(zip.blob,zip.fileName);}); return; }
    if (button.dataset.apartmentOrder !== undefined) { openApartmentOrder(button.dataset.apartmentOrder); return; }
    if (button.matches('[data-add-owner]')) { openOwner(); return; }
    if (button.dataset.editOwner) { openOwner(find('owners',button.dataset.editOwner)); return; }
    if (button.dataset.archiveOwner) { const owner=find('owners',button.dataset.archiveOwner); save('owners',{...owner,active:owner.active===false,updatedAt:new Date().toISOString()}); return; }
    if (button.dataset.deleteOwner) { deleteOwner(find('owners',button.dataset.deleteOwner)); return; }
    if (button.matches('[data-cleaning-settings]')) { openCleaningSettings(); return; }
    if (button.dataset.bookingCategory !== undefined) { state.bookingCategory = button.dataset.bookingCategory; state.bookingSelection = null; render(); return; }
    if (button.matches('[data-cancel-booking-selection]')) { state.bookingSelection = null; render(); return; }
    if (button.dataset.bookingCell) { handleBookingCell(button.dataset.bookingCell, button.dataset.bookingDate, button.dataset.reservation || null); return; }
    if (button.dataset.assignment) { openAssignment(button.dataset.assignment === 'new' ? null : find('assignments', button.dataset.assignment), button.dataset.staff, button.dataset.date); return; }
    if (button.matches('[data-add-staff]')) { openStaff(); return; }
    if (button.dataset.editStaff) { openStaff(find('staff', button.dataset.editStaff)); return; }
    if (button.dataset.archiveStaff) { toggleArchive('staff', find('staff', button.dataset.archiveStaff), 'staff member'); return; }
    if (button.matches('[data-add-apartment]')) { openApartment(); return; }
    if (button.matches('[data-manage-categories]')) { manageCategories(); return; }
    if (button.dataset.editApartment) { openApartment(find('apartments', button.dataset.editApartment)); return; }
    if (button.dataset.apartmentDetails) { apartmentDetails(find('apartments', button.dataset.apartmentDetails)); return; }
    if (button.dataset.archiveApartment) { toggleArchive('apartments', find('apartments', button.dataset.archiveApartment), 'apartment'); return; }
    if (button.dataset.payment) { openPayment(button.dataset.payment); return; }
    if (button.dataset.paymentHistory) { paymentHistory(button.dataset.paymentHistory); return; }
    if (button.matches('[data-export]')) { exportBackup(); return; }
    if (button.matches('[data-import-file]')) { app.querySelector('#import-file')?.click(); return; }
    if (button.matches('[data-import]')) { importBackup(); return; }
    if (button.matches('[data-reset]')) { resetAll(); }
  };
  bindOperations();
  bindCalendarDateHover();
  const importFile=app.querySelector('#import-file'); if(importFile) importFile.onchange=()=>{const label=app.querySelector('[data-import-file-name]');if(label) label.textContent=importFile.files[0]?.name||tr('backup.noFile');};
  const reportWeekInput=app.querySelector('[data-report-week-input]'); if(reportWeekInput) reportWeekInput.onchange=()=>{state.reportWeek=reportWeekInput.value||localDate(new Date());render();};
  const reportMonthInput=app.querySelector('[data-report-month-input]'); if(reportMonthInput) reportMonthInput.onchange=()=>{state.reportMonth=reportMonthInput.value?`${reportMonthInput.value}-01`:`${localDate(new Date()).slice(0,7)}-01`;state.generatedCategoryReports=null;render();};
  const reportCategory=app.querySelector('[data-report-category]'); if(reportCategory) reportCategory.onchange=()=>{state.reportCategory=reportCategory.value;render();};
  const search = app.querySelector('[data-apartment-search]');
  if (search) search.oninput = () => {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    app.querySelectorAll('[data-apartment-card]').forEach(card => { const show = !query || card.dataset.search.includes(query); card.hidden = !show; if (show) visible++; });
    app.querySelectorAll('[data-category-section]').forEach(section => { section.hidden = !section.querySelector('[data-apartment-card]:not([hidden])'); });
    app.querySelector('.search-empty').hidden = visible !== 0;
  };
  const clearBookingHover = () => app.querySelectorAll('.booking-hover,.booking-hover-start,.booking-hover-end').forEach(cell => cell.classList.remove('booking-hover','booking-hover-start','booking-hover-end'));
  app.onpointerover = event => {
    const cell = event.target.closest('[data-booking-cell][data-reservation]');
    if (!cell || !app.contains(cell) || !cell.dataset.reservation) return;
    const reservationId = cell.dataset.reservation;
    clearBookingHover();
    const cells = [...app.querySelectorAll('[data-booking-cell]')].filter(item => item.dataset.reservation === reservationId).sort((left, right) => left.dataset.bookingDate.localeCompare(right.dataset.bookingDate));
    cells.forEach(item => item.classList.add('booking-hover'));
    cells[0]?.classList.add('booking-hover-start');
    cells.at(-1)?.classList.add('booking-hover-end');
  };
  app.onpointerout = event => {
    const cell = event.target.closest('[data-booking-cell][data-reservation]');
    if (cell && !cell.contains(event.relatedTarget)) clearBookingHover();
  };
  let activeStaffDrag = null;
  const finishStaffDrag = async event => {
    const drag = activeStaffDrag;
    if (!drag || (event.pointerId !== undefined && event.pointerId !== drag.pointerId)) return;
    activeStaffDrag = null;
    window.removeEventListener('pointermove', moveStaffDrag);
    window.removeEventListener('pointerup', finishStaffDrag);
    window.removeEventListener('pointercancel', finishStaffDrag);
    drag.ghost.remove();
    drag.placeholder.replaceWith(drag.card);
    drag.card.classList.remove('drag-source');
    const order = [...app.querySelectorAll('[data-staff-card]')].map(card => card.dataset.staffId);
    await saveStaffOrder(order);
  };
  const moveStaffDrag = event => {
    const drag = activeStaffDrag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.ghost.style.left = `${event.clientX - drag.offsetX}px`;
    drag.ghost.style.top = `${event.clientY - drag.offsetY}px`;
    const target = document.elementsFromPoint(event.clientX, event.clientY).find(element => element.matches?.('[data-staff-card]'));
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const after = event.clientY > rect.top + rect.height / 2 || (Math.abs(event.clientY - (rect.top + rect.height / 2)) < 22 && event.clientX > rect.left + rect.width / 2);
    const layoutItems = [...target.parentElement.children].filter(item => item.matches?.('[data-staff-card], .staff-card-placeholder'));
    const before = new Map(layoutItems.map(item => [item, item.getBoundingClientRect()]));
    target.parentElement.insertBefore(drag.placeholder, after ? target.nextSibling : target);
    layoutItems.forEach(item => { const oldRect = before.get(item); const newRect = item.getBoundingClientRect(); const dx = oldRect.left - newRect.left; const dy = oldRect.top - newRect.top; if (dx || dy) item.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], { duration: 210, easing: 'cubic-bezier(.2,.8,.2,1)' }); });
  };
  app.querySelectorAll('[data-drag-staff]').forEach(handle => handle.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    const card = handle.closest('[data-staff-card]');
    const rect = card.getBoundingClientRect();
    const placeholder = card.cloneNode(true);
    placeholder.classList.add('staff-card-placeholder');
    placeholder.removeAttribute('data-staff-card');
    placeholder.removeAttribute('data-staff-id');
    placeholder.querySelectorAll('[data-drag-staff], button').forEach(control => control.remove());
    const ghost = card.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.style.width = `${rect.width}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    card.replaceWith(placeholder);
    document.body.append(ghost);
    activeStaffDrag = { pointerId: event.pointerId, card, placeholder, ghost, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    window.addEventListener('pointermove', moveStaffDrag);
    window.addEventListener('pointerup', finishStaffDrag);
    window.addEventListener('pointercancel', finishStaffDrag);
  }));
}function openStaff(person) { modal(person?tr('legacy.editStaffMember'):tr('legacy.addStaffMember83'),`<form><label>${esc(tr('legacy.fullName'))}<input name="name" required maxlength="80" value="${esc(person?.name)}" /></label><label>${esc(tr('legacy.phone'))}<input name="phone" inputmode="tel" maxlength="40" value="${esc(person?.phone)}" /></label><label>${esc(tr('legacy.preferredPaymentMethod'))}<select name="paymentMethod"><option value="">${esc(tr('legacy.notSet'))}</option><option value="Bank transfer" ${person?.paymentMethod==='Bank transfer'?'selected':''}>${esc(tr('legacy.bankTransfer'))}</option><option value="Cash" ${person?.paymentMethod==='Cash'?'selected':''}>${esc(tr('legacy.cash'))}</option><option value="Other" ${person?.paymentMethod==='Other'?'selected':''}>${esc(tr('legacy.other'))}</option></select></label><label>${esc(tr('legacy.notes'))}<textarea name="notes" maxlength="500">${esc(person?.notes)}</textarea></label><p class="form-error" role="alert"></p></form>`,async form=>{const name=form.elements.name.value.trim();if(!name)throw new Error(tr('legacy.aStaffNameIsRequired'));const nextOrder=Math.max(-1,...byId('staff').map(staff=>staffOrder(staff)))+1;await save('staff',{id:person?.id||id(),name,phone:form.elements.phone.value.trim(),paymentMethod:form.elements.paymentMethod.value,notes:form.elements.notes.value.trim(),sortOrder:person?.sortOrder??nextOrder,active:person?.active??true,createdAt:person?.createdAt||new Date().toISOString()});}); }
async function saveStaffOrder(ids) { const positions=new Map(ids.map((staffId,index)=>[staffId,index])); const updates=byId('staff').map(person=>({...person,sortOrder:positions.get(person.id)??staffOrder(person)})); await Promise.all(updates.map(person=>store.put('staff',person))); state.data.staff=updates; toast(tr('legacy.calendarOrderSaved')); render(); }function apartmentDetails(item) { const root=modal(tr('legacy.apartmentDetails'),`<form><div class="detail-list"><h3>${esc(item.name)}</h3><p><strong>${esc(tr('v2.owner'))}:</strong> <span data-user-text>${esc(state.data.owners.find(owner=>owner.id===item.ownerId)?.name || tr('ops.unassigned'))}</span></p><p><strong>${esc(tr('legacy.category'))}</strong> ${esc(categoryName(item.categoryId))}</p><p><strong>${esc(tr('legacy.cleaningPrice'))}</strong> ${formatPLN(item.priceGrosz)}</p><p><strong>${esc(tr('legacy.addressOrReference'))}</strong> ${esc(item.reference||'—')}</p><p><strong>${esc(tr('bookings.notes'))}:</strong> ${esc(item.notes||'—')}</p></div><p class="form-error" role="alert"></p></form>`,async()=>{}, {submit:tr('legacy.edit')}); root.querySelector('[data-submit]').onclick=()=>{root.remove();openApartment(item);}; }
function openApartment(item) { const categoryOptions=categories().map(category=>`<option value="${category.id}" ${item?.categoryId===category.id?'selected':''}>${esc(category.name)}</option>`).join(''); modal(item ? tr('legacy.editApartment') : tr('legacy.addApartment90'), `<form><label>${esc(tr('legacy.apartmentName'))}<input name="name" required maxlength="100" value="${esc(item?.name)}" /></label><label>${esc(tr('legacy.category147'))}<select name="categoryId"><option value="">${esc(tr('legacy.noCategory'))}</option>${categoryOptions}</select></label>${ownerSelect(item)}<label>${esc(tr('ops.ownerCharge'))}<input name="ownerCharge" inputmode="decimal" value="${((item?.ownerCleaningChargeGrosz||0)/100).toFixed(2)}"/><small>${esc(tr('ops.ownerChargeHelp'))}</small></label><label>${esc(tr('legacy.addressOrInternalReference'))}<input name="reference" maxlength="160" value="${esc(item?.reference)}" /></label><label>${esc(tr('legacy.cleaningPricePln'))}<input name="price" inputmode="decimal" required value="${item ? (item.priceGrosz / 100).toFixed(2) : ''}" /></label><label>${esc(tr('legacy.notes'))}<textarea name="notes" maxlength="500">${esc(item?.notes)}</textarea></label><p class="form-error" role="alert"></p></form>`, async form => { const name = form.elements.name.value.trim(); const priceGrosz = toGrosz(form.elements.price.value); if (!name) throw new Error(tr('legacy.anApartmentNameIsRequired')); if (priceGrosz <= 0) throw new Error(tr('legacy.cleaningPriceMustBeGreaterThanZero')); await save('apartments', { id: item?.id || id(), name, ownerCleaningChargeGrosz:toGrosz(form.elements.ownerCharge.value), ownerId:form.elements.ownerId.value, sortOrder:item && (item.categoryId||'')===form.elements.categoryId.value ? item.sortOrder : nextApartmentOrder(byId('apartments'),form.elements.categoryId.value), categoryId: form.elements.categoryId.value, reference: form.elements.reference.value.trim(), priceGrosz, notes: form.elements.notes.value.trim(), active: item?.active ?? true, createdAt: item?.createdAt || new Date().toISOString() }); }); }
function manageCategories() { const list=categories(); const root=modal(tr('legacy.apartmentCategories'),`<form><p class="muted">${esc(tr('legacy.createFoldersToOrganiseApartmentsPlanningAndHistoricalAssignments'))}</p><div class="category-manager-list">${list.length?list.map(category=>`<div><span>${esc(category.name)}</span><button type="button" class="text danger-text" data-delete-category="${category.id}">${esc(tr('legacy.delete'))}</button></div>`).join(''):`<p class="muted">${esc(tr('legacy.noCategoriesYet'))}</p>`}</div><label>${esc(tr('legacy.categoryName'))}<input name="categoryName" maxlength="60" placeholder="${esc(tr('legacy.eGCityCentre'))}" /></label><p class="form-error" role="alert"></p></form>`,async form=>{const name=form.elements.categoryName.value.trim();if(!name)throw new Error(tr('legacy.aCategoryNameIsRequired'));if(categories().some(category=>category.name.localeCompare(name,undefined,{sensitivity:'accent'})===0))throw new Error(tr('legacy.aCategoryWithThisNameAlreadyExists'));await save('categories',{id:id(),name,createdAt:new Date().toISOString()});},{submit:tr('legacy.createCategory')}); root.querySelectorAll('[data-delete-category]').forEach(button=>button.onclick=()=>{root.remove();deleteCategory(find('categories',button.dataset.deleteCategory));}); }
function deleteCategory(category) { if(!category)return; const count=byId('apartments').filter(apartment=>apartment.categoryId===category.id).length; modal(tr('legacy.deleteCategory'),`<form><p data-user-text>${esc(category.name)}</p><p>${esc(tr('v2.deleteCategoryCopy',{count}))}</p><p class="form-error" role="alert"></p></form>`,async()=>{const updates=byId('apartments').filter(apartment=>apartment.categoryId===category.id).map(apartment=>({...apartment,categoryId:''}));await Promise.all([...updates.map(apartment=>store.put('apartments',apartment)),store.delete('categories',category.id)]);state.data.apartments=byId('apartments').map(apartment=>updates.find(update=>update.id===apartment.id)||apartment);state.data.categories=byId('categories').filter(item=>item.id!==category.id);toast(tr('legacy.categoryDeletedApartmentsWereKept'));render();},{danger:true,submit:tr('legacy.deleteCategory155')}); }function toggleArchive(key, item, noun) { if (item.active === false) return save(key, { ...item, active: true }); modal(tr('v2.archiveTitle',{name:item.name}), `<form><p><strong>${esc(item.name)}</strong> ${esc(tr('legacy.willBeHiddenFromNewPlanningExistingAssignmentsConfirmed'))}</p><p class="form-error" role="alert"></p></form>`, () => save(key, { ...item, active: false }), { danger: true, submit: tr('legacy.archiveSafely') }); }
function openAssignment(job, staffId, date) {
  const effectiveStaff = staffId || job.staffId;
  const effectiveDate = date || job.date;
  const staff = find('staff', effectiveStaff);
  const savedSnapshots = new Map((job?.apartments || []).map(item => [item.apartmentId, item]));
  const selected = new Set((job?.apartments || []).map(item => item.apartmentId));
  const assignedElsewhere = new Set(byId('assignments').filter(item => item.date === effectiveDate && item.id !== job?.id).flatMap(item => item.apartments || []).map(apartment => apartment.apartmentId));
  const activeOptions = active('apartments').filter(apartment => selected.has(apartment.id) || !assignedElsewhere.has(apartment.id)).map(apartment => {
    const departure = byId('reservations').find(reservation => reservation.apartmentId === apartment.id && reservation.checkOut === effectiveDate);
    const priority = Boolean(departure && byId('reservations').some(reservation => reservation.apartmentId === apartment.id && reservation.checkIn === effectiveDate));
    return { id: apartment.id, name: apartment.name, categoryId: apartment.categoryId, priceGrosz: apartment.priceGrosz, snapshot: savedSnapshots.get(apartment.id) || checkoutDogSnapshot(snapshotApartment(apartment),departure,find('settings','dogBonus')?.amountGrosz||0), departure, priority, checkoutStatus: departure ? checkoutCleaningStatus(apartment.id, effectiveDate) : null };
  }).sort((left, right) => Number(right.priority) - Number(left.priority) || Number(Boolean(right.departure)) - Number(Boolean(left.departure)) || left.name.localeCompare(right.name));
  const archivedOptions = (job?.apartments || []).filter(item => !activeOptions.some(option => option.id === item.apartmentId)).map(item => ({ id: item.apartmentId, name: `${item.name} (${tr('v2.archived')})`, priceGrosz: item.priceGrosz, snapshot: item, priority: false }));
  const options = [...activeOptions, ...archivedOptions];
  const choices = options.length ? options.map(option => { const checkoutHint = option.departure ? `${tr('cleaning.checkoutToday')} · ${option.priority ? tr('cleaning.priorityCheckout') : tr(`cleaning.${option.checkoutStatus}`)}` : ''; return `<div class="check ${option.priority ? 'priority-choice' : ''}" data-apartment-option data-priority="${option.priority}" data-search="${esc(`${option.name} ${categoryName(option.categoryId)}`).toLowerCase()}"><input type="checkbox" name="apartment" value="${option.id}" ${selected.has(option.id) ? 'checked' : ''}/><span>${esc(option.name)} <small>${esc(categoryName(option.categoryId))} · ${formatPLN(option.priceGrosz)}${checkoutHint ? ` · ${esc(checkoutHint)}` : ''}</small></span></div>`; }).join('') : `<p class="muted">${esc(tr('legacy.noActiveApartmentsAddApartmentsFirst'))}</p>`;
  const isPlanned = job?.status === 'planned';
  const title = job?.status === 'confirmed' ? tr('ops.correctConfirmed') : job ? tr('legacy.reviewPlannedCleaning') : tr('legacy.planAssignment');
  const guidance = isPlanned ? `<p class="review-note">${esc(tr('ops.reviewGuidance'))}</p>` : '';
  const dialog = modal(title, `<form><p><strong>${esc(staff?.name || tr('legacy.staff'))} · ${esc(dateLabel(effectiveDate))} ${effectiveDate.slice(0, 4)}</strong></p>${job?.status === 'confirmed' ? `<p class="warning">${esc(tr('ops.confirmedChange'))}</p>` : guidance}<label class="search-field modal-search"><span>${esc(tr('legacy.searchApartments'))}</span><input data-assignment-search type="search" placeholder="${esc(tr('legacy.searchByApartmentNameOrAddress'))}" /></label><p class="muted assignment-search-note" data-assignment-search-note>${esc(tr('legacy.searchForAnApartmentToAddItToThis'))}</p><fieldset><legend>${isPlanned ? tr('legacy.apartmentsActuallyCleaned') : tr('legacy.apartmentsToAssign')}</legend>${choices}</fieldset><label>${esc(tr('ops.notesHelp'))}<textarea name="cleaningNotes" maxlength="500">${esc(job?.notes)}</textarea></label><p data-assignment-total></p><p class="form-error" role="alert"></p></form>`, async form => {
    const chosen = [...form.querySelectorAll('input[name="apartment"]:checked')].map(input => readCleaningSnapshot(input,options));
    if (!chosen.length) {
      if (!job) throw new Error(tr('ops.selectApartment'));
      if (job.status === 'confirmed') throw new Error(tr('ops.keepConfirmed'));
      if (!window.confirm(tr('ops.cancelPlanCopy',{staff:staff.name,date:dateLabel(effectiveDate)}))) return false;
      await remove('assignments', job.id);
      toast(tr('legacy.plannedAssignmentRemoved'));
      return;
    }
    const update = { id: job?.id || id(), staffId: effectiveStaff, date: effectiveDate, status: job?.status==='confirmed'?'confirmed':'planned', apartments: chosen, notes:form.elements.cleaningNotes.value.trim(), createdAt: job?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
    if(job?.status==='confirmed'&&!window.confirm(tr('ops.confirmedChange')))return false;
    await save('assignments', update);
    if (job?.status === 'confirmed') toast(tr('ops.confirmedUpdated'), 'warning');
  }, { danger: job?.status === 'confirmed', submit: job?.status === 'confirmed' ? tr('ops.save') : tr('legacy.savePlan') });
  installDogFields(dialog,options);
  const refreshTotal=()=>{const form=dialog.querySelector('form');try{const chosen=[...form.querySelectorAll('input[name=apartment]:checked')].map(input=>readCleaningSnapshot(input,options));dialog.querySelector('[data-assignment-total]').innerHTML=`<span>${esc(tr('ops.total'))}</span>: <span data-user-text>${esc(formatPLN(assignmentTotal({apartments:chosen})))}</span>`;}catch{dialog.querySelector('[data-assignment-total]').textContent=tr('ops.bonusInvalid');}};
  dialog.querySelector('form').addEventListener('input',refreshTotal);dialog.addEventListener('cleanflow-language',refreshTotal);refreshTotal();
  if (isPlanned) {
    const cancel=document.createElement('button');cancel.className='danger';cancel.textContent=tr('ops.cancelPlan');cancel.onclick=async()=>{if(!window.confirm(tr('ops.cancelPlanCopy',{staff:staff.name,date:dateLabel(effectiveDate)})))return;await remove('assignments',job.id);dialog.remove();};dialog.querySelector('footer').append(cancel);
    
    const confirm = document.createElement('button');
    confirm.className = 'success';
    confirm.textContent = tr('legacy.confirmCompleted');
    confirm.onclick = async () => {
      const form = dialog.querySelector('form');
      const notice = dialog.querySelector('.form-error');
      try {
        const apartments = [...form.querySelectorAll('input[name="apartment"]:checked')].map(input => readCleaningSnapshot(input,options));
        if (!apartments.length) throw new Error(tr('legacy.selectTheApartmentSActuallyCleanedOrUseSave'));
        await save('assignments', { ...job, status: 'confirmed', apartments, notes:form.elements.cleaningNotes.value.trim(), confirmedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        dialog.remove();
        toast(tr('legacy.completedCleaningConfirmedRealBalanceUpdated'));
      } catch (error) { notice.textContent = localizedError(error);localize(notice); }
    };
    dialog.querySelector('footer').prepend(confirm);
  }
}function openPayment(staffId, payment) { const staff = find('staff', staffId); const summary = staffSummary(staffId, byId('assignments'), byId('payments').filter(item => item.id !== payment?.id)); modal(payment ? tr('legacy.editPayment') : tr('legacy.recordPayment'), `<form><p><strong>${esc(staff?.name || tr('legacy.staff'))}</strong> · ${esc(tr('v2.balance'))}: ${formatPLN(summary.dueGrosz)}</p><label>${esc(tr('legacy.amountPln'))}<input name="amount" inputmode="decimal" required value="${payment ? (payment.amountGrosz / 100).toFixed(2) : ''}" /></label><label>${esc(tr('legacy.paymentDate'))}<input name="date" type="date" required value="${esc(payment?.date || localDate(new Date()))}" /></label><label>${esc(tr('legacy.method'))}<input name="method" maxlength="60" value="${esc(payment?.method)}" placeholder="${esc(tr('legacy.eGBankTransfer'))}" /></label><label>${esc(tr('legacy.note'))}<textarea name="note" maxlength="300">${esc(payment?.note)}</textarea></label><p class="form-error" role="alert"></p></form>`, async form => { const amountGrosz = toGrosz(form.elements.amount.value); if (amountGrosz <= 0) throw new Error(tr('legacy.paymentMustBeGreaterThanZero')); const overpayment = amountGrosz > summary.dueGrosz && !payment; if (overpayment && !window.confirm(tr('v2.overpayment',{amount:formatPLN(amountGrosz-summary.dueGrosz)}))) return; await save('payments', { id: payment?.id || id(), staffId, amountGrosz, date: form.elements.date.value, method: form.elements.method.value.trim(), note: form.elements.note.value.trim(), createdAt: payment?.createdAt || new Date().toISOString() }); }, { submit: payment ? tr('legacy.savePayment') : tr('legacy.confirmPayment') }); }
function paymentHistory(staffId) { const staff=find('staff',staffId); const payments=byId('payments').filter(item=>item.staffId===staffId).sort((a,b)=>b.date.localeCompare(a.date)); const root=modal(`${tr('payments.history')} — ${staff?.name||''}`,`<form><div class="payment-history">${payments.length?payments.map(payment=>`<div><span>${esc(payment.date)} · ${esc(payment.method||tr('v2.noMethod'))}${payment.note?` · ${esc(payment.note)}`:''}</span><strong>−${formatPLN(payment.amountGrosz)}</strong><button type="button" class="text" data-edit-payment="${payment.id}">${esc(tr('legacy.edit'))}</button><button type="button" class="text danger-text" data-delete-payment="${payment.id}">${esc(tr('legacy.delete'))}</button></div>`).join(''):`<p class="muted">${esc(tr('legacy.noPaymentsRecorded'))}</p>`}</div><p class="form-error" role="alert"></p></form>`,async()=>{}, {submit:tr('legacy.close')}); root.querySelector('[data-submit]').onclick=()=>root.remove(); root.querySelectorAll('[data-edit-payment]').forEach(button=>button.onclick=()=>{root.remove();const payment=find('payments',button.dataset.editPayment);openPayment(payment.staffId,payment);}); root.querySelectorAll('[data-delete-payment]').forEach(button=>button.onclick=()=>{root.remove();deletePayment(find('payments',button.dataset.deletePayment));}); }function deletePayment(payment) { modal(tr('legacy.deletePayment'), `<form><p>${esc(tr('v2.deletePaymentCopy',{amount:formatPLN(payment.amountGrosz),date:formatBookingDate(state.language,payment.date)}))}</p><p class="form-error" role="alert"></p></form>`, () => remove('payments', payment.id), { danger: true, submit: tr('legacy.deletePayment120') }); }
async function exportBackup() { try{const backup=createBackup(await store.data());downloadBlob(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),`cleanflow-backup-${localDate(new Date())}.json`);toast(tr('v2.manualSaved'));}catch{toast(tr('ops.saveError'),'warning');} }
async function importBackup() { const file=document.querySelector('#import-file').files[0];if(!file)return toast(tr('backup.noFile'),'warning');try { const incoming=JSON.parse(await file.text());const data=await readBackup(incoming);modal(tr('v2.importTitle'),`<form><p data-user-text>${esc(file.name)}</p><p>${esc(tr('v2.importCopy'))}</p><p class="form-error" role="alert"></p></form>`,async()=>{const restored=structuredClone(data);if(!restored.settings.some(item=>item.id==='preferences'))restored.settings.push(preferencesFrom(restored,state.language));await store.replace(restored);state.data=migrateOperations(await store.data());v2.restore();toast(tr('v2.importSuccess'));render();},{danger:true,submit:tr('v2.importConfirm')});}catch {toast(tr('v2.importError'),'warning');} }
async function resetAll() {
  modal(tr('legacy.deleteAllAppData130'), `<form><p>${esc(tr('v2.resetWarning'))}</p><p class="form-error" role="alert"></p></form>`, async () => {
    const blank = { staff: [], apartments: [], categories: [], assignments: [], payments: [], reservations: [], checkoutStates: [], settings: [] };
    await store.replace(blank);
    state.data = migrateOperations(blank);
    const preference=preferencesFrom(state.data,state.language);await store.put('settings',preference);state.data.settings.push(preference);v2.restore();
    toast(tr('legacy.allLocalAppDataHasBeenDeleted'), 'warning');
    render();
  }, { danger: true, submit: tr('legacy.permanentlyDeleteAllData') });
}
import {legacyPairs} from './legacy-i18n.js';
const plText=new Map(legacyPairs);const plExtra=new Map();
function localizedError(error){const message=error?.message||'';const pair=legacyPairs.find(([en,pl])=>en===message||pl===message);if(pair)return pair[state.language==='pl'?1:0];if([...liveTranslations.values()].some(value=>value[state.language]===message))return message;return tr('ops.saveError');}
function localize(root){const userValues=new Set(Object.values(state.data).flat().flatMap(item=>['name','notes','note','reference','phone','email','address','apartmentName','categoryName'].map(key=>item[key]).filter(value=>typeof value==='string'&&value.trim())));const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(node=>{if(node.parentElement?.closest('[data-user-text],textarea'))return;const raw=node.nodeValue,trimmed=raw.trim();if(userValues.has(trimmed))return;const live=liveTranslations.get(trimmed);if(live){node.nodeValue=raw.replace(trimmed,live[state.language]);return;}if(state.language==='en'){const source=[...plExtra,...plText].find(([,value])=>value===trimmed)?.[0];if(source)node.nodeValue=raw.replace(trimmed,source);return;}const translated=/^Version\s+\d+\.\d+\.\d+$/.test(trimmed) ? `Wersja ${trimmed.replace(/^Version\s+/, '')}` : (plExtra.get(trimmed)||plText.get(trimmed));if(translated)node.nodeValue=raw.replace(trimmed,translated);});root.querySelectorAll('input[placeholder]').forEach(input=>{const translated=state.language==='pl'?(plExtra.get(input.placeholder)||plText.get(input.placeholder)):[...plExtra,...plText].find(([,value])=>value===input.placeholder)?.[0];if(translated)input.placeholder=translated;});}if (!isDemo && 'serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
render();
v2.start();




















