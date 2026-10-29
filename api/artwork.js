import {optimizedArtwork} from '../src/artwork.mjs';
export default async function handler(req,res){
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed.'});
  const url=new URL(req.url,'http://localhost'),source=url.searchParams.get('url')||'',width=Number(url.searchParams.get('w')||320);
  if(source.length>1000)return res.status(400).json({error:'Invalid artwork URL.'});
  try{const result=await optimizedArtwork(source,width);res.setHeader('Content-Type',result.type);res.setHeader('Cache-Control','public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');return res.status(200).end(result.buffer);}
  catch(error){return res.status(error.status??502).json({error:error.status?error.message:'Catalog artwork could not be loaded.'});}
}
