const CHEX=['#c084fc','#34d399','#fbbf24','#f87171','#38bdf8','#fb923c'];
const CBGS=['rgba(192,132,252,.14)','rgba(52,211,153,.11)','rgba(251,191,36,.11)','rgba(248,113,113,.11)','rgba(56,189,248,.11)','rgba(251,146,60,.11)'];

const EX={
  redundant:{
    states:['A','B','C','D','E','F'],alpha:['0','1'],start:'A',finals:['C','D','E'],
    trans:{A:{'0':'B','1':'C'},B:{'0':'B','1':'D'},C:{'0':'B','1':'C'},D:{'0':'B','1':'E'},E:{'0':'B','1':'D'},F:{'0':'B','1':'C'}}
  },
  even0:{
    states:['A','B','C','D'],alpha:['0','1'],start:'A',finals:['A'],
    trans:{A:{'0':'B','1':'C'},B:{'0':'A','1':'D'},C:{'0':'D','1':'A'},D:{'0':'C','1':'B'}}
  },
  div3:{
    states:['q0','q1','q2','q3','q4','q5'],alpha:['0','1'],start:'q0',finals:['q0','q3'],
    trans:{q0:{'0':'q0','1':'q1'},q1:{'0':'q2','1':'q3'},q2:{'0':'q4','1':'q5'},q3:{'0':'q3','1':'q4'},q4:{'0':'q5','1':'q0'},q5:{'0':'q1','1':'q2'}}
  },
  ends1:{
    states:['p','q','r','s'],alpha:['0','1'],start:'p',finals:['q','s'],
    trans:{p:{'0':'p','1':'q'},q:{'0':'p','1':'q'},r:{'0':'r','1':'s'},s:{'0':'r','1':'s'}}
  }
};

let G={states:[],alpha:[],start:'',finals:new Set(),trans:{},steps:[],cur:-1};

function loadEx(k){
  const e=EX[k];
  G.states=[...e.states];G.alpha=[...e.alpha];G.start=e.start;
  G.finals=new Set(e.finals);G.trans=JSON.parse(JSON.stringify(e.trans));
  document.getElementById('ist').value=e.states.join(',');
  document.getElementById('ial').value=e.alpha.join(',');
  rebuildLeft();resetStepUI();liveRender();
}

function onCC(){
  G.states=document.getElementById('ist').value.split(',').map(x=>x.trim()).filter(Boolean);
  G.alpha=document.getElementById('ial').value.split(',').map(x=>x.trim()).filter(Boolean);
  G.finals=new Set([...G.finals].filter(s=>G.states.includes(s)));
  rebuildLeft();resetStepUI();liveRender();
}
function onStartChange(){G.start=document.getElementById('istart').value;resetStepUI();liveRender();}

function rebuildLeft(){
  const sel=document.getElementById('istart');
  const prev=sel.value;
  sel.innerHTML=G.states.map(s=>`<option value="${s}">${s}</option>`).join('');
  if(G.states.includes(prev))sel.value=prev; else sel.value=G.states[0]||'';
  G.start=sel.value;

  document.getElementById('chips').innerHTML=G.states.map(s=>
    `<div class="chip${G.finals.has(s)?' fin':''}" onclick="togFin('${s}',this)"><div class="pip"></div>${s}</div>`
  ).join('');

  buildTT();
  chkBtn();
}

function togFin(s,el){
  G.finals.has(s)?G.finals.delete(s):G.finals.add(s);
  el.classList.toggle('fin');resetStepUI();liveRender();chkBtn();
}

function buildTT(){
  const w=document.getElementById('twrap');
  if(!G.states.length||!G.alpha.length){w.innerHTML='';return;}
  G.states.forEach(s=>{if(!G.trans[s])G.trans[s]={};});
  let h=`<table class="ttbl"><thead><tr><th>δ</th>${G.alpha.map(a=>`<th>${a}</th>`).join('')}</tr></thead><tbody>`;
  G.states.forEach(s=>{
    h+=`<tr><td class="rh">${s}</td>`;
    G.alpha.forEach(a=>h+=`<td><input type="text" value="${G.trans[s]?.[a]||''}" list="sl" onchange="setT('${s}','${a}',this.value)" oninput="setT('${s}','${a}',this.value)"></td>`);
    h+=`</tr>`;
  });
  h+=`</tbody></table><datalist id="sl">${G.states.map(s=>`<option value="${s}">`).join('')}</datalist>`;
  w.innerHTML=h;
}

