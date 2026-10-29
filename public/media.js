// One admission list shared by catalog normalization and browser rendering.
export const CATALOG_IMAGE_HOSTS=new Set(['sttc.gamersgate.com','static.tvmaze.com','covers.openlibrary.org','shared.fastly.steamstatic.com','cdn.cloudflare.steamstatic.com','images.gog-statics.com','cdn.akamai.steamstatic.com']);
export function catalogArtworkUrl(value){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&!url.hash&&CATALOG_IMAGE_HOSTS.has(url.hostname)?url.href:null;}catch{return null;}}
export function optimizedArtworkUrl(value,width=320){const url=catalogArtworkUrl(value);return url?'/api/artwork?url='+encodeURIComponent(url)+'&w='+(width===640?640:320):null;}
