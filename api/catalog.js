import {getCatalog} from '../src/catalog.mjs';
export default async function handler(req,res){
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed.'});
  const u=new URL(req.url,'http://localhost'),kind=u.searchParams.get('kind')??'',q=u.searchParams.get('q')??'';
  if(q.length>100)return res.status(400).json({error:'Search is too long.'});
  const rawPage=u.searchParams.get('page')??'0';
  if(!/^(0|[1-9]\d?)$/.test(rawPage)||Number(rawPage)>20)return res.status(400).json({error:'Choose a page from 0 to 20.'});
  try{return res.status(200).json(await getCatalog(kind,q,{page:Number(rawPage)}));}catch(error){return res.status(error.status??500).json({error:error.status?error.message:'Search failed. Please retry.'});}
}