function setT(s,a,v){if(!G.trans[s])G.trans[s]={};G.trans[s][a]=v.trim();resetStepUI();liveRender();chkBtn();}

function chkBtn(){
  const e=validate();
  document.getElementById('errtxt').textContent=e.length?e[0]:'';
  document.getElementById('mbtn').disabled=e.length>0;
}

function validate(){
  const e=[];
  if(!G.states.length)e.push('No states defined.');
  if(!G.alpha.length)e.push('No alphabet defined.');
  if(!G.start)e.push('No start state.');
  if(!G.finals.size)e.push('At least one final state required.');
  let bad=false;
  G.states.forEach(s=>G.alpha.forEach(a=>{const t=G.trans[s]?.[a];if(!t||!G.states.includes(t))bad=true;}));
  if(bad)e.push('Fill all transitions with valid states.');
  return e;
}

// ══ GRAPH ══
function pos(sts,W,H){
  const n=sts.length,cx=W/2,cy=H/2,R=Math.min(cx,cy)*0.62,p={};
  sts.forEach((s,i)=>{const a=(2*Math.PI*i/n)-Math.PI/2;p[s]={x:cx+R*Math.cos(a),y:cy+R*Math.sin(a)};});
  return p;
}

function drawSVG(sts,alp,tr,start,finals,hl={}){
  const svg=document.getElementById('dfasvg');
  const W=document.getElementById('svgwrap').clientWidth||600;
  const H=document.getElementById('svgwrap').clientHeight||230;
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);

  if(!sts.length){svg.innerHTML=mkDefs();return;}
  const hNodes=hl.nodes||{};
  const dimmed=new Set(hl.dimmed||[]);
  const P=pos(sts,W,H);
  const r=Math.max(18,Math.min(26,Math.min(W,H)*0.1));

  // group edges
  const em={};
  sts.forEach(s=>alp.forEach(a=>{
    const t=tr[s]?.[a];if(!t||!sts.includes(t))return;
    const k=`${s}\u2192${t}`;
    if(!em[k])em[k]={from:s,to:t,syms:[]};
    em[k].syms.push(a);
  }));

  let out=mkDefs();

  // edges
  Object.entries(em).forEach(([k,{from,to,syms}])=>{
    const p1=P[from],p2=P[to];if(!p1||!p2)return;
    const lbl=syms.join(',');
    const isDim=dimmed.has(from)||dimmed.has(to);
    const ci=hNodes[from];
    const ec=ci!==undefined?CHEX[ci%CHEX.length]:(isDim?'#252535':'#3a3860');
    let d='',lx=0,ly=0;
    if(from===to){
      const sx=p1.x,sy=p1.y-r;
      d=`M${sx-11} ${sy} C${sx-36} ${sy-46} ${sx+36} ${sy-46} ${sx+11} ${sy}`;
      lx=sx;ly=sy-38;
    } else {
      const rev=em[`${to}\u2192${from}`];
      const dx=p2.x-p1.x,dy=p2.y-p1.y,len=Math.sqrt(dx*dx+dy*dy);
      const ux=dx/len,uy=dy/len,nx=-uy,ny=ux,cv=rev?28:0;
      const x1=p1.x+ux*r,y1=p1.y+uy*r,x2=p2.x-ux*r,y2=p2.y-uy*r;
      const mx=(x1+x2)/2+nx*cv,my=(y1+y2)/2+ny*cv;
      d=`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`;
      lx=(x1+x2)/2+nx*(cv+15);ly=(y1+y2)/2+ny*(cv+15);
    }
    out+=`<path d="${d}" fill="none" stroke="${ec}" stroke-width="${ci!==undefined?1.7:0.9}" marker-end="url(#ah)"/>`;
    out+=`<text x="${lx}" y="${ly+4}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="${r*0.4}" fill="${ec}">${lbl}</text>`;
  });

  // start arrow
  if(P[start]){
    const p=P[start],ang=Math.atan2(p.y-H/2,p.x-W/2);
    const ax=p.x-Math.cos(ang)*(r+26),ay=p.y-Math.sin(ang)*(r+26);
    out+=`<line x1="${ax}" y1="${ay}" x2="${p.x-Math.cos(ang)*r}" y2="${p.y-Math.sin(ang)*r}" stroke="#3a3860" stroke-width="1" marker-end="url(#ah)"/>`;
  }

  // nodes
  sts.forEach(s=>{
    const {x,y}=P[s];
    const isFin=finals.includes(s)||(finals instanceof Set&&finals.has(s));
    const isDim=dimmed.has(s);
    const ci=hNodes[s];
    const col=ci!==undefined?CHEX[ci%CHEX.length]:(isDim?'#252535':'#403e60');
    const fill=ci!==undefined?CBGS[ci%CBGS.length]:(isDim?'#0e0e14':'#15151e');
    const sw=ci!==undefined?2:0.8;
    if(isFin)out+=`<circle cx="${x}" cy="${y}" r="${r+5}" fill="none" stroke="${col}" stroke-width="0.7" stroke-dasharray="2.5 2" opacity="${isDim?.25:.45}"/>`;
    out+=`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${col}" stroke-width="${sw}"/>`;
    out+=`<text x="${x}" y="${y+1}" text-anchor="middle" dominant-baseline="central" font-family="IBM Plex Mono,monospace" font-size="${r*0.5}" fill="${ci!==undefined?CHEX[ci%CHEX.length]:(isDim?'#333355':'#8880b8')}" font-weight="500">${s}</text>`;
  });

  svg.innerHTML=out;
}

