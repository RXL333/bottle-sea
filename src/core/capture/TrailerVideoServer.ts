import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdir,rename,stat,writeFile } from 'node:fs/promises';
import type { IncomingMessage,ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Plugin } from 'vite';

interface ExportRequest {batch:string;shot:string;ordinal:number;frames:number;width:number;height:number;fps:number}
interface ExportJob {request:ExportRequest;token:string;encoder:ChildProcessWithoutNullStreams;done:Promise<void>;folder:string;file:string;frames:number}
export function validVideoRequest(value:ExportRequest){return typeof value?.batch==='string'&&typeof value.shot==='string'&&/^[a-z][a-z0-9-]{0,48}$/.test(value.shot)&&Number.isInteger(value.ordinal)&&value.ordinal>=1&&value.ordinal<=10&&Number.isInteger(value.frames)&&value.frames>=30&&value.frames<=5400&&value.width===1920&&value.height===1080&&value.fps===30;}
export function validVideoFrame(bytes:Buffer,width:number,height:number){return bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&bytes.toString('ascii',12,16)==='IHDR'&&bytes.readUInt32BE(16)===width&&bytes.readUInt32BE(20)===height;}
async function body(req:IncomingMessage){const chunks:Buffer[]=[];let size=0;for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>12*1024*1024)throw new Error('Frame exceeds size limit');chunks.push(bytes);}return Buffer.concat(chunks);}
function reply(res:ServerResponse,status:number,value:unknown){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}

/** Loopback-only DEV encoder. It cannot read or write any gameplay save state. */
export function trailerVideoServer(projectRoot:string):Plugin {
  const batches=new Map<string,string>(),records=new Map<string,unknown[]>();let active:ExportJob|undefined;
  return {name:'bottle-sea-trailer-video-export',apply:'serve',configureServer(server){
    server.httpServer?.once('close',()=>active?.encoder.kill());
    server.middlewares.use('/__trailer_video',(req,res)=>{void (async()=>{
      const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress??'');
      if(!local||req.method!=='POST'||req.headers.origin!==`http://${req.headers.host}`){reply(res,403,{error:'Only same-origin loopback exports are allowed'});return;}
      const route=(req.url??'').split('?')[0];
      if(route==='/batch'){
        const id=`${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID().slice(0,8)}`,folder=resolve(projectRoot,'artifacts/trailer-samples',id);
        await mkdir(folder,{recursive:true});batches.set(id,folder);records.set(id,[]);reply(res,200,{batch:id});return;
      }
      if(route==='/start'){
        if(active)throw new Error('Another export is active');
        const request=JSON.parse((await body(req)).toString()) as ExportRequest,folder=batches.get(request.batch);
        if(!validVideoRequest(request)||!folder)throw new Error('Invalid export request');
        const file=`${String(request.ordinal).padStart(2,'0')}-${request.shot}.mp4`,partial=resolve(folder,`${file}.partial.mp4`);
        if(await stat(resolve(folder,file)).then(()=>true,()=>false))throw new Error('Completed clip already exists');
        const encoder=spawn(process.env.BOTTLE_SEA_FFMPEG??'ffmpeg',['-hide_banner','-loglevel','error','-n','-f','image2pipe','-framerate','30','-vcodec','png','-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','16','-pix_fmt','yuv420p','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-movflags','+faststart',partial],{windowsHide:true,stdio:'pipe'});
        let errors='';encoder.stderr.on('data',data=>{errors=(errors+String(data)).slice(-3000);});encoder.stdout.resume();encoder.stdin.on('error',()=>{});
        const done=new Promise<void>((accept,reject)=>{encoder.once('error',reject);encoder.once('close',code=>code===0?accept():reject(new Error(errors||`Encoder exited ${code}`)));});void done.catch(()=>{});
        await new Promise<void>((accept,reject)=>{encoder.once('spawn',accept);encoder.once('error',reject);});
        active={request,token:randomUUID(),encoder,done,folder,file,frames:0};reply(res,200,{token:active.token});return;
      }
      const job=active;if(!job||req.headers['x-capture-token']!==job.token)throw new Error('No matching export session');
      if(route==='/frame'){
        if(Number(req.headers['x-frame-index'])!==job.frames||job.frames>=job.request.frames)throw new Error('Unexpected frame index');
        const png=await body(req);if(!validVideoFrame(png,job.request.width,job.request.height))throw new Error('Frame dimensions or PNG signature are invalid');
        await new Promise<void>((accept,reject)=>job.encoder.stdin.write(png,error=>error?reject(error):accept()));job.frames++;reply(res,200,{frames:job.frames});return;
      }
      if(route==='/finish'){
        if(job.frames!==job.request.frames)throw new Error('Incomplete frame sequence');job.encoder.stdin.end();await job.done;
        await rename(resolve(job.folder,`${job.file}.partial.mp4`),resolve(job.folder,job.file));
        const record={file:job.file,shot:job.request.shot,width:1920,height:1080,fps:30,frames:job.frames,duration:job.frames/30,audio:false};records.get(job.request.batch)!.push(record);
        await writeFile(resolve(job.folder,'manifest.json'),JSON.stringify({format:'H.264 MP4 / 16:9 / no audio',clips:records.get(job.request.batch)},null,2));active=undefined;
        reply(res,200,{...record,path:`artifacts/trailer-samples/${job.request.batch}/${job.file}`});return;
      }
      if(route==='/cancel'){job.encoder.kill();active=undefined;reply(res,200,{cancelled:true});return;}
      throw new Error('Unknown export action');
    })().catch(error=>{reply(res,400,{error:error instanceof Error?error.message:String(error)});});});
  }};
}
