const fs = require('node:fs')
const path = require('node:path')
const source = path.join(process.cwd(), 'node_modules/country-state-city-data/dist')
const target = path.join(process.cwd(), 'public/data/locations')
fs.mkdirSync(target, { recursive: true })
const read = file => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {}
for (const { country, ISO } of read(path.join(source, 'countries.json'))) {
  const regions = (read(path.join(source, 'region', country + '.json')).regions || []).map(region => ({
    name: region.adminName1 || region.toponymName,
    cities: [...new Set((read(path.join(source, 'region_city_data', country, region.toponymName + '.json')).cities || []).map(city => city.asciiname || city.name))].sort()
  })).sort((a,b) => a.name.localeCompare(b.name))
  fs.writeFileSync(path.join(target, ISO + '.json'), JSON.stringify({ regions }))
}
console.log('Generated country location files')

// Readable Saudi region names and major-city suggestions supplement missing source entries.
const sa = {
 'Riyadh': ['Riyadh', 'Al Kharj', 'Ad Dawadimi'],
 'Makkah': ['Makkah', 'Jeddah', 'Taif'],
 'Madinah': ['Madinah', 'Yanbu', 'Al Ula'],
 'Eastern Province': ['Dammam', 'Dhahran', 'Khobar', 'Jubail', 'Al Hofuf'],
 'Al-Qassim': ['Buraydah', 'Unaizah', 'Ar Rass'],
 'Asir': ['Abha', 'Khamis Mushait', 'Bisha'],
 'Tabuk': ['Tabuk', 'Duba', 'Umluj'],
 'Hail': ['Hail'], 'Northern Borders': ['Arar', 'Rafha', 'Turaif'],
 'Jazan': ['Jazan', 'Sabya'], 'Najran': ['Najran', 'Sharurah'],
 'Al Bahah': ['Al Bahah', 'Baljurashi'], 'Al Jawf': ['Sakaka', 'Qurayyat']
}
fs.writeFileSync(path.join(target, 'SA.json'), JSON.stringify({ regions: Object.entries(sa).map(([name, cities]) => ({name, cities})).sort((a,b) => a.name.localeCompare(b.name)) }))
