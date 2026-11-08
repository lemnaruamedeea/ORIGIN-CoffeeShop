export function cleanFavorites(value:unknown):string[]{return Array.isArray(value)?[...new Set(value.filter((id:unknown):id is string=>typeof id==='string'&&/^[a-z0-9][a-z0-9_-]{0,99}$/.test(id)))].slice(0,100):[];}
export const mergeFavorites=(a:unknown,b:unknown)=>cleanFavorites([...cleanFavorites(a),...cleanFavorites(b)]);
export function toggleFavorite(value:unknown,id:string){const ids=cleanFavorites(value);if(ids.includes(id))return ids.filter(x=>x!==id);return cleanFavorites([id,...ids]);}
