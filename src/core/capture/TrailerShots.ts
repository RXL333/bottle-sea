import { lookPose } from './CameraPath';
import type { CapturePath } from './CameraPath';
import type { SeasonId } from '../../gameplay/calendar/SeasonRegistry';
import { seasonDefinition } from '../../gameplay/calendar/SeasonRegistry';
import type { WeatherKind } from '../../systems/WeatherState';
export type CaptureWorld='HOME'|'FARM'|'TRAVEL';
export interface TrailerShot {id:string;name:string;world:CaptureWorld;hour:number;season:SeasonId;weather:WeatherKind;path:CapturePath;subject?:'sea'|'tractor'|'combine';followOffset?:[number,number,number];sequence?:'seasons'|'weather';bottle?:boolean;notes:string}
const path=(duration:number,frames:Parameters<typeof lookPose>[]):CapturePath=>({duration,poses:frames.map(f=>lookPose(...f))});
export const TRAILER_SHOTS:readonly TrailerShot[]=[
  {id:'bottle-reveal',name:'Bottle Reveal · 瓶中世界',world:'HOME',hour:12,season:'spring',weather:'CLEAR',bottle:true,notes:'瓶外向前缓推，整个家园岛与瓶身保持在竖屏中心。',path:path(14,[[[.5,7,45],[.5,3.2,0],42],[[.5,6,36],[.5,3.2,0],42]])},
  {id:'home-flyover',name:'Home Island Flyover · 家园飞越',world:'HOME',hour:9,season:'summer',weather:'CLEAR',notes:'从小屋掠向码头与灯塔，最后望向海面；使用连续曲线。',path:path(22,[[[-3.6,5.8,2.6],[-1.55,4.15,.25],52],[[1.2,5.5,3.8],[.4,3.8,1.5],52],[[2.2,6.5,.8],[.1,4.8,-.7],52],[[1.3,6,4.8],[0,3.4,-2],52]])},
  {id:'looking-at-sea',name:'Looking at the Sea · 向海而望',world:'HOME',hour:8,season:'spring',weather:'CLEAR',subject:'sea',notes:'角色背影为中心，镜头从身后缓慢升高，海平线保持入镜。',path:path(12,[[[.65,4.45,.7],[.65,3.97,1.85],48],[[.65,5.4,-2],[.65,4.9,2.4],48]])},
  {id:'farm-reveal',name:'Farm Reveal · 田野展开',world:'FARM',hour:10,season:'summer',weather:'CLEAR',notes:'从码头开始升高拉远，三块主田居中；整座农场保留竖屏构图。',path:path(20,[[[-4,6.5,20],[0,4,-8],54],[[0,115,90],[0,4,-27],54]])},
  {id:'tractor-pass',name:'Tractor Field Pass · 麦田驶过',world:'FARM',hour:10,season:'summer',weather:'CLEAR',subject:'tractor',notes:'低机位静候拖拉机从麦田通道驶过，自动驾驶与真实车轮动画。',path:path(14,[[[4.5,4.85,-17],[0,4.75,-12],56],[[4.8,4.95,-17.5],[0,4.75,-22],56]])},
  {id:'combine-harvest',name:'Combine Harvest · 收割时刻',world:'FARM',hour:15,season:'autumn',weather:'CLEAR',subject:'combine',notes:'45° 侧后方跟随，真实割台与成熟小麦收割，临时粮仓接收产物。',path:path(18,[[[6.5,7.132,-5.5],[0,4.932,-12.4],52],[[6.5,7.132,-15.5],[0,4.932,-22.4],52]])},
  {id:'farm-life',name:'Farm Life · 牧场日常',world:'FARM',hour:10,season:'spring',weather:'CLEAR',notes:'羊群置于前景，谷仓与风车在背景；轻缓横移并升高。',path:path(16,[[[25.7,5,-60],[26,4.6,-50],52],[[26.3,5.25,-60],[26,4.6,-50],52]])},
  {id:'four-seasons',name:'Four Seasons · 四季田园',world:'FARM',hour:10,season:'spring',weather:'CLEAR',sequence:'seasons',notes:'固定机位和时间，每 8 秒切换一个季节；也可手动选择季节分别录制。',path:path(32,[[[-7,9,-3],[0,5,-20],48],[[-7,9,-3],[0,5,-20],48]])},
  {id:'weather-timelapse',name:'Weather Timelapse · 天气流转',world:'FARM',hour:6.4,season:'spring',weather:'CLEAR',sequence:'weather',notes:'相同构图：晨雾 → 阴天 → 雨天 → 黄昏晴朗；画面逐渐过渡。',path:path(28,[[[-7,8,-2],[0,5,-20],48],[[-7,8,-2],[0,5,-20],48]])},
  {id:'sunset-pullback',name:'Final Sunset Pullback · 日落远航',world:'HOME',hour:seasonDefinition('summer').sunset-.2,season:'summer',weather:'CLEAR',subject:'sea',notes:'玩家背对镜头，缓慢后退并升高，海岛与黄昏海平线留在竖屏中心。',path:path(18,[[[.65,4.45,.7],[.65,3.97,1.85],48],[[.65,9,-8],[.65,5.7,2.1],48]])},
];
export function trailerShot(id:string){return TRAILER_SHOTS.find(s=>s.id===id)??TRAILER_SHOTS[0];}
