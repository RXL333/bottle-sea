import type { Game } from '../Game';
import type { TrailerCaptureMode } from './TrailerCaptureMode';
import { TRAILER_SHOTS } from './TrailerShots';

interface VideoResult {path:string;duration:number;frames:number}
export class TrailerVideoExporter {
  running=false;cancelled=false;readonly files:VideoResult[]=[];
  constructor(private game:Game,private capture:TrailerCaptureMode,private progress:(text:string)=>void){}
  cancel(){this.cancelled=true;}
  private async post<T>(action:string,payload:unknown,token?:string,index?:number):Promise<T>{
    const image=payload instanceof Blob,headers:Record<string,string>={'Content-Type':image?'image/png':'application/json'};
    if(token)headers['x-capture-token']=token;if(index!==undefined)headers['x-frame-index']=String(index);
    const response=await fetch(`/__trailer_video/${action}`,{method:'POST',headers,body:image?payload:JSON.stringify(payload)}),value=await response.json() as T&{error?:string};
    if(!response.ok)throw new Error(value.error??'Local video export failed');return value;
  }
  async exportAll(){
    if(this.running||this.capture.busy)return;this.running=true;this.cancelled=false;this.files.length=0;
    const previous={aspect:this.capture.aspect,quality:this.game.renderer.quality,scale:this.game.renderer.renderScale,hud:this.capture.hideHud,hidden:this.capture.panel.hidden};let token:string|undefined;
    this.capture.panel.dataset.exporting='true';this.capture.panel.dataset.videoState='recording';this.capture.panel.dataset.videoFiles='[]';delete this.capture.panel.dataset.videoBatch;this.capture.hideHud=true;document.body.classList.add('trailer-clean');this.game.loop.stop();
    try{
      const {batch}=await this.post<{batch:string}>('batch',{});this.capture.panel.dataset.videoBatch=batch;
      this.game.captureQuality('HIGH');this.capture.aspect='landscape';this.capture.outputSize={width:1920,height:1080};
      for(const [ordinal,shot] of TRAILER_SHOTS.entries()){
        if(this.cancelled)break;await this.capture.selectShot(shot.id);this.capture.play();this.game.renderCaptureFrame(0);
        const frames=Math.round(shot.path.duration*30);token=(await this.post<{token:string}>('start',{batch,shot:shot.id,ordinal:ordinal+1,frames,width:1920,height:1080,fps:30})).token;
        for(let index=0;index<frames;index++){
          if(this.cancelled)throw new Error('拍摄已取消，已完成视频保留。');
          const target=shot.path.duration*index/(frames-1);this.game.renderCaptureFrame(Math.max(0,target-this.capture.path.elapsed));
          const png=await new Promise<Blob>((accept,reject)=>this.game.renderer.domElement.toBlob(blob=>blob?accept(blob):reject(new Error('Canvas export failed')),'image/png'));
          await this.post('frame',png,token,index);
          if(index%15===0||index===frames-1){this.progress(`正在拍摄 ${ordinal+1}/10 · ${shot.name} · ${index+1}/${frames} 帧`);this.capture.panel.dataset.videoProgress=JSON.stringify({shot:shot.id,clip:ordinal+1,frame:index+1,frames});}
        }
        this.progress(`正在封装 ${ordinal+1}/10 · ${shot.name}`);const result=await this.post<VideoResult>('finish',{},token);token=undefined;this.files.push(result);this.capture.panel.dataset.videoFiles=JSON.stringify(this.files);
      }
      this.progress(`已完成 ${this.files.length}/10 个横屏 MP4 · ${batch}`);this.capture.panel.dataset.videoState=this.cancelled?'cancelled':'complete';
    }catch(error){if(token)await this.post('cancel',{},token).catch(()=>{});this.progress(error instanceof Error?error.message:String(error));this.capture.panel.dataset.videoState=this.cancelled?'cancelled':'failed';}
    finally{this.capture.path.stop();this.capture.scene.stop();this.capture.outputSize=undefined;this.capture.aspect=previous.aspect;this.capture.hideHud=previous.hud;this.capture.panel.hidden=previous.hidden;document.body.classList.toggle('trailer-clean',previous.hud);this.game.captureQuality(previous.quality);this.game.renderer.renderScale=previous.scale;this.game.renderer.resize();delete this.capture.panel.dataset.exporting;this.running=false;this.game.loop.start();}
  }
}
