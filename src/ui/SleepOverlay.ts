const ease=(value:number)=>{const p=Math.max(0,Math.min(1,value));return p*p*(3-2*p);};

/** Code-native illustration: breathing bedding, moon/stars, sea and a rising sun. */
export class SleepOverlay {
  readonly element=document.createElement('div');
  private moon:SVGElement;private sun:SVGElement;private stars:SVGElement;
  private dawn:SVGElement;private curtain:SVGElement;private blanket:SVGElement;private glow:SVGElement;private sea:SVGElement;
  constructor(root:HTMLElement){
    this.element.className='sleep-overlay';this.element.hidden=true;this.element.setAttribute('role','img');
    this.element.setAttribute('aria-label','睡梦中的小屋：月光掠过海面，星星渐隐，太阳升起。');
    this.element.innerHTML=`<svg viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sleep-room" x2="0" y2="1"><stop stop-color="#132327"/><stop offset="1" stop-color="#27383a"/></linearGradient>
        <linearGradient id="sleep-sky" x2="0" y2="1"><stop stop-color="#0b1935"/><stop offset="1" stop-color="#315773"/></linearGradient>
        <linearGradient id="sleep-dawn" x2="0" y2="1"><stop stop-color="#779cad"/><stop offset=".65" stop-color="#e4b280"/><stop offset="1" stop-color="#f2d7aa"/></linearGradient>
        <radialGradient id="sleep-lamp"><stop stop-color="#ffc776" stop-opacity=".45"/><stop offset="1" stop-color="#ffc776" stop-opacity="0"/></radialGradient>
        <clipPath id="sleep-window"><rect x="260" y="64" width="440" height="300" rx="4"/></clipPath>
      </defs>
      <rect width="960" height="540" fill="url(#sleep-room)"/>
      <g stroke="#a0aaa0" stroke-opacity=".07"><path d="M0 70H960M0 140H960M0 210H960M0 280H960M0 350H960M0 420H960"/><path d="M120 0V540M240 0V540M720 0V540M840 0V540"/></g>
      <g clip-path="url(#sleep-window)">
        <rect x="260" y="64" width="440" height="300" fill="url(#sleep-sky)"/>
        <rect data-dawn x="260" y="64" width="440" height="300" fill="url(#sleep-dawn)" opacity="0"/>
        <g data-stars fill="#ece6bf">${[[300,98],[365,145],[440,93],[570,115],[646,88],[681,165],[330,207],[510,171],[611,196]].map(([x,y],i)=>`<path opacity="${.55+i%3*.18}" d="M${x-3} ${y}h6M${x} ${y-3}v6" stroke="#ece6bf" stroke-width="2"/>`).join('')}</g>
        <g data-moon><circle cx="588" cy="135" r="30" fill="#e8dfb2"/><circle cx="602" cy="123" r="28" fill="#18314c"/></g>
        <g data-sun><circle cx="480" cy="332" r="35" fill="#ffdaa0"/><circle cx="480" cy="332" r="49" fill="#ffdb9b" opacity=".14"/></g>
        <path d="M260 266Q380 252 475 266T700 262V364H260Z" fill="#34566a"/>
        <path d="M260 291Q362 283 472 290T700 288V364H260Z" fill="#234552"/>
        <g data-sea fill="none" stroke="#acc3bd" stroke-width="2" opacity=".4"><path d="M245 304q36 -7 75 0t75 0t75 0t75 0t75 0t75 0t75 0M235 334q30 -6 65 0t65 0t65 0t65 0t65 0t65 0t65 0t65 0"/></g>
        <path d="M260 326l55 -12 14 -22 34 10 38 32v30H260" fill="#152b31"/>
        <path d="M343 310v-32h12v32M340 278h18l-9 -8Z" fill="#27393a"/>
      </g>
      <rect x="248" y="52" width="464" height="324" rx="5" fill="none" stroke="#6c5341" stroke-width="22"/>
      <rect x="257" y="61" width="446" height="306" fill="none" stroke="#ba966a" stroke-width="3"/>
      <path d="M480 64V362M262 233H698" stroke="#6c5341" stroke-width="12"/>
      <path d="M240 370H720v15H240Z" fill="#927354"/>
      <g data-curtain fill="#355458" stroke="#203b41" stroke-width="4"><path d="M237 47h79l-15 146 -19 138 -57 19Z"/><path d="M644 47h79l12 303 -58 -19 -17 -138Z"/><path d="M255 57l-7 266M279 57l-15 256M696 57l12 266M671 57l16 256" fill="none" stroke="#75928a" stroke-opacity=".25"/></g>
      <ellipse data-glow cx="793" cy="337" rx="180" ry="185" fill="url(#sleep-lamp)"/>
      <path d="M770 368h75v112h-75Z" fill="#5d4739"/><path d="M761 359h93v12h-93Z" fill="#93744e"/>
      <path d="M795 304h22v49h-22Z" fill="#26383a"/><path d="M786 305h40l-8 -14h-23Z" fill="#4d5c55"/><rect x="796" y="310" width="20" height="27" rx="3" fill="#e0b175"/>
      <path d="M127 415v-46h30v46M710 415v-46h30v46M126 434h614v71H126Z" fill="#614b3b"/>
      <path d="M138 409Q220 367 442 388L730 416v66H138Z" fill="#d4ccad"/>
      <path d="M151 405q40 -49 130 -12l-2 36 -121 4Z" fill="#e5ddbc"/>
      <g data-blanket><path d="M276 397Q419 377 557 403l171 15v75H276Z" fill="#3b6472"/><path d="M293 415Q435 397 557 419l154 13" fill="none" stroke="#92b3b1" stroke-width="4"/><path d="M334 403v87M404 398v92M474 400v90M544 408v82M614 418v72" stroke="#244754" stroke-width="3" opacity=".45"/></g>
      <path d="M121 483h623v17H121Z" fill="#8c6d4b"/>
      <path d="M62 425h45l-6 56H68Z" fill="#a08467"/><g fill="#426151"><path d="M84 427q-44 -54 -35 -86q37 16 38 70q-5 -72 24 -101q16 53 -20 104q30 -57 51 -51q1 45 -52 65Z"/></g>
      <rect width="960" height="540" fill="#07151d" opacity=".14"/>
    </svg>`;
    const find=(name:string)=>this.element.querySelector<SVGElement>(`[data-${name}]`)!;
    this.moon=find('moon');this.sun=find('sun');this.stars=find('stars');this.dawn=find('dawn');
    this.curtain=find('curtain');this.blanket=find('blanket');this.glow=find('glow');this.sea=find('sea');root.append(this.element);
  }
  show(){this.element.hidden=false;this.render(0);}
  hide(){this.element.hidden=true;}
  render(progress:number){
    const p=Math.max(0,Math.min(1,progress)),morning=ease((p-.40)/.43),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.element.style.opacity=String(Math.min(ease(p/.10),ease((1-p)/.12)));
    this.dawn.setAttribute('opacity',String(morning));this.stars.setAttribute('opacity',String(1-morning));
    this.moon.setAttribute('transform',`translate(${-p*155} ${p*65})`);this.moon.setAttribute('opacity',String(1-ease((p-.28)/.3)));
    this.sun.setAttribute('transform',`translate(0 ${-morning*145})`);this.sun.setAttribute('opacity',String(morning));
    this.sea.setAttribute('transform',`translate(${reduced?0:Math.sin(p*Math.PI*5)*14} 0)`);
    this.curtain.setAttribute('transform',`translate(${reduced?0:Math.sin(p*Math.PI*4)*2.5} 0)`);
    this.blanket.setAttribute('transform',`translate(0 ${reduced?0:-Math.sin(p*Math.PI*6)*2.2})`);
    this.glow.setAttribute('opacity',String((1-ease(p/.25))*.9+morning*.18));
  }
}
