import * as p from '@phosphor-icons/react';
const keys = Object.keys(p);
console.log('Total exports:', keys.length);
console.log('First 40:', keys.slice(0,40).join(','));
const wanted = ['SteeringWheel','GasPump','Suitcase','Gauge','Snowflake','MusicNote','Baby','BatteryCharging','Lightning','Info','Users','MapPin','Star','ShieldCheck','ChatCircle','CheckCircle','Car','ChartLine','CurrencyDollar','Warning','IdentificationCard','UserCircle','Plus','House','MagnifyingGlass','User','SignOut','ChartBar','FunnelSimple','MapTrifold','GridFour','HandCoins','Calendar','CreditCard'];
wanted.forEach(n => console.log(n, ':', n in p ? 'OK' : 'MISSING'));