function mkDefs(){return`<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 2L9 5L1 8" fill="none" stroke="#5a5880" stroke-width="1.2" stroke-linecap="round"/></marker></defs>`;}

function liveRender(){drawSVG(G.states,G.alpha,G.trans,G.start,[...G.finals]);}

// ══ MINIMIZER ══
function computeSteps(){
  const {states:ST,alpha:AL,trans:TR,start:START,finals:FIN}=G;
  const steps=[];

  // reachable
  const reach=new Set([START]);const q=[START];
  while(q.length){const s=q.shift();AL.forEach(a=>{const t=TR[s]?.[a];if(t&&!reach.has(t)){reach.add(t);q.push(t);}});}
  const work=ST.filter(s=>reach.has(s));
  const unreach=ST.filter(s=>!reach.has(s));

  // step 0: intro
  steps.push({
    kind:'intro',title:'Original DFA',
    explain:`We have a DFA with <strong>${ST.length} states</strong> over alphabet {${AL.map(a=>`<strong>${a}</strong>`).join(', ')}}.<br><br>
      The <em>partition refinement</em> algorithm (Myhill-Nerode theorem) finds states that behave identically on all inputs and merges them into one.<br><br>
      ${unreach.length?`<div class="snote"><span class="ns">Note:</span> States {${unreach.join(', ')}} are <em>unreachable</em> from start state <strong>${START}</strong> and will be removed before minimization begins.</div>`:'All states are reachable from <strong>'+START+'</strong>.'}`,
    hl:{},
    gst:ST,gtr:TR,gstart:START,gfin:[...FIN],part:null
  });

  // step: remove unreachable
  if(unreach.length){
    steps.push({
      kind:'unreach',title:'Remove unreachable states',
      explain:`<strong>States {${unreach.join(', ')}}</strong> cannot be reached by any sequence of inputs starting from <strong>${START}</strong>.<br><br>
        Since they are unreachable, they can never affect whether a string is accepted — we discard them now.<br><br>
        Remaining working states: {${work.join(', ')}}.`,
      hl:{nodes:Object.fromEntries(unreach.map(s=>[s,3])),dimmed:unreach},
      gst:ST,gtr:TR,gstart:START,gfin:[...FIN],part:null
    });
  }

  // initial partition
  const fin=work.filter(s=>FIN.has(s));
  const nfin=work.filter(s=>!FIN.has(s));
  let part=[];
  if(fin.length)part.push([...fin]);
  if(nfin.length)part.push([...nfin]);

  const gof=s=>part.findIndex(g=>g.includes(s));
  const snap=p=>p.map(g=>[...g]);

  steps.push({
    kind:'init',title:'Step 0 — Initial partition',
    explain:`<strong>Base case:</strong> We split all states into two groups based on accepting status.<br><br>
      <span style="color:${CHEX[0]}">● Group 0 — Final states:</span> {${fin.join(', ')}}<br>
      <span style="color:${CHEX[1]}">● Group 1 — Non-final states:</span> {${nfin.join(', ')}}<br><br>
      A final state accepts the empty string ε; a non-final state rejects it. They are immediately distinguishable and <em>must</em> be in separate groups.`,
    hl:{nodes:Object.fromEntries(work.map(s=>[s,fin.includes(s)?0:1])),dimmed:unreach},
    gst:work,gtr:TR,gstart:START,gfin:[...FIN],part:snap(part)
  });

  // refinement
  let iter=0;
  for(;;){
    const sigOf=s=>AL.map(a=>{const t=TR[s]?.[a];return t&&gof(t)>=0?gof(t):-1;}).join(',');
    let changed=false;
    const newPart=[];
    const splits=[];

    part.forEach((grp,gi)=>{
      if(grp.length===1){newPart.push([...grp]);return;}
      const bySig={};
      grp.forEach(s=>{const sig=sigOf(s);if(!bySig[sig])bySig[sig]=[];bySig[sig].push(s);});
      const subs=Object.values(bySig);
      if(subs.length>1){
        changed=true;
        splits.push({gi,grp:[...grp],subs,sigMap:bySig});
        subs.forEach(sg=>newPart.push(sg));
      } else {
        newPart.push([...grp]);
      }
    });

    if(!changed){
      steps.push({
        kind:'conv',title:`Iteration ${iter+1} — Converged`,
        explain:`Running iteration ${iter+1}, we check every group: do all members agree on which group each transition leads to?<br><br>
          <strong style="color:var(--c1)">Yes — no group needs splitting.</strong><br><br>
          Every pair of states in the same group transitions to the same group on every symbol. They are truly indistinguishable.<br><br>
          The partition has <strong>stabilized</strong>. The algorithm terminates here.`,
        hl:{nodes:Object.fromEntries(work.map(s=>[s,gof(s)])),dimmed:unreach},
        gst:work,gtr:TR,gstart:START,gfin:[...FIN],part:snap(part),converged:true
      });
      break;
    }

    part=newPart;

    let expl=`<strong>Iteration ${iter+1} — Splitting:</strong><br><br>`;
    splits.forEach(({gi,grp,subs,sigMap})=>{
      expl+=`Group {${grp.join(', ')}} must split — states disagree on transitions:<br>`;
      Object.entries(sigMap).forEach(([sig,ss])=>{
        const parts=sig.split(',');
        const sigStr=AL.map((a,i)=>`δ(·,<strong>${a}</strong>)→G${parts[i]}`).join(', ');
        expl+=`<div class="snote"><span class="ns">{${ss.join(', ')}}</span>: ${sigStr}</div>`;
      });
      expl+=`<br>`;
    });
    expl+=`Partition now has <strong>${part.length} groups</strong>.`;

    steps.push({
      kind:'split',title:`Iteration ${iter+1} — Split`,
      explain:expl,splits,
      hl:{nodes:Object.fromEntries(work.map(s=>[s,part.findIndex(g=>g.includes(s))])),dimmed:unreach},
      gst:work,gtr:TR,gstart:START,gfin:[...FIN],part:snap(part)
    });

    iter++;if(iter>25)break;
  }

  // build minimized DFA
  const gofF=s=>part.findIndex(g=>g.includes(s));
  const minSts=part.map((_,i)=>`P${i}`);
  const minStart=`P${gofF(START)}`;
  const minFin=new Set(part.map((g,i)=>g.some(s=>FIN.has(s))?`P${i}`:null).filter(Boolean));
  const minTr={};
  part.forEach((g,i)=>{const rep=g[0];minTr[`P${i}`]={};AL.forEach(a=>{const t=TR[rep]?.[a];if(t&&gofF(t)>=0)minTr[`P${i}`][a]=`P${gofF(t)}`;});});

  const mapLines=part.map((g,i)=>`<span style="color:${CHEX[i%CHEX.length]}">P${i}</span> = {${g.join(', ')}}${minFin.has(`P${i}`)?' <span style="color:var(--c2)">★ final</span>':''}`).join('<br>');

  steps.push({
    kind:'min',title:'Minimized DFA',
    explain:`<strong style="color:var(--c1)">Done!</strong> Each equivalence class becomes one state:<br><br>
      ${mapLines}<br><br>
      <strong>${ST.length}</strong> states → <strong style="color:var(--c1)">${minSts.length}</strong> states &nbsp;·&nbsp; <strong style="color:var(--c1)">${ST.length-minSts.length}</strong> removed (<strong style="color:var(--c1)">${Math.round((1-minSts.length/ST.length)*100)}%</strong> smaller)`,
    hl:{nodes:Object.fromEntries(minSts.map((s,i)=>[s,i]))},
    gst:minSts,gtr:minTr,gstart:minStart,gfin:[...minFin],
    part:snap(part),converged:true,isMin:true,
    minInfo:{minSts,minStart,minFin,minTr,part}
  });

  return steps;
}

