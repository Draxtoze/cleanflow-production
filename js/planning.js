import {isIsoDate} from './reservations.js';
export function pendingCheckout(data,apartmentId,date){
 const departure=(data.reservations||[]).filter(x=>x.apartmentId===apartmentId&&x.checkOut<=date).sort((a,b)=>b.checkOut.localeCompare(a.checkOut))[0];
 if(!departure||(data.checkoutStates||[]).some(x=>x.apartmentId===apartmentId&&x.date===departure.checkOut&&x.status==='ignored'))return null;
 if((data.assignments||[]).some(x=>x.status==='confirmed'&&x.date>=departure.checkOut&&x.date<=date&&x.apartments?.some(y=>y.apartmentId===apartmentId)))return null;
 return {departure,priority:(data.reservations||[]).some(x=>x.apartmentId===apartmentId&&x.checkIn===departure.checkOut)};
}
export function validatePlanningWrite(job,others){
 if(!job?.id||!job.staffId||!isIsoDate(job.date)||!['planned','confirmed'].includes(job.status)||!Array.isArray(job.apartments))throw Error('planning.invalid');
 if(!job.apartments.length)throw Error('planning.emptyInvalid');
 const ids=new Set();
 for(const item of job.apartments){
  if(!item.apartmentId||ids.has(item.apartmentId))throw Error('planning.conflict');
  if(!Number.isSafeInteger(item.priceGrosz)||item.priceGrosz<0||item.dogBonus&&(!Number.isSafeInteger(item.dogBonusGrosz)||item.dogBonusGrosz<0))throw Error('planning.invalid');
  ids.add(item.apartmentId);
 }
 if(others.some(other=>other.id!==job.id&&other.date===job.date&&(other.staffId===job.staffId||(other.apartments||[]).some(item=>ids.has(item.apartmentId)))))throw Error('planning.conflict');
 return job;
}
