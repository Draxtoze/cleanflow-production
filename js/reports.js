import { addDays, monthlyCategoryReport, reportStatus, weeklyStaffReport } from './business.js';
import { checkoutCleaningStatus, formatDmy, nightsBetween } from './reservations.js';

const PAGE_WIDTH = 210;
const LEFT = 14;
const RIGHT = 196;
const BOTTOM = 282;
const colors = { ink: [23, 63, 68], green: [8, 117, 107], pale: [229, 243, 239], orange: [204, 106, 36], grey: [92, 112, 114], line: [184, 205, 201] };
const safeFilePart = value => String(value || '').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim() || 'report';
const asText = value => String(value ?? '—');
const pdfMoney = (grosz, language) => { const value = (Number(grosz) || 0) / 100; const numeric = Math.abs(value).toFixed(2).replace('.', language === 'pl' ? ',' : '.'); return `${value < 0 ? '-' : ''}${numeric} PLN`; };

function pdfEngine() {
  const Engine = window.jspdf?.jsPDF;
  if (!Engine) throw new Error('PDF generator is not available.');
  return Engine;
}
let fontPayload;
const base64FromBuffer = buffer => { const bytes = new Uint8Array(buffer); let binary = ''; for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)); return btoa(binary); };
async function embeddedFonts() {
  if (!fontPayload) fontPayload = Promise.all(['NotoSans-Regular.ttf', 'NotoSans-Bold.ttf'].map(async name => [name, base64FromBuffer(await (await fetch(`./vendor/${name}`)).arrayBuffer())])).then(Object.fromEntries);
  return fontPayload;
}
async function logoData() {
  try { const response = await fetch('./assets/cleanflow-icon.png'); const blob = await response.blob(); return await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); }); } catch { return null; }
}
async function createWriter(labels, status) {
  const Doc = pdfEngine(); const doc = new Doc({ unit: 'mm', format: 'a4', compress: true }); const [logo, fonts] = await Promise.all([logoData(), embeddedFonts()]); doc.addFileToVFS('NotoSans-Regular.ttf', fonts['NotoSans-Regular.ttf']); doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal', 'Identity-H'); doc.addFileToVFS('NotoSans-Bold.ttf', fonts['NotoSans-Bold.ttf']); doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold', 'Identity-H'); let y = 24; let page = 1;
  const newPage = () => { doc.addPage(); page += 1; y = 24; header(); };
  const header = () => { doc.setFillColor(...colors.ink); doc.rect(0, 0, PAGE_WIDTH, 12, 'F'); if (logo) doc.addImage(logo, 'PNG', LEFT, 2.1, 7.3, 7.3); doc.setTextColor(255, 255, 255); doc.setFont('NotoSans', 'bold'); doc.setFontSize(11); doc.text('CleanFlow', logo ? LEFT + 9.2 : LEFT, 7.7); doc.setFont('NotoSans', 'normal'); doc.setFontSize(7.4); doc.text(labels.status[status], RIGHT, 7.7, { align: 'right' }); doc.setTextColor(...colors.ink); };
  const space = height => { if (y + height > BOTTOM) newPage(); };
  const title = text => { space(12); doc.setFont('NotoSans', 'bold'); doc.setFontSize(18); doc.setTextColor(...colors.ink); doc.text(text, LEFT, y); y += 8; };
  const subtitle = text => { space(8); doc.setFont('NotoSans', 'normal'); doc.setFontSize(9); doc.setTextColor(...colors.grey); doc.text(text, LEFT, y); y += 7; };
  const section = text => { space(12); y += 2; doc.setDrawColor(...colors.green); doc.setLineWidth(.65); doc.line(LEFT, y, RIGHT, y); y += 6; doc.setTextColor(...colors.ink); doc.setFont('NotoSans', 'bold'); doc.setFontSize(11); doc.text(text, LEFT, y); y += 5; };
  const note = text => { const lines = doc.splitTextToSize(text, RIGHT - LEFT - 5); space(lines.length * 4.2 + 6); doc.setFillColor(...colors.pale); doc.roundedRect(LEFT, y - 3.8, RIGHT - LEFT, lines.length * 4.2 + 4.8, 1.2, 1.2, 'F'); doc.setTextColor(...colors.ink); doc.setFont('NotoSans', 'normal'); doc.setFontSize(8.2); doc.text(lines, LEFT + 2.5, y); y += lines.length * 4.2 + 4.5; };
  const keyValues = entries => { const cellWidth = (RIGHT - LEFT - 4) / 2; const rows = []; for (let index = 0; index < entries.length; index += 2) rows.push(entries.slice(index, index + 2)); rows.forEach(row => { space(13); row.forEach(([label, value], column) => { const x = LEFT + column * (cellWidth + 4); doc.setFillColor(246, 249, 248); doc.roundedRect(x, y - 4, cellWidth, 11, 1.2, 1.2, 'F'); doc.setFont('NotoSans', 'bold'); doc.setFontSize(7); doc.setTextColor(...colors.grey); doc.text(label, x + 2.4, y); doc.setFont('NotoSans', 'bold'); doc.setFontSize(9.2); doc.setTextColor(...colors.ink); doc.text(asText(value), x + 2.4, y + 4); }); y += 13; }); };
  const table = (headers, rows, widths) => { const rowHeight = 5.4; const drawHeader = () => { space(8); doc.setFillColor(...colors.ink); doc.rect(LEFT, y - 4.2, RIGHT - LEFT, 6.2, 'F'); doc.setTextColor(255,255,255); doc.setFont('NotoSans','bold'); doc.setFontSize(6.8); let x=LEFT+1.6; headers.forEach((header,index)=>{ doc.text(header,x,y); x+=widths[index]; }); y += 4; };
    drawHeader(); rows.forEach((cells,rowIndex) => { const heights = cells.map((cell,index) => Math.max(rowHeight, doc.splitTextToSize(asText(cell), widths[index] - 2.5).length * 3.2 + 2.2)); const height = Math.max(...heights); if (y + height > BOTTOM) { newPage(); drawHeader(); } doc.setFillColor(rowIndex % 2 ? 250 : 242, rowIndex % 2 ? 252 : 248, rowIndex % 2 ? 251 : 247); doc.rect(LEFT, y - 3.5, RIGHT - LEFT, height, 'F'); doc.setTextColor(...colors.ink); doc.setFont('NotoSans','normal'); doc.setFontSize(7); let x=LEFT+1.4; cells.forEach((cell,index)=>{doc.text(doc.splitTextToSize(asText(cell),widths[index]-2.5),x,y);x+=widths[index];}); y += height; }); y += 3; };
  const finish = generatedAt => { const pages = doc.getNumberOfPages(); for (let current = 1; current <= pages; current += 1) { doc.setPage(current); doc.setDrawColor(...colors.line); doc.line(LEFT, 287, RIGHT, 287); doc.setTextColor(...colors.grey); doc.setFont('NotoSans','normal'); doc.setFontSize(7); doc.text(`${labels.generated}: ${generatedAt}`, LEFT, 291.5); doc.text(`${labels.page} ${current}/${pages}`, RIGHT, 291.5, { align: 'right' }); } return doc; };
  header(); return { doc, title, subtitle, section, note, keyValues, table, pageBreak: newPage, finish };
}

