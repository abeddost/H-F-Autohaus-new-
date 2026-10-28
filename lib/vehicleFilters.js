const fields = ['q', 'make', 'fuel', 'gearbox', 'maxPrice', 'minYear', 'maxMileage', 'sort'];
function filterVehicles(vehicles, query = {}) {
    const filters = Object.fromEntries(fields.map(key => [key, typeof query[key] === 'string' ? query[key].trim().slice(0, 160) : '']));
    const number = key => filters[key] !== '' && Number.isFinite(Number(filters[key])) && Number(filters[key]) >= 0 ? Number(filters[key]) : null;
    const maxPrice = number('maxPrice'), minYear = number('minYear'), maxMileage = number('maxMileage');
    const matches = vehicles.filter(v =>
        (!filters.q || `${v.title} ${v.make} ${v.model} ${(v.features || []).join(' ')}`.toLocaleLowerCase('de').includes(filters.q.toLocaleLowerCase('de'))) &&
        ['make', 'fuel', 'gearbox'].every(key => !filters[key] || v[key] === filters[key]) &&
        (maxPrice === null || (v.price?.amount != null && v.price.amount <= maxPrice)) &&
        (minYear === null || (v.firstRegistration && Number(v.firstRegistration.slice(0, 4)) >= minYear)) &&
        (maxMileage === null || (v.mileage != null && v.mileage <= maxMileage))
    );
    const compareNullable = (a, b, direction = 1) => a == null ? (b == null ? 0 : 1) : b == null ? -1 : (a - b) * direction;
    const sorts = {
        'price-asc': (a,b) => compareNullable(a.price?.amount,b.price?.amount),
        'price-desc': (a,b) => compareNullable(a.price?.amount,b.price?.amount,-1),
        mileage: (a,b) => compareNullable(a.mileage,b.mileage),
        year: (a,b) => compareNullable(a.firstRegistration ? Number(a.firstRegistration.replace('-','')) : null,b.firstRegistration ? Number(b.firstRegistration.replace('-','')) : null,-1),
        newest: (a,b) => compareNullable(Date.parse(a.updatedAt) || null,Date.parse(b.updatedAt) || null,-1)
    };
    matches.sort(sorts[filters.sort] || sorts.newest);
    const options = Object.fromEntries(['make','fuel','gearbox'].map(key => [key,[...new Set(vehicles.map(v=>v[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de'))]));
    return { vehicles: matches, total: vehicles.length, filters, options };
}
// Homepage highlights: the most valuable cars that can be shown properly (price + photo).
function pickFeaturedVehicles(vehicles, count = 5) {
    return vehicles
        .filter(v => v.price?.amount != null && v.images?.length)
        .sort((a, b) => b.price.amount - a.price.amount)
        .slice(0, count);
}
module.exports = { filterVehicles, pickFeaturedVehicles };
