import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import catalog from '../api/catalog.js';
import discover from '../api/discover.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const files=new Map([['/',['public/index.html','text/html; charset=utf-8']],['/app.js',['public/app.js','text/javascript; charset=utf-8']],['/core.js',['public/core.js','text/javascript; charset=utf-8']],['/style.css',['public/style.css','text/css; charset=utf-8']]]);
for(let count=0;count<=4;count++)files.set(`/instrument/count-${count}.svg`,[`public/instrument/count-${count}.svg`,'image/svg+xml']);
const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.status=code=>{res.statusCode=code;return res;};res.json=value=>{res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));return res;};
  const path=new URL(req.url,'http://localhost').pathname;
  if(path==='/api/catalog')return catalog(req,res);if(path==='/api/discover')return discover(req,res);
  if(!['GET','HEAD'].includes(req.method)||!files.has(path)){res.writeHead(404);return res.end('Not found');}
  try{const [file,type]=files.get(path),data=await readFile(resolve(root,file));res.writeHead(200,{'content-type':type});res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(500);res.end('Unable to load this page.');}
});
server.listen(Number(process.env.PORT)||3000,'127.0.0.1',()=>console.log(`Find Your Next: http://127.0.0.1:${Number(process.env.PORT)||3000}`));