function startMin(){G.steps=computeSteps();G.cur=0;showStep(0);}
function goNext(){if(G.cur<G.steps.length-1){G.cur++;showStep(G.cur);}}
function goPrev(){if(G.cur>0){G.cur--;showStep(G.cur);}}

function showStep(idx){
  const s=G.steps[idx],n=G.steps.length;
  document.getElementById('sctr').textContent=`Step ${idx+1} / ${n}`;
  document.getElementById('bprev').disabled=idx===0;
  document.getElementById('bnext').disabled=idx===n-1;
  document.getElementById('stitle').textContent=s.title;
  document.getElementById('glabel').textContent=s.isMin?'Minimized DFA':'DFA (working)';
  const cb=document.getElementById('cbadge');
  s.converged?cb.classList.add('show'):cb.classList.remove('show');

  drawSVG(s.gst,G.alpha,s.gtr,s.gstart,s.gfin,s.hl);

  document.getElementById('sexpl').innerHTML=`<div class="anim">${s.explain}</div>`;
  renderPartTable(s);
}

function renderPartTable(s){
  const w=document.getElementById('pwrap');
  if(!s.part){w.innerHTML=`<div style="color:var(--dim);padding:16px;text-align:center;font-size:11px">Not applicable</div>`;return;}

  const part=s.part,alp=G.alpha,tr=s.gtr;
  const gof=st=>part.findIndex(g=>g.includes(st));

  let h=`<div class="grprow">`;
  part.forEach((g,i)=>h+=`<div class="gpill" style="border-color:${CHEX[i%CHEX.length]}55;color:${CHEX[i%CHEX.length]};background:${CBGS[i%CBGS.length]}">G${i}:{${g.join(',')}}</div>`);
  h+=`</div>`;

  h+=`<table class="ptbl"><thead><tr><th>State</th><th>G</th>`;
  alp.forEach(a=>h+=`<th>δ·${a}→</th>`);
  h+=`<th>Sig</th></tr></thead><tbody>`;

  part.forEach((g,gi)=>{
    g.forEach((st,si)=>{
      const sigParts=alp.map(a=>{const t=tr[st]?.[a];const tg=t!==undefined?gof(t):-1;return tg>=0?`G${tg}`:'?';});
      h+=`<tr>
        <td style="color:${CHEX[gi%CHEX.length]};font-weight:500">${st}</td>
        <td style="color:${CHEX[gi%CHEX.length]}">G${gi}</td>`;
      alp.forEach((a,ai)=>{
        const t=tr[st]?.[a];const tg=t!==undefined?gof(t):-1;
        const tc=tg>=0?CHEX[tg%CHEX.length]:'var(--dim)';
        h+=`<td style="color:${tc}">${tg>=0?`G${tg}`:'?'}</td>`;
      });
      h+=`<td style="color:var(--muted);font-size:9px">${sigParts.join(',')}</td></tr>`;
    });
    if(gi<part.length-1)h+=`<tr class="sep"><td colspan="${3+alp.length}"></td></tr>`;
  });

  h+=`</tbody></table>`;
  w.innerHTML=`<div class="anim">${h}</div>`;
}

function resetStepUI(){
  G.steps=[];G.cur=-1;
  document.getElementById('sctr').textContent='';
  document.getElementById('bprev').disabled=true;
  document.getElementById('bnext').disabled=true;
  document.getElementById('stitle').textContent='';
  document.getElementById('cbadge').classList.remove('show');
  document.getElementById('sexpl').innerHTML=`<div class="idle"><svg width="36" height="36" viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="16" stroke="currentColor" stroke-width="1.4"/><path d="M18 10v9l5 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/></svg><span>Click Minimize to start step-by-step</span></div>`;
  document.getElementById('pwrap').innerHTML=`<div style="color:var(--dim);padding:16px;text-align:center;font-size:11px">No data yet</div>`;
  document.getElementById('glabel').textContent='Live DFA';
}

window.addEventListener('resize',()=>{
  if(G.cur>=0&&G.steps.length){const s=G.steps[G.cur];drawSVG(s.gst,G.alpha,s.gtr,s.gstart,s.gfin,s.hl);}
  else liveRender();
});

document.getElementById('istart').addEventListener('change',onStartChange);
loadEx('redundant');
