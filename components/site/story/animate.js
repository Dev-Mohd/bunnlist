// Drives the home page story with the scroll: each room reads its line word by word and plays its drawing.
// Plain JavaScript on purpose: it only moves and fades markup that is already complete without it.
export function animateStory(root){

  function $(i){return root.querySelector('#'+i)} function all(q){return [].slice.call(root.querySelectorAll(q))}
  function cl(x){return Math.max(0,Math.min(1,x))} function pr(x,a,b){return cl((x-a)/(b-a))} function ease(x){return 1-Math.pow(1-x,3)}
  function mix(a,b,t){return 'rgb('+a.map(function(v,i){return Math.round(v+(b[i]-v)*t)}).join(',')+')'}
  var NS='http://www.w3.org/2000/svg';
  // each room: its line (numbers count up), the bar colours while it is on screen, and what its drawing does with the scroll
  var BAR={r1:['#E2B75C',0],r3:['#EADFC8',0],r4:['#171411',1],r5:['#F7F1E8',0],r6:['#536344',1],r7:['#E2B75C',0],r8:['#4A3428',1],more:['#F7F1E8',0],end:['#E2B75C',0]};
  var rooms=[2,7,3,4,5,6,8].map(function(i){var el=$('r'+i),spans=[].slice.call($('line'+i).querySelectorAll('span')),nums=[];
    spans.forEach(function(s,k){if(s.dataset.n)nums.push([+s.dataset.n,k,s])});
    return {i:i,el:el,spans:spans,nums:nums}});
  var bar=$('bar'),rail=$('rail'),rm=$('railmark'),bns=all('.bn'),tapes=all('.tp'),ghost=$('ghost');
  // room 2
  var bean=$('bean2'),bed=$('bed'),fill=$('fill'),strokes=all('.dr'),drops=all('.drop');strokes.forEach(function(p){p.style.strokeDasharray=1});
  // room 3: grains under the dial
  var grains=$('grains'),gr=[];for(var k=0;k<11;k++){var c=document.createElementNS(NS,'circle');c.setAttribute('cy',430+(k%2?10:-6));grains.appendChild(c);gr.push(c)}
  var dial=$('dial'),clicks=$('clicks'),glab=$('glab');
  // room 4
  var clock=$('clock'),sgs=all('.sg'),step=$('step'),grams=$('grams'),waves=all('#waves path');
  var STEPS=[[0,'تفتيح','50g'],[45,'صبّ لين 120','120g'],[75,'صبّ لين 180','180g'],[105,'صبّ لين 240','240g'],[135,'صبّ لين 300','300g'],[180,'بالعافية','']];
  // room 5
  var rgs=all('.rg'),chips=all('.chip'),tcount=$('tcount');
  // room 6
  var avs=all('.av'),fpill=$('fpill');
  var qqs=all('.qq'),pick=$('pick'),pks=all('.pk'),rays=$('rays'),mores=all('#morelist li');
  function pop(g,q,sc){var m=g.getAttribute('transform').match(/translate\(([^)]+)\)/)[1];g.setAttribute('transform','translate('+m+') scale('+(sc+(1-sc)*q)+')');g.style.opacity=0.25+0.75*q}
  var SCENE={
    2:function(p,el){var room=mix([83,99,68],[74,52,40],pr(p,0.52,0.7));el.style.background=room;BAR.r2=[room,1];
      strokes.forEach(function(s,i){var q=pr(p,i*0.035,0.2+i*0.035);s.style.strokeDashoffset=(1-ease(q)).toFixed(3);s.style.opacity=0.25+0.75*q});
      var f=pr(p,0.12,0.42);bean.setAttribute('transform','translate('+(180+Math.sin(f*5)*14*(1-f))+' '+(-60+f*f*300)+') rotate('+(-30+f*200)+')');bean.style.opacity=1-pr(p,0.42,0.5);
      bed.setAttribute('y',290-ease(pr(p,0.42,0.58))*120);var dp=p>0.55&&p<0.97;drops.forEach(function(d){d.classList.toggle('on',dp)});
      fill.setAttribute('y',480-pr(p,0.58,0.97)*120);ghost.style.transform='translateY('+((0.5-p)*30)+'svh) scale('+(0.8+p*0.5)+')'},
    3:function(p){var q=pr(p,0.08,0.92);dial.setAttribute('transform','rotate('+(q*300-150)+' 180 232)');clicks.textContent=Math.round(30-q*22);
      glab.textContent=q<0.34?'خشنة':q<0.67?'متوسطة':'ناعمة';var n=gr.length,r=15-10.5*q,gap=(300-0)/(n-1);
      gr.forEach(function(c,k){c.setAttribute('r',r.toFixed(1));c.setAttribute('cx',30+k*gap)})},
    4:function(p){var t=Math.round(pr(p,0.06,0.9)*180);clock.textContent=Math.floor(t/60)+':'+('0'+t%60).slice(-2);
      sgs.forEach(function(g){g.setAttribute('width',(pr(t,+g.dataset.a,+g.dataset.b)*g.dataset.w).toFixed(1))});
      var cur=STEPS[0];STEPS.forEach(function(s){if(t>=s[0])cur=s});step.textContent=cur[1];grams.textContent=cur[2];
      waves.forEach(function(w,k){w.style.opacity=t>0&&t<180?(0.25+0.75*Math.max(0,Math.sin(t*0.5-k*0.9))).toFixed(2):0.25})},
    5:function(p){rgs.forEach(function(r,k){r.setAttribute('stroke-dasharray',(r.dataset.len*ease(pr(p,0.08+k*0.1,0.24+k*0.1))).toFixed(1)+' 691.15')});
      tcount.textContent=Math.round(pr(p,0.08,0.7)*48);
      chips.forEach(function(c){var q=ease(pr(p,+c.dataset.at,+c.dataset.at+0.1));var m=c.getAttribute('transform').match(/translate\(([^)]+)\)/)[1];c.setAttribute('transform','translate('+m+') scale('+(0.3+0.7*q)+')');c.style.opacity=0.25+0.75*q})},
    6:function(p){avs.forEach(function(a,k){var an=(k*60+p*150-90)*Math.PI/180,q=ease(pr(p,0.05+k*0.07,0.2+k*0.07));
        a.setAttribute('transform','translate('+(180+Math.cos(an)*150)+' '+(230+Math.sin(an)*150)+') scale('+(0.4+0.6*q)+')');a.style.opacity=0.3+0.7*q});
      var f=ease(pr(p,0.5,0.65));fpill.setAttribute('transform','translate(180 453) scale('+(0.5+0.5*f)+') translate(-180 -453)');fpill.style.opacity=0.3+0.7*f}};
  SCENE[7]=function(p){qqs.forEach(function(g,k){var q=ease(pr(p,0.06+k*0.13,0.18+k*0.13));g.setAttribute('transform','translate('+((1-q)*(k%2?-60:60))+' 0)');g.style.opacity=0.25+0.75*q;
      var c=pr(p,0.2+k*0.13,0.26+k*0.13);[].forEach.call(g.querySelectorAll('.qc'),function(e){e.style.opacity=c})});
    var f=ease(pr(p,0.68,0.84));pick.setAttribute('transform','translate(0 '+((1-f)*40)+')');pick.style.opacity=0.25+0.75*f};
  SCENE[8]=function(p){rays.setAttribute('transform','rotate('+(p*120)+' 180 230)');pks.forEach(function(g){pop(g,ease(pr(p,+g.dataset.at,+g.dataset.at+0.1)),0.4)})};
  BAR.r2=['#536344',1];
  var order=['r1','r2','r7','r3','r4','r5','r6','r8','more','end'].map($);
  var ticking=false;
  function frame(){ticking=false;
    var vh=window.innerHeight,doc=document.documentElement,total=Math.max(1,doc.scrollHeight-vh),y=window.scrollY||doc.scrollTop,g=cl(y/total);
    rm.style.transform='translateY('+(g*(rail.clientHeight*0.72-40))+'px)';
    bns.forEach(function(b){b.style.transform='translateY('+(y*parseFloat(b.dataset.sp))+'px) rotate('+(parseFloat(b.dataset.rot)+y*0.12*parseFloat(b.dataset.sp))+'deg)'});
    tapes.forEach(function(t){var r=t.parentNode.getBoundingClientRect();t.style.transform='translateX('+(-260+(+t.dataset.dir)*(r.top-vh/2)*0.4)+'px)'});
    rooms.forEach(function(R){var b=R.el.getBoundingClientRect();if(b.bottom<-vh||b.top>vh*2)return;
      var p=cl(-b.top/Math.max(1,b.height-vh)),n=R.spans.length;
      R.spans.forEach(function(s,i){var q=ease(pr(p*(n+4),i,i+1.4));s.style.opacity=(0.2+0.8*q).toFixed(2);s.style.transform='translateY('+((1-q)*18)+'px) rotate('+((1-q)*(i%2?4:-4))+'deg)'});
      R.nums.forEach(function(c){var q=pr(p*(n+4),c[1]-0.5,c[1]+1.6);c[2].textContent=q<=0?c[0]:Math.round(c[0]*ease(q))});
      SCENE[R.i](p,R.el)});
    mores.forEach(function(li,k){var r=li.getBoundingClientRect(),q=ease(pr(vh*0.92-r.top,0,vh*0.25));li.style.opacity=(0.3+0.7*q).toFixed(2);li.style.transform='translateY('+((1-q)*16)+'px) rotate('+((1-q)*(k%2?3:-3))+'deg)'});
    // past the story (the questions and the footer) the bar and the side marker step away
    var gone=root.getBoundingClientRect().bottom<80;bar.style.opacity=rail.style.opacity=gone?0:1;bar.style.pointerEvents=gone?'none':'';
    var cur='r1';order.forEach(function(el){if(el.getBoundingClientRect().top<40)cur=el.id});var bc=BAR[cur],dark=bc[1];
    bar.style.setProperty('--bar-bg',bc[0]);bar.style.setProperty('--bar-fg',dark?'#F7F1E8':'#171411');rail.style.color=dark?'#F7F1E8':'#171411';
    bar.style.setProperty('--get-bg',dark?'#E2B75C':'#171411');bar.style.setProperty('--get-fg',dark?'#171411':'#F7F1E8');
  }
  function req(){if(!ticking){ticking=true;requestAnimationFrame(frame)}}
  window.addEventListener('scroll',req,{passive:true});window.addEventListener('resize',req);frame();
  return function(){window.removeEventListener('scroll',req);window.removeEventListener('resize',req)};
}
