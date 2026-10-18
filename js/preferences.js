export const APP_VERSION = '2.0.0';
export const SCHEMA_VERSION = 4;
export const THEMES = ['ocean','forest','night','indigo','amber','plum'];
export const TEXT_SIZES = ['small','normal','large'];
export const VIEWS = ['details','cards','compact'];
export const defaultPreferences = language => ({id:'preferences',theme:'ocean',textSize:'normal',staffView:'cards',apartmentView:'cards',autoBackupEnabled:true,autoBackupRetention:31,language:language==='en'?'en':'pl'});
export function validatePreferences(value) {
 if(!value || value.id!=='preferences' || !THEMES.includes(value.theme) || !TEXT_SIZES.includes(value.textSize) || !VIEWS.includes(value.staffView) || !VIEWS.includes(value.apartmentView) || typeof value.autoBackupEnabled!=='boolean' || !Number.isInteger(value.autoBackupRetention) || value.autoBackupRetention<1 || value.autoBackupRetention>365 || !['en','pl'].includes(value.language)) throw Error('preferences.invalid');
 return value;
}
export function preferencesFrom(data,language='pl') {
 return validatePreferences({...defaultPreferences(language),...data.settings?.find(item=>item.id==='preferences')});
}
export function applyAppearance(preferences,root=document.documentElement) {
 root.dataset.theme=preferences.theme;root.dataset.textSize=preferences.textSize;
 root.lang=preferences.language;
}
