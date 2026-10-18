import {defaultPreferences} from '../js/preferences.js';
export function exhaustiveFixture(seed='A') {
 const suffix=seed==='A'?'Alpha':'Beta',prefix=seed.toLowerCase();
 return {
  staff:[{id:`${prefix}-s`,name:`Synthetic ${suffix} Staff`,phone:'+48 000 000 000',paymentMethod:'Cash',active:true,sortOrder:2,notes:'User note: Staff / Owner / Save',createdAt:'2026-01-01T10:00:00Z',custom:{history:['keep','all'],flag:true}},{id:`${prefix}-old`,name:'Archived synthetic staff',active:false,sortOrder:3}],
  owners:[{id:`${prefix}-o`,name:`Synthetic ${suffix} Owner`,email:'owner@example.invalid',phone:'000',active:true,notes:'No automatic translation'}],
  categories:[{id:`${prefix}-c`,name:`Synthetic ${suffix} Category`}],
  apartments:[{id:`${prefix}-a`,name:`Synthetic ${suffix} Apartment`,categoryId:`${prefix}-c`,ownerId:`${prefix}-o`,priceGrosz:12345,ownerCleaningChargeGrosz:5555,sortOrder:7,active:true,reference:'User address',notes:'Notes / płatność / 🐾'}],
  reservations:[{id:`${prefix}-r`,apartmentId:`${prefix}-a`,apartmentName:`Synthetic ${suffix} Apartment`,categoryId:`${prefix}-c`,checkIn:'2026-10-17',checkOut:'2026-10-21',hasDog:true,dogBonusGrosz:2515,notes:'Client note',customerPayment:{status:'cashToCollect',amountGrosz:45678,note:'Cash on arrival'}}],
  assignments:[{id:`${prefix}-j`,staffId:`${prefix}-s`,date:'2026-10-19',status:'confirmed',apartments:[{apartmentId:`${prefix}-a`,name:`Synthetic ${suffix} Apartment`,priceGrosz:12345,ownerCleaningChargeGrosz:5555,dogBonus:true,dogBonusGrosz:2515,customSnapshot:{preserve:true}}],notes:'Nested snapshots preserved',confirmedAt:'2026-10-19T12:00:00Z'},{id:`${prefix}-p`,staffId:`${prefix}-s`,date:'2026-10-21',status:'planned',apartments:[{apartmentId:`${prefix}-a`,name:`Synthetic ${suffix} Apartment`,priceGrosz:9999,dogBonus:false,dogBonusGrosz:0}]}],
  payments:[{id:`${prefix}-pay`,staffId:`${prefix}-s`,date:'2026-10-19',amountGrosz:4321,method:'User method',note:'User payment',createdAt:'2026-10-19T10:00:00Z'}],
  checkoutStates:[{id:`${prefix}-ignored`,apartmentId:`${prefix}-a`,date:'2026-09-15',status:'ignored',notes:'Keep historical checkout'}],
  settings:[{...defaultPreferences('en'),theme:seed==='A'?'indigo':'plum',textSize:'large',staffView:'details',apartmentView:'compact',autoBackupRetention:31},{id:'dogBonus',amountGrosz:2515},{id:'unknown-legacy-setting',nested:{a:[1,'two',{three:true}]}}]
 };
}
