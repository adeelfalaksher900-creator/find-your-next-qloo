import test from 'node:test';
import assert from 'node:assert/strict';
import {commonGames, mergeInterests, selectionSummary, createManualInterest, createInFlightPool, parseCollectionFile, mergeCollection, chooseArtwork} from '../public/core.js';

test('finds common games without treating substrings as matches', () => {
  const group=[['Portal 2','Stardew Valley','Halo'],['portal 2','Hades','Halo Infinite']];
  assert.deepEqual(commonGames(group),['Portal 2']);
});

test('requires at least two participants and removes duplicate names', () => {
  assert.deepEqual(commonGames([['Minecraft']]),[]);
  assert.deepEqual(commonGames([['Minecraft','minecraft'],['Minecraft']]),['Minecraft']);
});

test('identical concurrent catalog requests share work, while completed and failed requests can be retried', async () => {
  const pool=createInFlightPool();let calls=0,finish;
  const work=()=>{calls++;return new Promise(resolve=>{finish=resolve;});};
  const first=pool.run('games',work), second=pool.run('games',work);
  await Promise.resolve();assert.equal(calls,1);assert.equal(first,second);
  finish('done');assert.equal(await first,'done');assert.equal(await second,'done');
  assert.equal(await pool.run('games',()=>{calls++;return 'fresh';}),'fresh');assert.equal(calls,2);
  await assert.rejects(pool.run('bad',()=>{throw new Error('network');}),/network/);
  assert.equal(await pool.run('bad',()=>42),42);
});

test('saved interests use stable source ids and avoid duplicates', () => {
  const a={id:'book:one',title:'One',kind:'book'};
  assert.deepEqual(mergeInterests([a],{...a}),[a]);
});

test('interest counter reports the real selection and enforces the four-item limit', () => {
  assert.deepEqual(selectionSummary(2),{frame:2,label:'2 of 4 interests selected',valid:true});
  assert.deepEqual(selectionSummary(5),{frame:4,label:'5 selected · choose no more than 4',valid:false});
  assert.equal(selectionSummary(0).valid,false);
});

test('a manually added interest has a stable id and an approved category', () => {
  const entry=createManualInterest('  Radiohead  ','artist');
  assert.equal(entry.title,'Radiohead');
  assert.equal(entry.id,'manual:artist:radiohead');
  assert.equal(entry.source,'Your entry');
  assert.equal(createManualInterest('X','artist'),null);
  assert.equal(createManualInterest('A favorite','unknown'),null);
});

test('group playtime uses the shortest duration without implying calendar overlap', async () => {
  const {summarizePlaytime}=await import('../public/core.js');
  assert.deepEqual(summarizePlaytime(['90','60']),{minutes:60,error:null});
  assert.deepEqual(summarizePlaytime(['90','']),{minutes:null,error:null});
  assert.deepEqual(summarizePlaytime(['','']),{minutes:null,error:null});
});

test('group playtime rejects invalid entered durations', async () => {
  const {summarizePlaytime}=await import('../public/core.js');
  for(const bad of ['0','-1','1.5','1441','not-a-number']) assert.ok(summarizePlaytime(['60',bad]).error,`Expected ${bad} to be invalid`);
  assert.equal(summarizePlaytime(['1','1440']).minutes,1);
});

test('out-of-order searches keep only the newest result', async () => {
  const {createLatestGate}=await import('../public/core.js');
  const gate=createLatestGate(), displayed=[];
  let finishFirst,finishSecond;
  const first=new Promise(resolve=>{finishFirst=resolve;});
  const second=new Promise(resolve=>{finishSecond=resolve;});
  const older=gate.begin(),oldWork=first.then(value=>{if(older())displayed.push(value);});
  const newer=gate.begin(),newWork=second.then(value=>{if(newer())displayed.push(value);});
  finishSecond('new search');await newWork;
  finishFirst('old search');await oldWork;
  assert.deepEqual(displayed,['new search']);
});

test('Qloo availability check fails closed on bad responses and network timeouts', async () => {
  const {checkDiscoveryAvailability}=await import('../public/core.js');
  assert.equal(await checkDiscoveryAvailability(async()=>({ok:true,json:async()=>({configured:true})}),30),true);
  assert.equal(await checkDiscoveryAvailability(async()=>({ok:true,json:async()=>({configured:'false'})}),30),false);
  assert.equal(await checkDiscoveryAvailability(async()=>({ok:false}),30),false);
  assert.equal(await checkDiscoveryAvailability(async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted')))),20),false);
});

test('collection files require the correct version and bounded lists', () => {
  const valid=JSON.stringify({format:'find-your-next',version:1,interests:[],saved:[]});
  assert.deepEqual(parseCollectionFile(valid),{interests:[],saved:[]});
  for(const bad of ['not json',JSON.stringify({format:'other',version:1,interests:[],saved:[]}),JSON.stringify({format:'find-your-next',version:2,interests:[],saved:[]}),JSON.stringify({format:'find-your-next',version:1,interests:Array(121).fill({}),saved:[]}), 'x'.repeat(200001)]) {
    assert.throws(()=>parseCollectionFile(bad),/file|collection|supported|large/i);
  }
});

test('collection merge preserves existing data, strips invalid entries and respects capacity', () => {
  const existing={interests:[{id:'one',title:'One'}],saved:[]};
  const imported={interests:[{id:'one',title:'duplicate'},{id:'two',title:'Two'},null,{title:'bad'}],saved:[{id:'two',title:'Two',unsafe:'discard'}]};
  const clean=item=>item?.id&&item?.title?{id:item.id,title:item.title}:null;
  const merged=mergeCollection(existing,imported,clean);
  assert.deepEqual(merged.interests,[{id:'one',title:'One'},{id:'two',title:'Two'}]);
  assert.deepEqual(merged.saved,[{id:'two',title:'Two'}]);
  assert.equal(merged.added,2);assert.equal(merged.invalid,2);
  assert.deepEqual(existing,{interests:[{id:'one',title:'One'}],saved:[]});
  const full=mergeCollection({interests:Array.from({length:60},(_,i)=>({id:String(i),title:'x'})),saved:[]},{interests:[{id:'overflow',title:'Overflow'}],saved:[]},clean);
  assert.equal(full.interests.length,60);assert.equal(full.overflow,1);
});

test('uses a smaller TVmaze cover only when it has enough physical pixels', () => {
  const art={source:'TVmaze',image:'https://static.tvmaze.com/uploads/images/original_untouched/1/3.jpg',imageFallback:'https://static.tvmaze.com/uploads/images/medium_portrait/1/3.jpg'};
  assert.equal(chooseArtwork(art,140,1),art.imageFallback);
  assert.equal(chooseArtwork(art,140,2),art.image);
  assert.equal(chooseArtwork(art,0,1),art.image);
  assert.equal(chooseArtwork({...art,source:'Open Library'},140,1),art.image);
});