const generated = language => new Intl.DateTimeFormat(language === 'pl' ? 'pl-PL' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
const displayDate = (language, iso) => new Intl.DateTimeFormat(language === 'pl' ? 'pl-PL' : 'en-GB', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(`${iso}T12:00:00`));
const displayMonth = (language, iso) => new Intl.DateTimeFormat(language === 'pl' ? 'pl-PL' : 'en-GB', { month:'long', year:'numeric' }).format(new Date(`${iso}T12:00:00`));

export function reportPeriodStatus(kind, start, endExclusive) { return reportStatus(start, endExclusive); }
export async function createWeeklyStaffPdf({ data, weekStart, language, labels }) {
  const report = weeklyStaffReport(data, weekStart); const status = reportStatus(report.weekStart, report.weekEnd); const writer = await createWriter(labels, status); const title = `${labels.weeklyTitle} — ${displayDate(language, report.weekStart)}–${displayDate(language, addDays(report.weekEnd, -1))}`;
  writer.title(title); writer.subtitle(`${labels.period}: ${displayDate(language, report.weekStart)} — ${displayDate(language, report.weekEnd)} · ${labels.generated}: ${generated(language)}`); writer.note(labels.statusCopy[status]); writer.section(labels.summary);
  writer.keyValues([[labels.planned, report.totals.plannedCount],[labels.confirmed, report.totals.confirmedCount],[labels.expected, pdfMoney(report.totals.expectedGrosz, language)],[labels.real, pdfMoney(report.totals.confirmedGrosz, language)],[labels.payments, pdfMoney(report.totals.paidGrosz, language)],[labels.due, pdfMoney(report.totals.dueAtEndGrosz, language)]]);
  if (!report.sections.length) writer.note(labels.noStaff); report.sections.forEach(item => { writer.pageBreak(); writer.section(item.staff.name); writer.keyValues([[labels.planned, item.plannedCount],[labels.confirmed, item.confirmedCount],[labels.expected, pdfMoney(item.expectedGrosz, language)],[labels.real, pdfMoney(item.confirmedGrosz, language)],[labels.payments, pdfMoney(item.paidGrosz, language)],[labels.due, pdfMoney(item.dueAtEndGrosz, language)]]); if (item.rows.length) writer.table([labels.date, labels.apartmentCategory, labels.statusLabel, labels.expected, labels.real], item.rows.map(row => [displayDate(language,row.date), `${row.apartmentName}${row.categoryName ? `\n${row.categoryName}` : ''}`, row.status === 'confirmed' ? labels.confirmed : labels.planned, row.expectedGrosz ? pdfMoney(row.expectedGrosz, language) : '—', row.confirmedGrosz ? pdfMoney(row.confirmedGrosz, language) : '—']), [28,70,25,30,29]); else writer.note(labels.noCleanings); if (item.payments.length) { writer.section(labels.payments); writer.table([labels.date, labels.method, labels.amount, labels.notes], item.payments.map(payment => [displayDate(language,payment.date), payment.method || '—', pdfMoney(payment.amountGrosz, language), payment.note || '—']), [32,44,35,71]); } });
  const doc = writer.finish(generated(language)); return { blob: doc.output('blob'), fileName: `${safeFilePart(labels.weeklyFile)} ${safeFilePart(displayDate(language, report.weekStart))}-${safeFilePart(displayDate(language, report.weekEnd))}.pdf`, report, status };
}
export async function createCategoryBookingsPdf({ data, monthStart, categoryId, language, labels }) {
  const report = monthlyCategoryReport(data, monthStart, categoryId); const status = reportStatus(report.monthStart, report.monthEnd); const writer = await createWriter(labels, status); const categoryName = report.category.name || labels.uncategorized; writer.title(`${categoryName} — ${displayMonth(language, monthStart)}`); writer.subtitle(`${labels.generated}: ${generated(language)}`); writer.note(labels.statusCopy[status]); writer.section(labels.summary);
  writer.keyValues([[labels.apartments, report.apartments.length],[labels.stays, report.reservations.length],[labels.checkIns, report.arrivals.length],[labels.checkOuts, report.departures.length],[labels.nights, report.totalNights],[labels.turnovers, report.turnovers.length]]);
  if (!report.apartments.length) writer.note(labels.noApartments); report.staysByApartment.forEach(item => { writer.section(item.apartment.name); if (!item.reservations.length) { writer.note(labels.noBookings); return; } writer.table([labels.checkIn, labels.checkOut, labels.nights, labels.notes], item.reservations.map(reservation => [formatDmy(reservation.checkIn), formatDmy(reservation.checkOut), `${nightsBetween(reservation.checkIn,reservation.checkOut)}`, reservation.notes || '—']), [37,37,24,112]); });
  writer.section(labels.checkIns); if (report.arrivals.length) writer.table([labels.date, labels.apartment, labels.notes], report.arrivals.map(item => [formatDmy(item.checkIn), data.apartments.find(apartment => apartment.id === item.apartmentId)?.name || item.apartmentName || '—', item.notes || '—']), [35,57,118]); else writer.note(labels.none);
  writer.section(labels.checkOuts); if (report.departures.length) writer.table([labels.date, labels.apartment, labels.cleaning], report.departures.map(item => { const sameDay = data.reservations.some(other => other.apartmentId === item.apartmentId && other.checkIn === item.checkOut); const cleanState = checkoutCleaningStatus(item.apartmentId, item.checkOut, data.assignments || [], data.checkoutStates || []); const cleanLabel = cleanState === 'confirmed' ? labels.confirmed : cleanState === 'planned' ? labels.planned : cleanState === 'ignored' ? labels.ignored : labels.cleaningToPlan; return [formatDmy(item.checkOut), data.apartments.find(apartment => apartment.id === item.apartmentId)?.name || item.apartmentName || '—', sameDay ? `${labels.priorityTurnover} · ${cleanLabel}` : cleanLabel]; }), [35,67,108]); else writer.note(labels.none);
  const doc = writer.finish(generated(language)); return { blob: doc.output('blob'), fileName: `${safeFilePart(categoryName)} — ${safeFilePart(displayMonth(language, monthStart))}.pdf`, report, status };
}
export const downloadBlob = (blob, fileName) => { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = fileName; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
export async function createCategoryZip(reports, fileName) { if (!window.JSZip) throw new Error('ZIP generator is not available.'); const zip = new window.JSZip(); reports.forEach(report => zip.file(report.fileName, report.blob)); return { blob: await zip.generateAsync({ type: 'blob' }), fileName: `${safeFilePart(fileName)}.zip` }; }

