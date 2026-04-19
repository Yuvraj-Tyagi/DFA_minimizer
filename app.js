/* ─────────────────────────── THEME ─────────────────────────── */
let isLightMode = false;
function toggleTheme() {
  isLightMode = !isLightMode;
  document.documentElement.setAttribute('data-theme', isLightMode ? 'light' : 'dark');
  document.getElementById('theme-btn').innerHTML = isLightMode ? '🌙 Dark Mode' : '☀️ Light Mode';
  updateCyTheme();
}
function getThemeColors() {
  return { bg: isLightMode ? '#F8FAFC' : '#1B1E23', border: isLightMode ? '#94A3B8' : '#475569', text: isLightMode ? '#0F172A' : '#E2E8F0', line: isLightMode ? '#94A3B8' : '#475569', start: '#F59E0B' };
}
function updateCyTheme() {
  if (cy) { cy.style(buildCyStyle()); liveRender(); }
  const applyToInst = (cyInst) => {
    if (!cyInst) return;
    cyInst.style(buildSimCyStyle());
    const c = getThemeColors();
    cyInst.nodes().forEach(n => { if (n.id() === '__start_ghost__' || n.id() === '__sg__') return; n.style({ 'background-color': c.bg, 'border-color': n.data('isStart') ? c.start : c.border, 'color': c.text }); });
    cyInst.edges().forEach(e => { if (e.id() === '__start_edge__' || e.id() === '__se__') return; if (!e.hasClass('sim-edge')) e.style({ 'line-color': c.line, 'target-arrow-color': c.line }); });
  };
  applyToInst(simCyOrig); applyToInst(simCyMin); applyToInst(pracCy);
}

/* ─────────────────────────── RESIZER ─────────────────────────── */
let isResizingX = false, isResizingExpl = false;
document.getElementById('gutter-x').addEventListener('mousedown', () => { isResizingX = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; document.getElementById('gutter-x').classList.add('active'); });
document.getElementById('gutter-expl').addEventListener('mousedown', () => { isResizingExpl = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; document.getElementById('gutter-expl').classList.add('active'); });
window.addEventListener('mousemove', e => {
  if (isResizingX) { const newW = Math.max(240, Math.min(e.clientX, window.innerWidth - 300)); document.getElementById('left-panel').style.width = newW + 'px'; if (cy) cy.resize(); }
  if (isResizingExpl) { const rightEl = document.getElementById('right-expl-col'); const rect = rightEl.getBoundingClientRect(); const newW = Math.max(200, Math.min(rect.right - e.clientX, 500)); rightEl.style.width = newW + 'px'; if (cy) cy.resize(); }
});
window.addEventListener('mouseup', () => { isResizingX = false; isResizingExpl = false; document.body.style.cursor = 'default'; document.body.style.userSelect = 'auto'; document.getElementById('gutter-x').classList.remove('active'); document.getElementById('gutter-expl').classList.remove('active'); });

/* ─────────────────────────── VIEW SWITCHING ─────────────────────────── */
function switchView(view) {
  ['min', 'sim', 'prac'].forEach(k => document.getElementById('tab-' + k).classList.remove('active'));
  ['minimizer', 'simulator', 'practice'].forEach(k => document.getElementById('view-' + k).classList.remove('active'));
  if (view === 'minimizer') { document.getElementById('tab-min').classList.add('active'); document.getElementById('view-minimizer').classList.add('active'); if (cy) cy.resize(); }
  else if (view === 'simulator') { document.getElementById('tab-sim').classList.add('active'); document.getElementById('view-simulator').classList.add('active'); initSimulator(); }
  else if (view === 'practice') { document.getElementById('tab-prac').classList.add('active'); document.getElementById('view-practice').classList.add('active'); if (!PracData.isActive) startPracticeChallenge('easy'); if (pracCy) pracCy.resize(); }
}

/* ─────────────────────────── COLORS & GLOBALS ─────────────────────────── */
const CHEX = ['#8E94F2', '#64B5F6', '#FFB74D', '#F06292', '#4DB6AC', '#BA68C8', '#E2E8F0', '#FCA5A5'];
let ANIM_MS = 1000;
function updateSpeed(v) { ANIM_MS = 3200 - parseFloat(v); document.getElementById('anim-speed').value = v; document.getElementById('sim-anim-speed').value = v; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

function attachTooltips(cyInstance) {
  const tip = document.getElementById('cy-tooltip');
  cyInstance.on('mouseover', 'edge', e => { const edge = e.target; const src = edge.data('source'); if (src === '__start_ghost__' || src === '__sg__') return; tip.innerHTML = `δ(<span style="color:var(--c1)">${src}</span>, <span style="color:var(--c2)">${edge.data('label')}</span>) = <span style="color:var(--c4)">${edge.data('target')}</span>`; tip.style.display = 'block'; });
  cyInstance.on('mousemove', 'edge', e => { tip.style.left = (e.originalEvent.clientX + 15) + 'px'; tip.style.top = (e.originalEvent.clientY + 15) + 'px'; });
  cyInstance.on('mouseout', 'edge', () => { tip.style.display = 'none'; });
}

/* ─────────────────────────── RANDOM DFA GENERATOR ─────────────────────────── */
function generateRandomDFA(difficulty) {
  let numCore = 3, numDups = 1, chainDepth = 0, numUnreach = 0;
  if (difficulty === 'easy') { numCore = 3; numDups = 1; chainDepth = 0; numUnreach = 1; } else if (difficulty === 'medium') { numCore = 4; numDups = 2; chainDepth = 1; numUnreach = 1; } else { numCore = 5; numDups = 3; chainDepth = 2; numUnreach = 2; }
  const alpha = ['0', '1']; let states = []; for (let i = 0; i < numCore; i++)states.push('c' + i);
  let trans = {}; states.forEach(s => { trans[s] = {}; alpha.forEach(a => trans[s][a] = states[Math.floor(Math.random() * states.length)]); });
  let finals = new Set(); states.forEach(s => { if (Math.random() > 0.5) finals.add(s); }); if (finals.size === 0) finals.add(states[0]); if (finals.size === states.length) finals.delete(states[states.length - 1]);
  let allStates = [...states], currentPool = [...states];
  for (let i = 0; i < numDups; i++) { let t = currentPool[Math.floor(Math.random() * currentPool.length)]; let nn = 'd' + i; allStates.push(nn); trans[nn] = { ...trans[t] }; if (finals.has(t)) finals.add(nn); allStates.forEach(s => { alpha.forEach(a => { if (trans[s][a] === t && Math.random() > 0.5) trans[s][a] = nn; }); }); if (chainDepth > 0 && i < chainDepth) { let ptr = allStates.filter(s => trans[s]['0'] === t || trans[s]['1'] === t); currentPool = ptr.length > 0 ? ptr : allStates; } else { currentPool = allStates; } }
  for (let i = 0; i < numUnreach; i++) { let un = 'u' + i; allStates.push(un); trans[un] = {}; alpha.forEach(a => trans[un][a] = allStates[Math.floor(Math.random() * allStates.length)]); if (Math.random() > 0.5) finals.add(un); }
  let shuffled = [...allStates].sort(() => Math.random() - .5); let nameMap = {}; shuffled.forEach((s, i) => nameMap[s] = 'q' + i);
  let finalStates = shuffled.map(s => nameMap[s]); let finalTrans = {}; shuffled.forEach(s => { let ns = nameMap[s]; finalTrans[ns] = {}; alpha.forEach(a => finalTrans[ns][a] = nameMap[trans[s][a]]); });
  let finalFinals = []; finals.forEach(f => finalFinals.push(nameMap[f]));
  return { states: finalStates, alpha, start: nameMap[states[0]], finals: finalFinals, trans: finalTrans };
}
function genRandom(diff) { const d = generateRandomDFA(diff); G.states = d.states; G.alpha = d.alpha; G.start = d.start; G.finals = new Set(d.finals); G.trans = d.trans; document.getElementById('ist').value = d.states.join(', '); document.getElementById('ial').value = d.alpha.join(', '); nodePositions = {}; rebuildLeft(); resetStepUI(); liveRender(); }

/* ─────────────────────────── MAIN DFA STATE ─────────────────────────── */
let G = { states: [], alpha: [], start: '', finals: new Set(), trans: {}, steps: [], cur: -1 };
let isAnimating = false, cy = null, nodePositions = {};

/* ─────────────────────────── INTERACTIVE CANVAS MODE ─────────────────────────── */
let canvasMode = true; // always active - both form and canvas work together
let ctrlHeld = false;
let ctrlSourceNode = null; // node user ctrl-clicked (edge source)
let selfLoopAngles = {}; // nodeId -> loop direction angle (degrees)
let canvasHistory = []; // undo stack: array of serialised G snapshots
let canvasFuture = []; // redo stack

function snapshotG() {
  return JSON.stringify({ states: [...G.states], alpha: [...G.alpha], start: G.start, finals: [...G.finals], trans: JSON.parse(JSON.stringify(G.trans)) });
}
function restoreG(snap) {
  const d = JSON.parse(snap); G.states = d.states; G.alpha = d.alpha; G.start = d.start; G.finals = new Set(d.finals); G.trans = d.trans;
}
function pushHistory() {
  canvasHistory.push(snapshotG());
  if (canvasHistory.length > 80) canvasHistory.shift();
  canvasFuture = [];
  updateUndoRedo();
}
function canvasUndo() {
  if (!canvasHistory.length) return;
  canvasFuture.push(snapshotG());
  restoreG(canvasHistory.pop());
  updateUndoRedo(); syncFormFromG(); resetStepUI(); liveRender();
}
function canvasRedo() {
  if (!canvasFuture.length) return;
  canvasHistory.push(snapshotG());
  restoreG(canvasFuture.pop());
  updateUndoRedo(); syncFormFromG(); resetStepUI(); liveRender();
}
function updateUndoRedo() {
  document.getElementById('ct-undo').disabled = !canvasHistory.length;
  document.getElementById('ct-redo').disabled = !canvasFuture.length;
}
function canvasClear() {
  if (!G.states.length) return;
  pushHistory();
  G.states = []; G.alpha = []; G.start = ''; G.finals = new Set(); G.trans = {}; nodePositions = {}; selfLoopAngles = {};
  syncFormFromG(); resetStepUI(); liveRender();
}

function toggleCanvasMode() {
  canvasMode = !canvasMode;
  ctrlSourceNode = null;
  document.getElementById('canvas-hint').textContent = canvasMode
    ? 'Right-click canvas: add state · Dbl-click node: toggle final/start · Ctrl+click: draw edge · Click self-loop node: rotate loop'
    : 'Drag nodes · Scroll to zoom · Right-click canvas to add state · Ctrl+click nodes to draw edges · Dbl-click node to toggle final/start';
  if (!canvasMode) { ctrlSourceNode = null; }
}

/* Sync G → form fields (used after canvas edits) */
function syncFormFromG() {
  document.getElementById('ist').value = G.states.join(', ');
  document.getElementById('ial').value = G.alpha.join(', ');
  rebuildLeft();
  chkBtn();
}

/* Node name counter */
let _nodeCounter = 0;
function nextNodeName() {
  // prefer q0,q1,... skipping already used
  let i = 0; while (G.states.includes('q' + i)) i++;
  return 'q' + i;
}

/* ── Canvas interaction setup (called once in initCy) ── */
function setupCanvasInteraction() {
  if (!cy) return;

  /* Double-click on node → toggle final / set start */
  cy.on('dblclick', 'node', e => {
    const n = e.target;
    if (n.id() === '__start_ghost__') return;
    pushHistory();
    const id = n.id();
    // cycle: normal → final → start → start+final → normal
    const isFin = G.finals.has(id);
    const isStart = G.start === id;
    if (!isFin && !isStart) { G.finals.add(id); }
    else if (isFin && !isStart) { G.finals.delete(id); G.start = id; addStartArrow(id); }
    else if (!isFin && isStart) { G.finals.add(id); }
    else { G.finals.delete(id); if (G.start === id) { G.start = G.states.find(s => s !== id) || ''; } }
    syncFormFromG(); resetStepUI(); liveRender();
  });

  /* Ctrl + click on node → start/finish edge drawing */
  cy.on('tap', 'node', e => {
    if (!ctrlHeld) return;
    const n = e.target;
    if (n.id() === '__start_ghost__') return;
    if (!ctrlSourceNode) {
      ctrlSourceNode = n.id();
      // highlight source
      cy.$id(ctrlSourceNode).style({ 'border-color': '#F59E0B', 'border-width': 4 });
    } else {
      const src = ctrlSourceNode;
      const tgt = n.id();
      ctrlSourceNode = null;
      // restore source style
      liveRender();
      // open transition modal
      openTransModal(src, tgt, null);
    }
  });

  /* Click on a node that has a self-loop → rotate the loop */
  cy.on('tap', 'node', e => {
    if (ctrlHeld) return;
    const n = e.target;
    if (n.id() === '__start_ghost__') return;
    const id = n.id();
    const hasSelfLoop = G.alpha.some(a => G.trans[id] && G.trans[id][a] === id);
    if (!hasSelfLoop) return;
    // rotate by 45 degrees
    selfLoopAngles[id] = ((selfLoopAngles[id] || 0) + 45) % 360;
    applySelfLoopAngles();
  });

  /* Click on edge → open edit modal */
  cy.on('tap', 'edge', e => {
    const edge = e.target;
    const src = edge.data('source'); const tgt = edge.data('target');
    if (src === '__start_ghost__') return;
    openTransModal(src, tgt, edge.data('label'));
  });

  /* Track ctrl key */
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Control') { ctrlHeld = true; }
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'z') { ev.preventDefault(); canvasUndo(); }
    if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'y' || ev.key === 'Y')) { ev.preventDefault(); canvasRedo(); }
    if (ev.key === 'Escape' && ctrlSourceNode) { ctrlSourceNode = null; liveRender(); }
  });
  document.addEventListener('keyup', ev => {
    if (ev.key === 'Control') { ctrlHeld = false; if (ctrlSourceNode) { ctrlSourceNode = null; liveRender(); } }
  });
}

function _addCanvasState(name, pos) {
  if (G.states.includes(name)) { alert(`State '${name}' already exists.`); return; }
  pushHistory();
  G.states.push(name);
  if (!G.start) { G.start = name; }
  if (!G.trans[name]) G.trans[name] = {};
  nodePositions[name] = { x: pos.x, y: pos.y };
  // If first state also set as start
  syncFormFromG(); resetStepUI(); liveRender();
}

function applySelfLoopAngles() {
  if (!cy) return;
  Object.entries(selfLoopAngles).forEach(([id, angle]) => {
    const e = cy.edges(`[source="${id}"][target="${id}"]`);
    if (e.length) { e.style({ 'loop-direction': angle + 'deg', 'loop-sweep': '-45deg' }); }
  });
}

/* ── Name modal (for right-click add state) ── */
let _namePendingPos = null;
function nameModalCancel() { document.getElementById('name-modal').classList.remove('show'); _namePendingPos = null; }
function nameModalSave() {
  const name = document.getElementById('nm-input').value.trim();
  document.getElementById('name-modal').classList.remove('show');
  if (!name || !_namePendingPos) return;
  if (!/^[a-zA-Z0-9_]+$/.test(name)) { alert('Invalid name. Use letters, digits, underscore.'); return; }
  const pos = _namePendingPos;
  _namePendingPos = null;
  _addCanvasState(name, pos);
}

/* ── Transition modal ── */
let _tmState = { src: null, tgt: null, existingLabel: null };
function openTransModal(src, tgt, existingLabel) {
  if (!G.alpha.length) { alert('Define at least one alphabet symbol in the form first.'); return; }
  _tmState = { src, tgt, existingLabel };
  document.getElementById('tm-from').textContent = src;
  document.getElementById('tm-to').textContent = tgt;
  document.getElementById('tm-title').textContent = existingLabel ? 'Edit Transition' : 'Add Transition';
  // populate symbol select
  const sel = document.getElementById('tm-symbol');
  sel.innerHTML = G.alpha.map(a => `<option value="${a}" ${existingLabel && existingLabel.split(', ').includes(a) ? 'selected' : ''}>${a}</option>`).join('');
  document.getElementById('tm-delete-btn').style.display = existingLabel ? '' : 'none';
  document.getElementById('trans-modal').classList.add('show');
}
function transModalCancel() { document.getElementById('trans-modal').classList.remove('show'); ctrlSourceNode = null; liveRender(); }
function transModalSave() {
  const sym = document.getElementById('tm-symbol').value;
  const { src, tgt } = _tmState;
  document.getElementById('trans-modal').classList.remove('show');
  pushHistory();
  if (!G.trans[src]) G.trans[src] = {};
  G.trans[src][sym] = tgt;
  syncFormFromG(); resetStepUI(); liveRender();
}
function transModalDelete() {
  const { src, existingLabel } = _tmState;
  document.getElementById('trans-modal').classList.remove('show');
  if (!existingLabel) return;
  pushHistory();
  existingLabel.split(', ').forEach(sym => { if (G.trans[src] && G.trans[src][sym] === _tmState.tgt) delete G.trans[src][sym]; });
  syncFormFromG(); resetStepUI(); liveRender();
}

/* Override right-click on canvas to use name modal */
function overrideRightClick() {
  const container = document.getElementById('cy-container');
  container.addEventListener('contextmenu', e => {
    e.preventDefault();
    // Convert screen to cytoscape model coords
    const bb = container.getBoundingClientRect();
    const rawX = e.clientX - bb.left;
    const rawY = e.clientY - bb.top;
    if (!cy) return;
    const pan = cy.pan(); const zoom = cy.zoom();
    const modelX = (rawX - pan.x) / zoom;
    const modelY = (rawY - pan.y) / zoom;
    _namePendingPos = { x: modelX, y: modelY };
    document.getElementById('nm-input').value = nextNodeName();
    document.getElementById('name-modal').classList.add('show');
    setTimeout(() => document.getElementById('nm-input').select(), 50);
  });
}

/* ─────────────────────────── CY STYLE & INIT ─────────────────────────── */
function buildCyStyle() {
  const c = getThemeColors();
  return [
    { selector: 'node', style: { 'label': 'data(label)', 'width': 54, 'height': 54, 'background-color': c.bg, 'border-color': c.border, 'border-width': 2, 'color': c.text, 'font-family': "'JetBrains Mono', monospace", 'font-size': '13px', 'font-weight': '600', 'text-valign': 'center', 'text-halign': 'center', 'transition-property': 'background-color, border-color, border-width, color, opacity, width, height', 'transition-duration': () => ANIM_MS + 'ms', 'transition-timing-function': 'ease-in-out' } },
    { selector: 'node[?isFinal]', style: { 'border-style': 'double', 'border-width': 5 } },
    { selector: 'edge', style: { 'label': 'data(label)', 'width': 1.5, 'line-color': c.line, 'target-arrow-color': c.line, 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', 'font-family': "'JetBrains Mono', monospace", 'font-size': '11px', 'font-weight': '600', 'color': c.line, 'text-background-opacity': 1, 'text-background-color': c.bg, 'text-background-padding': '3px', 'text-rotation': 'autorotate', 'control-point-step-size': 60, 'transition-property': 'line-color, target-arrow-color, color, width, opacity, z-index', 'transition-duration': () => ANIM_MS + 'ms', 'transition-timing-function': 'ease-in-out' } },
    { selector: 'edge.bidirectional', style: { 'curve-style': 'bezier', 'control-point-step-size': 70 } },
    { selector: 'edge[source = target]', style: { 'curve-style': 'loop' } }
  ];
}

function initCy() {
  if (cy) { cy.destroy(); cy = null; }
  cy = cytoscape({ container: document.getElementById('cy-container'), elements: [], style: buildCyStyle(), layout: { name: 'preset' }, userZoomingEnabled: true, userPanningEnabled: true, boxSelectionEnabled: false, minZoom: 0.4, maxZoom: 3 });
  attachTooltips(cy);
  cy.on('position', 'node', e => {
    if (e.target.id() === G.start || (cy.$id('__start_edge__').length && e.target.id() === cy.$id('__start_edge__').data('target'))) { const ghost = cy.$id('__start_ghost__'); if (ghost.length) ghost.position({ x: e.target.position().x - 90, y: e.target.position().y }); }
  });
  cy.on('dragfree', 'node', e => { if (e.target.id() !== '__start_ghost__') nodePositions[e.target.id()] = { ...e.target.position() }; });
  setupCanvasInteraction();
  overrideRightClick();
}

function applyAutoLayout(animated = true) {
  if (!cy) return;
  cy.layout({ name: 'cose', animate: animated, animationDuration: animated ? Math.min(ANIM_MS, 800) : 0, padding: 50, idealEdgeLength: 90, nodeOverlap: 40, refresh: 20, fit: true, randomize: !animated, componentSpacing: 80, nodeRepulsion: 200000, edgeElasticity: 120, nestingFactor: 5, gravity: 80, numIter: 1000, initialTemp: 200, coolingFactor: 0.95, minTemp: 1.0, stop: function () { cy.nodes().forEach(n => { if (n.id() !== '__start_ghost__') nodePositions[n.id()] = { ...n.position() }; }); cy.fit(undefined, 60); let z = cy.zoom(); if (z < 0.9) { cy.zoom(0.9); cy.center(); } else if (z > 1.5) { cy.zoom(1.5); cy.center(); } } }).run();
}
function fitGraph() { applyAutoLayout(true); }

async function syncGraphState(s) {
  if (!cy) initCy();
  const { gst: sts, gtr: tr, gstart: start, gfin: finals, hl = {} } = s;
  const hNodes = hl.nodes || {}, dimmedSet = new Set(hl.dimmed || []), finSet = new Set(Array.isArray(finals) ? finals : [...finals]);
  const empSet = hl.emphasize ? new Set(hl.emphasize) : null, hlEdges = hl.edges ? new Set(hl.edges) : null;
  const AL = G.alpha.length ? G.alpha : (s.alpha || []);
  const edgeMap = {};
  sts.forEach(st => AL.forEach(a => { const t = tr[st]?.[a]; if (!t || !sts.includes(t)) return; const k = `${st}->${t}`; if (!edgeMap[k]) edgeMap[k] = { from: st, to: t, syms: [] }; edgeMap[k].syms.push(a); }));
  const biDir = new Set(); Object.keys(edgeMap).forEach(k => { const { from, to } = edgeMap[k]; if (from !== to && edgeMap[`${to}->${from}`]) { biDir.add(k); biDir.add(`${to}->${from}`); } });
  const desiredNodes = new Set(sts), desiredEdges = new Set(Object.keys(edgeMap).map(k => `e-${k}`));
  cy.batch(() => {
    cy.elements().forEach(el => { if (el.id() === '__start_ghost__' || el.id() === '__start_edge__') return; if (el.isNode() && !desiredNodes.has(el.id())) cy.remove(el); if (el.isEdge() && !desiredEdges.has(el.id())) cy.remove(el); });
    sts.forEach(st => { if (!cy.$id(st).length) { const pos = nodePositions[st] || { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 }; cy.add({ group: 'nodes', data: { id: st, label: st }, position: { ...pos } }); } });
    Object.entries(edgeMap).forEach(([k, { from, to, syms }]) => { const eId = `e-${k}`; if (!cy.$id(eId).length) cy.add({ group: 'edges', data: { id: eId, source: from, target: to, label: syms.join(', ') } }); else cy.$id(eId).data('label', syms.join(', ')); });
  });
  const c = getThemeColors();
  cy.batch(() => {
    cy.nodes().forEach(n => {
      if (n.id() === '__start_ghost__') return;
      const id = n.id(), ci = hNodes[id], isDim = dimmedSet.has(id), isFin = finSet.has(id), isStart = id === start;
      n.data('isFinal', isFin || undefined); n.data('isStart', isStart || undefined);
      let bg = c.bg, border = isStart ? c.start : c.border, color = c.text, opacity = 1;
      if (isDim || (empSet && !empSet.has(id))) opacity = 0.18;
      if (ci !== undefined && !isDim) { bg = CHEX[ci % CHEX.length]; border = bg; color = '#fff'; }
      n.style({ 'background-color': bg, 'border-color': border, 'color': color, 'border-width': isFin ? 5 : (isStart ? 2.5 : 2), 'border-style': isFin ? 'double' : 'solid', 'opacity': opacity, 'background-opacity': (ci !== undefined && !isDim) ? 0.25 : 1 });
    });
    cy.edges().forEach(e => {
      if (e.id() === '__start_edge__') return;
      const src = e.data('source'), isDim = dimmedSet.has(src) || dimmedSet.has(e.data('target')), isBi = biDir.has(e.id().substring(2)), ci = hNodes[src];
      let cLine = c.line, op = 1, width = 1.5, zIndex = 0; if (ci !== undefined && !isDim) cLine = CHEX[ci % CHEX.length];
      if (hlEdges && hlEdges.has(e.id())) { cLine = '#F59E0B'; width = 3; op = 1; zIndex = 10; } else if (empSet) { op = 0.15; } else if (isDim) { op = 0.12; } else if (ci !== undefined && !isDim) { width = 2; }
      e.style({ 'line-color': cLine, 'target-arrow-color': cLine, 'color': cLine, 'opacity': op, 'width': width, 'z-index': zIndex, 'curve-style': isBi ? 'bezier' : 'bezier', 'control-point-step-size': isBi ? 65 : 60 });
    });
    cy.edges('[source = target]').style({ 'curve-style': 'loop' });
  });
  applySelfLoopAngles();
  addStartArrow(start);
  if (sts.some(st => !nodePositions[st])) applyAutoLayout(false);
}

function addStartArrow(start) {
  if (!cy || !start || !cy.$id(start).length) return;
  const pos = cy.$id(start).position();
  if (!cy.$id('__start_ghost__').length) {
    cy.add([{ group: 'nodes', data: { id: '__start_ghost__', label: '' }, position: { x: pos.x - 90, y: pos.y } }, { group: 'edges', data: { id: '__start_edge__', source: '__start_ghost__', target: start, label: '' } }]);
    cy.$id('__start_ghost__').style({ 'width': 1, 'height': 1, 'opacity': 0, 'events': 'no' }).ungrabify().unselectify();
    cy.$id('__start_edge__').style({ 'line-color': '#F59E0B', 'target-arrow-color': '#F59E0B', 'target-arrow-shape': 'triangle', 'width': 2, 'curve-style': 'straight', 'events': 'no' });
  } else {
    if (cy.$id('__start_edge__').data('target') !== start) { cy.remove(cy.$id('__start_edge__')); cy.add({ group: 'edges', data: { id: '__start_edge__', source: '__start_ghost__', target: start, label: '' } }); cy.$id('__start_edge__').style({ 'line-color': '#F59E0B', 'target-arrow-color': '#F59E0B', 'target-arrow-shape': 'triangle', 'width': 2, 'curve-style': 'straight', 'events': 'no' }); }
    cy.$id('__start_ghost__').position({ x: pos.x - 90, y: pos.y });
  }
}

async function liveRender() { await syncGraphState({ gst: G.states, gtr: G.trans, gstart: G.start, gfin: [...G.finals], hl: {} }); }

/* ─────────────────────────── FORM → G sync ─────────────────────────── */
function onCC() { G.states = document.getElementById('ist').value.split(',').map(x => x.trim()).filter(Boolean); G.alpha = document.getElementById('ial').value.split(',').map(x => x.trim()).filter(Boolean); G.finals = new Set([...G.finals].filter(s => G.states.includes(s))); nodePositions = {}; rebuildLeft(); resetStepUI(); liveRender(); }
function onStartChange() { G.start = document.getElementById('istart').value; resetStepUI(); liveRender(); }
function rebuildLeft() {
  const sel = document.getElementById('istart'); const prev = sel.value;
  sel.innerHTML = G.states.map(s => `<option value="${s}">${s}</option>`).join('');
  sel.value = G.states.includes(prev) ? prev : (G.states[0] || ''); G.start = sel.value;
  document.getElementById('chips').innerHTML = G.states.map(s => `<div class="chip${G.finals.has(s) ? ' fin' : ''}" onclick="togFin('${s}',this)"><div class="pip"></div>${s}</div>`).join('');
  buildTT(); chkBtn();
}
function togFin(s, el) { G.finals.has(s) ? G.finals.delete(s) : G.finals.add(s); el.classList.toggle('fin'); resetStepUI(); liveRender(); chkBtn(); }
function buildTT() {
  const w = document.getElementById('twrap');
  if (!G.states.length || !G.alpha.length) { w.innerHTML = ''; return; }
  G.states.forEach(s => { if (!G.trans[s]) G.trans[s] = {}; });
  let h = `<table class="ttbl"><thead><tr><th>δ</th>${G.alpha.map(a => `<th>${a}</th>`).join('')}</tr></thead><tbody>`;
  G.states.forEach(s => { h += `<tr><td class="rh">${s}</td>`; G.alpha.forEach(a => { const val = G.trans[s]?.[a] || ''; h += `<td><select onchange="setT('${s}','${a}',this.value)"><option value="" disabled ${!val ? 'selected' : ''}>-</option>${G.states.map(st => `<option value="${st}" ${val === st ? 'selected' : ''}>${st}</option>`).join('')}</select></td>`; }); h += `</tr>`; });
  w.innerHTML = h + `</tbody></table>`;
}
function setT(s, a, v) { if (!G.trans[s]) G.trans[s] = {}; G.trans[s][a] = v.trim(); resetStepUI(); liveRender(); chkBtn(); }
function validate() {
  const e = [], vr = /^[a-zA-Z0-9_]+$/;
  if (!G.states.length) e.push('No states defined.');
  else { const ss = new Set(); for (let s of G.states) { if (!vr.test(s)) { e.push(`Invalid state: '${s}'.`); break; } if (ss.has(s)) { e.push(`Duplicate state: '${s}'.`); break; } ss.add(s); } }
  if (!G.alpha.length) e.push('No alphabet defined.');
  else { const as = new Set(); for (let a of G.alpha) { if (!vr.test(a)) { e.push(`Invalid symbol: '${a}'.`); break; } if (as.has(a)) { e.push(`Duplicate symbol: '${a}'.`); break; } as.add(a); } }
  if (!G.start) e.push('No start state selected.');
  else if (!G.states.includes(G.start)) e.push(`Start state '${G.start}' not in states list.`);
  if (!G.finals.size) e.push('At least one final state is required.');
  let bad = false; G.states.forEach(s => G.alpha.forEach(a => { const t = G.trans[s]?.[a]; if (!t || !G.states.includes(t)) bad = true; }));
  if (bad && !e.length) e.push('Fill all transitions.');
  return e;
}
function chkBtn() { const e = validate(); document.getElementById('errtxt').textContent = e.length ? e[0] : ''; document.getElementById('mbtn').disabled = e.length > 0; }
const fmtGrp = g => `{${g.join(', ')}}`;

/* ─────────────────────────── MINIMIZER STEPS ─────────────────────────── */
function computeSteps() {
  const { states: ST, alpha: AL, trans: TR, start: START, finals: FIN } = G; const steps = [];
  const reach = new Set([START]); const q = [START]; while (q.length) { const s = q.shift(); AL.forEach(a => { const t = TR[s]?.[a]; if (t && !reach.has(t)) { reach.add(t); q.push(t); } }); }
  const work = ST.filter(s => reach.has(s)), unreach = ST.filter(s => !reach.has(s));
  let introInt = `Welcome to the Minimizer! We have a DFA with <strong>${ST.length} states</strong>.<br><br>The goal of minimization is to find and merge states that are <strong>"indistinguishable"</strong>.${unreach.length ? `<div class="snote"><span class="ns">Step 1:</span> States <strong>${fmtGrp(unreach)}</strong> are unreachable from the start state. We will remove them next.</div>` : '<br>All states are reachable from the start state.'}`;
  steps.push({ kind: 'intro', title: 'Start: The Original DFA', expl: introInt, hl: {}, gst: ST, gtr: TR, gstart: START, gfin: [...FIN], part: null });
  if (unreach.length) steps.push({ kind: 'unreach', title: 'Removing Unreachable States', expl: `Because states <strong>${fmtGrp(unreach)}</strong> can never be reached from <strong>${START}</strong>, they are useless. We discard them now.<br><br>Working states: <strong>${fmtGrp(work)}</strong>.`, hl: { nodes: Object.fromEntries(unreach.map(s => [s, 3])), dimmed: unreach }, gst: work, gtr: TR, gstart: START, gfin: [...FIN], part: null });
  const fin = work.filter(s => FIN.has(s)), nfin = work.filter(s => !FIN.has(s));
  let part = []; if (fin.length) part.push([...fin]); if (nfin.length) part.push([...nfin]);
  const gof = (s, p) => p.findIndex(g => g.includes(s)), snap = p => p.map(g => [...g]), getNodesHl = p => Object.fromEntries(work.map(s => [s, gof(s, p)]));
  steps.push({ kind: 'init', title: 'Iteration 0 — Final vs Non-Final', expl: `<strong>Creating the Initial Groups</strong><br><br>We start by separating Accepting vs Rejecting states.<br><br><span style="color:${CHEX[0]};font-weight:600">● Accepting:</span> ${fmtGrp(fin)}<br><span style="color:${CHEX[1]};font-weight:600">● Rejecting:</span> ${fmtGrp(nfin)}`, hl: { nodes: getNodesHl(part) }, gst: work, gtr: TR, gstart: START, gfin: [...FIN], part: snap(part) });
  let iter = 1;
  while (true) {
    let changed = false, nextPart = [];
    steps.push({ kind: 'iter-start', title: `Iteration ${iter} Begins`, expl: `<strong>Iteration ${iter}</strong><br><br>We will inspect every colored group with >1 state to verify if its states truly act identically.`, hl: { nodes: getNodesHl(part) }, gst: work, gtr: TR, gstart: START, gfin: [...FIN], part: snap(part) });
    for (let i = 0; i < part.length; i++) {
      let grp = part[i]; if (grp.length === 1) { nextPart.push([...grp]); continue; }
      let sigMap = {}, edgeHls = [];
      grp.forEach(s => { let sig = AL.map(a => { let t = TR[s]?.[a]; if (t) edgeHls.push(`e-${s}->${t}`); return t ? gof(t, part) : -1; }).join(','); if (!sigMap[sig]) sigMap[sig] = []; sigMap[sig].push(s); });
      let subs = Object.values(sigMap), doesSplit = subs.length > 1;
      steps.push({ kind: 'eval', title: `Evaluating Group ${fmtGrp(grp)}`, expl: `Let's put group <strong><span style="color:${CHEX[i % CHEX.length]}">${fmtGrp(grp)}</span></strong> under the microscope.<br><br>To stay together, they must transition to the exact same colored groups for every input.`, hl: { nodes: getNodesHl(part), emphasize: grp }, gst: work, gtr: TR, gstart: START, gfin: [...FIN], part: snap(part) });
      let explTrace = `Watch where the paths lead (highlighted in orange):<br><br>`;
      grp.forEach(s => { let paths = AL.map(a => { let tGrp = TR[s]?.[a] ? gof(TR[s]?.[a], part) : -1; let tName = tGrp >= 0 ? `<strong style="color:${CHEX[tGrp % CHEX.length]}">${fmtGrp(part[tGrp])}</strong>` : 'Dead State'; return `on '${a}' ➔ ${tName}`; }).join('<br>&nbsp;&nbsp;&nbsp;&nbsp;'); explTrace += `<div style="font-family:var(--mono);font-size:13px;margin-bottom:12px;"><strong>State ${s}</strong>:<br>&nbsp;&nbsp;&nbsp;&nbsp;${paths}</div>`; });
      let proofHtml = '', logHtml = `<div class="log-box"><div class="log-title">// INTERNAL DECISION LOG</div>`;
      if (doesSplit) {
        explTrace += `<strong style="color:var(--c3)">Mismatch detected!</strong> The states do not all arrive at the same destination groups. They must be separated.`; changed = true;
        let s1 = subs[0][0], s2 = subs[1][0], keys = Object.keys(sigMap), sig1 = keys[0].split(','), sig2 = keys[1].split(','), diffIdx = -1;
        for (let k = 0; k < AL.length; k++) { if (sig1[k] !== sig2[k]) { diffIdx = k; break; } }
        if (diffIdx !== -1) {
          let a = AL[diffIdx]; let g1Name = sig1[diffIdx] >= 0 ? `Group ${sig1[diffIdx]}` : 'Dead'; let g2Name = sig2[diffIdx] >= 0 ? `Group ${sig2[diffIdx]}` : 'Dead';
          logHtml += `> Checking (<span style="color:var(--c1)">${s1}</span>, <span style="color:var(--c1)">${s2}</span>)<br>> Input '<span style="color:var(--c2)">${a}</span>':<br>&nbsp;&nbsp;➔ ${s1} → ${g1Name}<br>&nbsp;&nbsp;➔ ${s2} → ${g2Name}<br>> <span style="color:var(--c3);font-weight:bold;">CONFLICT:</span> Diverge.<br>> <span style="color:var(--c0);font-weight:bold;">ACTION:</span> Split.</div>`;
          proofHtml = `<div class="proof-box"><div class="proof-title">Distinguishability Proof</div><div class="proof-math"><div>Input checked: <span class="sym">'${a}'</span></div><div style="margin-top:6px;">δ(<span class="st">${s1}</span>, <span class="sym">${a}</span>) ∈ <span class="grp">${g1Name}</span></div><div>δ(<span class="st">${s2}</span>, <span class="sym">${a}</span>) ∈ <span class="grp">${g2Name}</span></div><div style="border-top:1px solid rgba(128,128,128,.2);margin-top:6px;padding-top:6px;color:var(--c3);font-size:14px;font-weight:bold;">⇒ ${s1} ≢ ${s2}</div></div></div>`;
        }
      } else { explTrace += `<strong style="color:var(--c4)">Perfect match!</strong> All states behave identically.`; logHtml += `> Checking all pairs in ${fmtGrp(grp)}<br>> <span style="color:var(--c4);font-weight:bold;">NO CONFLICT.</span><br>> <span style="color:var(--c4);font-weight:bold;">ACTION:</span> Maintain.</div>`; }
      explTrace += logHtml;
      steps.push({ kind: 'trace', title: `Tracing Paths for ${fmtGrp(grp)}`, expl: explTrace, hl: { nodes: getNodesHl(part), emphasize: grp, edges: edgeHls }, gst: work, gtr: TR, gstart: START, gfin: [...FIN], part: snap(part) });
      if (doesSplit) { subs.forEach(sg => nextPart.push(sg)); let tempPart = [...nextPart, ...part.slice(i + 1)]; steps.push({ kind: 'split', title: `Splitting ${fmtGrp(grp)}`, expl: `Because of the differing transitions, the group is broken apart.<br><br>New groups formed:<br><strong>${subs.map(fmtGrp).join('<br>')}</strong>.${proofHtml}`, hl: { nodes: getNodesHl(tempPart) }, gst: work, gtr: TR, gstart: START, gfin: [...FIN], part: snap(tempPart) }); }
      else { nextPart.push([...grp]); }
    }
    part = nextPart;
    if (!changed) { steps.push({ kind: 'conv', title: `Iteration ${iter} — Converged!`, expl: `<strong>Convergence Achieved!</strong><br><br>We checked every group and no states disagreed. <strong>No more groups need to be split.</strong>`, hl: { nodes: getNodesHl(part) }, gst: work, gtr: TR, gstart: START, gfin: [...FIN], part: snap(part), converged: true }); break; }
    iter++; if (iter > 25) break;
  }
  const pName = g => g.join(''), minSts = part.map(g => pName(g)), minStart = pName(part[gof(START, part)]);
  const minFin = new Set(part.map(g => g.some(s => FIN.has(s)) ? pName(g) : null).filter(Boolean));
  const minTr = {}; part.forEach(g => { const name = pName(g), rep = g[0]; minTr[name] = {}; AL.forEach(a => { const t = TR[rep]?.[a]; if (t && gof(t, part) >= 0) minTr[name][a] = pName(part[gof(t, part)]); }); });
  const mapLines = part.map((g, i) => `<span style="color:${CHEX[i % CHEX.length]};font-family:var(--mono);font-weight:600;">${pName(g)}</span> ⟵ was ${fmtGrp(g)}${minFin.has(pName(g)) ? ` <span style="color:var(--c2)">★ final</span>` : ''}`).join('<br>');
  const statsHtml = `<div class="stats-box"><div class="stat-item"><span class="stat-label">Original States</span><span class="stat-val">${ST.length}</span></div><div class="stat-item"><span class="stat-label">Unreachable Removed</span><span class="stat-val" style="color:var(--c3)">${unreach.length}</span></div><div class="stat-item"><span class="stat-label">States Merged</span><span class="stat-val" style="color:var(--c0)">${work.length - minSts.length}</span></div><div class="stat-item"><span class="stat-label">Reduction</span><span class="stat-val" style="color:var(--c4)">${Math.round(((ST.length - minSts.length) / ST.length) * 100) || 0}%</span></div></div>`;
  let minTableHtml = `<div style="margin-top:16px;"><div class="ptitle" style="padding-left:0;border-bottom:none;color:var(--text);">Final Transition Table</div><table class="ptbl" style="margin-top:8px;"><thead><tr><th>State</th>`; AL.forEach(a => minTableHtml += `<th>δ · ${a}</th>`); minTableHtml += `</tr></thead><tbody>`;
  minSts.forEach(st => { const isFin = minFin.has(st) ? '<span style="color:var(--c2)">★</span> ' : ''; const isSt = st === minStart ? '<span style="color:var(--c0)">→</span> ' : ''; minTableHtml += `<tr><td style="font-weight:600;color:var(--text);font-family:var(--mono);">${isSt}${isFin}${st}</td>`; AL.forEach(a => { minTableHtml += `<td style="color:var(--dim);font-family:var(--mono);">${minTr[st][a] || '-'}</td>`; }); minTableHtml += `</tr>`; });
  minTableHtml += `</tbody></table></div>`;
  steps.push({ kind: 'min', title: 'The Minimized DFA', expl: `<strong>Physical Merge Complete!</strong><br><br>Because all states within our final groups are mathematically identical, we permanently fuse them together.<br><br>${mapLines}${statsHtml}${minTableHtml}`, hl: { nodes: Object.fromEntries(minSts.map((s, i) => [s, i])) }, gst: minSts, gtr: minTr, gstart: minStart, gfin: [...minFin], part: snap(part), converged: true, isMin: true, minInfo: { minSts, minStart, minFin, minTr, part, partNames: minSts } });
  return steps;
}

function startMin() { G.steps = computeSteps(); G.cur = 0; showStep(0); }
function goNext() { if (!isAnimating && G.cur < G.steps.length - 1) showStep(++G.cur, G.cur - 1); }
function goPrev() { if (!isAnimating && G.cur > 0) showStep(--G.cur, G.cur + 1); }

async function showStep(idx, prevIdx = -1) {
  if (isAnimating) return; isAnimating = true;
  const s = G.steps[idx], n = G.steps.length, prevS = prevIdx >= 0 ? G.steps[prevIdx] : null;
  document.getElementById('sctr').textContent = `Step ${idx + 1} / ${n}`;
  document.getElementById('bprev').disabled = idx === 0; document.getElementById('bnext').disabled = idx === n - 1;
  document.getElementById('stitle').textContent = s.title;
  s.converged ? document.getElementById('cbadge').classList.add('show') : document.getElementById('cbadge').classList.remove('show');
  document.getElementById('sexpl').innerHTML = `<div class="anim">${s.expl}</div>`;
  renderPartTable(s);
  if (prevIdx !== -1 && prevIdx < idx && cy) {
    if (s.kind === 'unreach' && prevS) { const toRemove = prevS.gst.filter(st => !s.gst.includes(st)); if (toRemove.length) { const anims = []; toRemove.forEach(id => { const node = cy.$id(id); if (node.length) { anims.push(node.animation({ style: { opacity: 0, width: 0, height: 0 } }, { duration: ANIM_MS, easing: 'ease-in-out' }).play().promise()); node.connectedEdges().forEach(e => anims.push(e.animation({ style: { opacity: 0 } }, { duration: ANIM_MS }).play().promise())); } }); await Promise.all(anims); } }
    else if (s.isMin && prevS && !prevS.isMin) { const anims = []; s.minInfo.part.forEach((grp) => { let cx = 0, cyL = 0, count = 0; grp.forEach(id => { const node = cy.$id(id); if (node.length) { cx += node.position('x'); cyL += node.position('y'); count++; } }); if (count > 0) { cx /= count; cyL /= count; grp.forEach(id => { const node = cy.$id(id); if (node.length) { if (count > 1) anims.push(node.animation({ position: { x: cx, y: cyL } }, { duration: ANIM_MS, easing: 'ease-in-out' }).play().promise()); } }); } }); await Promise.all(anims); }
  }
  await syncGraphState(s);
  if (s.isMin && prevS && !prevS.isMin && cy) { const pa = []; cy.nodes().forEach(nn => { if (nn.id() !== '__start_ghost__') { pa.push(nn.animation({ style: { width: 64, height: 64 } }, { duration: 150 }).play().promise().then(() => nn.animation({ style: { width: 54, height: 54 } }, { duration: 250 }).play().promise())); } }); await Promise.all(pa); }
  isAnimating = false;
}

function renderPartTable(s) {
  const w = document.getElementById('pwrap');
  if (!s.part) { w.innerHTML = `<div style="color:var(--dim);padding:24px;text-align:center;font-size:12px;font-weight:500;">Partitions not yet formed.</div>`; return; }
  let h = `<table class="ptbl" style="margin-top:8px;"><thead><tr><th>Group</th><th>States Inside</th><th>Status</th></tr></thead><tbody>`;
  const empSet = (s.hl && s.hl.emphasize) ? new Set(s.hl.emphasize) : null;
  s.part.forEach((g, i) => {
    const col = CHEX[i % CHEX.length], isEmp = empSet && g.every(st => empSet.has(st)) && g.length === empSet.size;
    let status = '<span style="color:var(--dim)">Active</span>';
    if (s.isMin) status = `<span style="color:var(--c1);font-weight:600">Merged ➔ ${g.join('')}</span>`;
    else if (s.converged) status = `<span style="color:var(--c4);font-weight:600">Stable ✓</span>`;
    else if (isEmp) status = `<span style="color:var(--c2);font-weight:600">Evaluating...</span>`;
    else if (s.kind === 'split') status = `<span style="color:var(--c0)">Updated</span>`;
    const rowOp = (empSet && !isEmp) ? 'opacity:.4;' : 'opacity:1;transition:opacity .3s ease;';
    h += `<tr style="${rowOp}"><td style="color:${col};font-weight:700;font-family:var(--mono);">Group ${i}</td><td style="color:${col};font-weight:600;font-family:var(--mono);font-size:13px;">{${g.join(', ')}}</td><td>${status}</td></tr>`;
  });
  w.innerHTML = `<div class="anim">${h}</tbody></table></div>`;
}

function resetStepUI() {
  G.steps = []; G.cur = -1;
  document.getElementById('sctr').textContent = ''; document.getElementById('bprev').disabled = true; document.getElementById('bnext').disabled = true;
  document.getElementById('stitle').textContent = ''; document.getElementById('cbadge').classList.remove('show');
  document.getElementById('sexpl').innerHTML = `<div class="idle"><svg width="42" height="42" viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="16" stroke="currentColor" stroke-width="1.8"/><path d="M18 10v9l5 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg><span>Build your DFA, then click Start Minimization</span></div>`;
  document.getElementById('pwrap').innerHTML = `<div style="color:var(--dim);padding:16px;text-align:center;font-size:12px;font-weight:500;">No data yet</div>`;
}

/* ─────────────────────────── PATH SIMULATOR ─────────────────────────── */
let simCyOrig = null, simCyMin = null;
let S = { str: '', idx: 0, oSt: null, mSt: null, playing: false, oFin: new Set(), mFin: new Set(), oTr: {}, mTr: {}, history: [] };
function buildSimCyStyle() { return buildCyStyle().concat([{ selector: '.sim-active', style: { 'background-color': '#F59E0B', 'border-color': '#F59E0B', 'color': '#fff', 'background-opacity': 1 } }, { selector: '.sim-edge', style: { 'line-color': '#F59E0B', 'target-arrow-color': '#F59E0B', 'width': 4, 'z-index': 99, 'opacity': 1 } }]); }
function fitSimGraph(type) { const cyT = type === 'orig' ? simCyOrig : simCyMin; if (!cyT) return; cyT.layout({ name: 'cose', animate: true, animationDuration: Math.min(ANIM_MS, 800), padding: 50, idealEdgeLength: 90, nodeOverlap: 40, componentSpacing: 80, nodeRepulsion: 200000, edgeElasticity: 120, nestingFactor: 5, gravity: 80, numIter: 1000, stop: function () { cyT.fit(undefined, 60); let z = cyT.zoom(); if (z < 0.9) { cyT.zoom(0.9); cyT.center(); } else if (z > 1.5) { cyT.zoom(1.5); cyT.center(); } } }).run(); }

function buildSimGraph(containerId, states, trans, start, finals, alpha) {
  const AL = alpha || G.alpha;
  const cyInst = cytoscape({ container: document.getElementById(containerId), elements: [], style: buildSimCyStyle(), layout: { name: 'preset' }, userZoomingEnabled: true, userPanningEnabled: true, boxSelectionEnabled: false, minZoom: 0.4, maxZoom: 3 });
  attachTooltips(cyInst);
  const edgeMap = {}; states.forEach(st => AL.forEach(a => { const t = trans[st]?.[a]; if (!t || !states.includes(t)) return; const k = `${st}->${t}`; if (!edgeMap[k]) edgeMap[k] = { from: st, to: t, syms: [] }; edgeMap[k].syms.push(a); }));
  const biDir = new Set(); Object.keys(edgeMap).forEach(k => { const { from, to } = edgeMap[k]; if (from !== to && edgeMap[`${to}->${from}`]) { biDir.add(k); biDir.add(`${to}->${from}`); } });
  const elems = []; states.forEach(st => elems.push({ group: 'nodes', data: { id: st, label: st, isFinal: finals.has(st) ? true : undefined, isStart: st === start ? true : undefined } }));
  Object.entries(edgeMap).forEach(([k, { from, to, syms }]) => elems.push({ group: 'edges', data: { id: `e-${k}`, source: from, target: to, label: syms.join(', ') } }));
  cyInst.add(elems);
  const c = getThemeColors();
  cyInst.nodes().forEach(n => { n.style({ 'background-color': c.bg, 'border-color': n.data('isStart') ? c.start : c.border, 'border-width': n.data('isFinal') ? 5 : (n.data('isStart') ? 2.5 : 2), 'border-style': n.data('isFinal') ? 'double' : 'solid', 'color': c.text }); });
  cyInst.edges().forEach(e => { const isBi = biDir.has(e.id().substring(2)); e.style({ 'curve-style': isBi ? 'bezier' : 'bezier', 'control-point-step-size': isBi ? 65 : 60 }); });
  cyInst.edges('[source = target]').style({ 'curve-style': 'loop' });
  if (start) { cyInst.add([{ group: 'nodes', data: { id: '__sg__', label: '' } }, { group: 'edges', data: { id: '__se__', source: '__sg__', target: start, label: '' } }]); cyInst.$id('__sg__').style({ 'width': 1, 'height': 1, 'opacity': 0, 'events': 'no' }).ungrabify().unselectify(); cyInst.$id('__se__').style({ 'line-color': '#F59E0B', 'target-arrow-color': '#F59E0B', 'target-arrow-shape': 'triangle', 'width': 2, 'curve-style': 'straight', 'events': 'no' }); }
  cyInst.layout({ name: 'cose', animate: false, padding: 50, idealEdgeLength: 90, nodeOverlap: 40, componentSpacing: 80, nodeRepulsion: 200000, edgeElasticity: 120, nestingFactor: 5, gravity: 80, numIter: 1000, stop: function () { if (start && cyInst.$id(start).length) cyInst.$id('__sg__').position({ x: cyInst.$id(start).position().x - 90, y: cyInst.$id(start).position().y }); cyInst.fit(undefined, 60); } }).run();
  return cyInst;
}

function initSimulator() {
  const errs = validate(); if (errs.length) { alert("Please complete a valid DFA configuration first."); switchView('minimizer'); return; }
  const steps = computeSteps(), minStep = steps[steps.length - 1];
  if (simCyOrig) simCyOrig.destroy(); if (simCyMin) simCyMin.destroy();
  simCyOrig = buildSimGraph('cy-orig-container', G.states, G.trans, G.start, G.finals);
  simCyMin = buildSimGraph('cy-min-container', minStep.minInfo.minSts, minStep.minInfo.minTr, minStep.minInfo.minStart, minStep.minInfo.minFin);
  S.oFin = new Set(G.finals); S.mFin = new Set(minStep.minInfo.minFin); S.oTr = G.trans; S.mTr = minStep.minInfo.minTr; S.oStart = G.start; S.mStart = minStep.minInfo.minStart; simReset();
}
function simOnInput() { const val = document.getElementById('sim-input').value.trim(); const invalid = val.split('').find(c => !G.alpha.includes(c)); if (invalid) { document.getElementById('sim-input').style.borderColor = 'var(--c3)'; document.getElementById('sim-btn-play').disabled = true; document.getElementById('sim-btn-step').disabled = true; } else { document.getElementById('sim-input').style.borderColor = 'var(--border2)'; document.getElementById('sim-btn-play').disabled = false; document.getElementById('sim-btn-step').disabled = false; S.str = val; simReset(); } }
function drawTape() { const tape = document.getElementById('sim-tape'); if (!S.str) { tape.innerHTML = `<span style="color:var(--dim);font-size:13px;margin-top:8px;">Enter a string to test</span>`; return; } tape.innerHTML = S.str.split('').map((c, i) => `<div class="sim-char ${i === 0 ? 'active' : ''}" id="sc-${i}">${c}</div>`).join(''); }
function setSimStatus(id, text, type) { const el = document.getElementById(id); el.className = `sim-status-bar show ${type}`; el.textContent = text; }
function clearSimStatus() { document.getElementById('sim-stat-orig').className = 'sim-status-bar'; document.getElementById('sim-stat-min').className = 'sim-status-bar'; }
function simReset() { S.idx = 0; S.playing = false; S.oSt = S.oStart; S.mSt = S.mStart; S.history = [{ oSt: S.oSt, mSt: S.mSt }]; document.getElementById('sim-btn-play').textContent = 'Play'; document.getElementById('sim-btn-prev').disabled = true; document.getElementById('sim-btn-step').disabled = !S.str; document.getElementById('sim-btn-play').disabled = !S.str; drawTape(); clearSimStatus(); if (simCyOrig) { simCyOrig.elements().removeClass('sim-active sim-edge'); simCyOrig.$id(S.oSt).addClass('sim-active'); } if (simCyMin) { simCyMin.elements().removeClass('sim-active sim-edge'); simCyMin.$id(S.mSt).addClass('sim-active'); } }
async function simPrev() { if (S.idx <= 0) return; S.playing = false; document.getElementById('sim-btn-play').textContent = 'Play'; if (S.idx < S.str.length) document.getElementById(`sc-${S.idx}`)?.classList.remove('active'); S.idx--; const hist = S.history[S.idx]; S.oSt = hist.oSt; S.mSt = hist.mSt; document.getElementById(`sc-${S.idx}`)?.classList.remove('done'); document.getElementById(`sc-${S.idx}`)?.classList.add('active'); document.getElementById('sim-btn-prev').disabled = S.idx === 0; document.getElementById('sim-btn-step').disabled = false; document.getElementById('sim-btn-play').disabled = false; clearSimStatus(); simCyOrig.elements().removeClass('sim-active sim-edge'); simCyMin.elements().removeClass('sim-active sim-edge'); if (S.oSt) simCyOrig.$id(S.oSt).addClass('sim-active'); if (S.mSt) simCyMin.$id(S.mSt).addClass('sim-active'); }
async function simPlay() { if (S.idx >= S.str.length) simReset(); S.playing = !S.playing; document.getElementById('sim-btn-play').textContent = S.playing ? 'Pause' : 'Play'; while (S.playing && S.idx < S.str.length) { await simStepLogic(); if (S.playing) await sleep(ANIM_MS * .4); } if (S.idx >= S.str.length) document.getElementById('sim-btn-play').textContent = 'Restart'; }
async function simStep() { S.playing = false; document.getElementById('sim-btn-play').textContent = 'Play'; if (S.idx >= S.str.length) simReset(); else await simStepLogic(); }
async function simStepLogic() { if (S.idx >= S.str.length) return; const char = S.str[S.idx]; const nextO = S.oSt ? S.oTr[S.oSt]?.[char] : null; const nextM = S.mSt ? S.mTr[S.mSt]?.[char] : null; if (nextO) simCyOrig.$(`#e-${CSS.escape(S.oSt + '->' + nextO)}`).addClass('sim-edge'); if (nextM) simCyMin.$(`#e-${CSS.escape(S.mSt + '->' + nextM)}`).addClass('sim-edge'); await sleep(ANIM_MS * .7); simCyOrig.elements().removeClass('sim-active sim-edge'); simCyMin.elements().removeClass('sim-active sim-edge'); document.getElementById(`sc-${S.idx}`)?.classList.remove('active'); document.getElementById(`sc-${S.idx}`)?.classList.add('done'); S.oSt = nextO; S.mSt = nextM; S.idx++; S.history[S.idx] = { oSt: S.oSt, mSt: S.mSt }; if (S.oSt) simCyOrig.$id(S.oSt).addClass('sim-active'); if (S.mSt) simCyMin.$id(S.mSt).addClass('sim-active'); document.getElementById('sim-btn-prev').disabled = false; if (S.idx === S.str.length) { const oAcc = S.oSt && S.oFin.has(S.oSt); const mAcc = S.mSt && S.mFin.has(S.mSt); setSimStatus('sim-stat-orig', oAcc ? 'Accepted' : 'Rejected', oAcc ? 'accept' : 'reject'); setSimStatus('sim-stat-min', mAcc ? 'Accepted' : 'Rejected', mAcc ? 'accept' : 'reject'); S.playing = false; document.getElementById('sim-btn-play').textContent = 'Restart'; document.getElementById('sim-btn-step').disabled = true; } else { document.getElementById(`sc-${S.idx}`)?.classList.add('active'); } }

/* ─────────────────────────── PRACTICE MODE ─────────────────────────── */
let pracCy = null;
let PracData = { isActive: false, targetUnreach: [], targetParts: [], selectedState: null, groupCounter: 1, dfa: null, minInfo: null, isAnimating: false };

function startPracticeChallenge(difficulty) {
  hidePracFeedback(); document.getElementById('verify-prac-btn').disabled = false; PracData.isAnimating = false;
  const newDfa = generateRandomDFA(difficulty); PracData.dfa = newDfa; computePracticeSolutions(newDfa); PracData.isActive = true;
  if (pracCy) pracCy.destroy();
  pracCy = buildSimGraph('cy-prac-container', newDfa.states, newDfa.trans, newDfa.start, new Set(newDfa.finals), newDfa.alpha);
  updateCyTheme();
  PracData.selectedState = null; PracData.groupCounter = 1;
  const unassignedBox = document.getElementById('prac-unassigned'); unassignedBox.innerHTML = '';
  newDfa.states.forEach(st => {
    const isFin = newDfa.finals.includes(st);
    const chip = document.createElement('div'); chip.className = 'prac-chip'; chip.dataset.state = st;
    chip.innerHTML = st + (isFin ? '<span style="color:var(--c2);margin-left:4px;">★</span>' : '');
    chip.addEventListener('click', function (e) { selectPracState(e, this); });
    unassignedBox.appendChild(chip);
  });
  document.getElementById('prac-trash').innerHTML = ''; document.getElementById('prac-groups-container').innerHTML = '';
  addPracGroup(); addPracGroup();
}

function computePracticeSolutions(dfa) {
  const ST = dfa.states, AL = dfa.alpha, TR = dfa.trans, START = dfa.start, FIN = new Set(dfa.finals);
  const reach = new Set([START]); const q = [START]; while (q.length) { const s = q.shift(); AL.forEach(a => { const t = TR[s]?.[a]; if (t && !reach.has(t)) { reach.add(t); q.push(t); } }); }
  const work = ST.filter(s => reach.has(s)); PracData.targetUnreach = ST.filter(s => !reach.has(s)).sort();
  const fin = work.filter(s => FIN.has(s)), nfin = work.filter(s => !FIN.has(s));
  let part = []; if (fin.length) part.push([...fin]); if (nfin.length) part.push([...nfin]);
  const gof = (s, p) => p.findIndex(g => g.includes(s));
  while (true) { let changed = false, nextPart = []; for (let i = 0; i < part.length; i++) { let grp = part[i]; if (grp.length === 1) { nextPart.push(grp); continue; } let sigMap = {}; grp.forEach(s => { let sig = AL.map(a => { let t = TR[s]?.[a]; return t ? gof(t, part) : -1; }).join(','); if (!sigMap[sig]) sigMap[sig] = []; sigMap[sig].push(s); }); let subs = Object.values(sigMap); if (subs.length > 1) { changed = true; subs.forEach(sg => nextPart.push(sg)); } else { nextPart.push(grp); } } part = nextPart; if (!changed) break; }
  PracData.targetParts = part.map(p => [...p].sort().join(',')).sort();
  const pName = g => g.join(''), gof2 = (s, p) => p.findIndex(g => g.includes(s));
  const minSts = part.map(g => pName(g)), minStart = pName(part[gof2(START, part)]);
  const minFin = new Set(part.map(g => g.some(s => FIN.has(s)) ? pName(g) : null).filter(Boolean));
  const minTr = {}; part.forEach(g => { const name = pName(g), rep = g[0]; minTr[name] = {}; AL.forEach(a => { const t = TR[rep]?.[a]; if (t && gof2(t, part) >= 0) minTr[name][a] = pName(part[gof2(t, part)]); }); });
  PracData.minInfo = { minSts, minStart, minFin, minTr, part, partNames: minSts };
}

/* ─────────────────────────── COLLAPSIBLE SECTIONS ─────────────────────────── */
function toggleCollapse(bodyId, toggleId) {
  const body = document.getElementById(bodyId);
  const toggle = document.getElementById(toggleId);
  if (!body || !toggle) return;
  const collapsed = body.classList.toggle('collapsed');
  toggle.classList.toggle('collapsed', collapsed);
}

function addPracGroup() {
  const container = document.getElementById('prac-groups-container');
  // Use actual current count of existing groups to determine number
  const existingGroups = container.querySelectorAll('.prac-group-wrap').length;
  const groupNum = existingGroups + 1;
  const colorIdx = (groupNum - 1) % CHEX.length;
  const color = CHEX[colorIdx];
  const wrap = document.createElement('div'); wrap.className = 'prac-group-wrap';
  const box = document.createElement('div'); box.className = 'prac-box prac-group-box'; box.dataset.label = `Group ${groupNum}`; box.style.borderTop = `3px solid ${color}`;
  box.addEventListener('click', function () { assignPracState(this); });
  const delBtn = document.createElement('button'); delBtn.className = 'prac-group-delete-btn'; delBtn.title = 'Delete this group'; delBtn.innerHTML = '✕';
  delBtn.addEventListener('click', function (e) { e.stopPropagation(); deletePracGroup(wrap, box); });
  box.appendChild(delBtn); wrap.appendChild(box); container.appendChild(wrap);
  PracData.groupCounter = groupNum + 1;
}

function deletePracGroup(wrapElement, boxElement) {
  if (PracData.isAnimating) return;
  const chips = Array.from(boxElement.querySelectorAll('.prac-chip'));
  const unassignedBox = document.getElementById('prac-unassigned');
  chips.forEach(chip => { chip.classList.remove('selected'); unassignedBox.appendChild(chip); });
  if (PracData.selectedState && chips.includes(PracData.selectedState)) { PracData.selectedState.classList.remove('selected'); PracData.selectedState = null; }
  wrapElement.remove();
  // Renumber all remaining groups
  renamePracGroups();
}

function renamePracGroups() {
  const container = document.getElementById('prac-groups-container');
  const wraps = container.querySelectorAll('.prac-group-wrap');
  wraps.forEach((wrap, idx) => {
    const groupNum = idx + 1;
    const colorIdx = (groupNum - 1) % CHEX.length;
    const color = CHEX[colorIdx];
    const box = wrap.querySelector('.prac-box');
    if (box) {
      box.dataset.label = `Group ${groupNum}`;
      box.style.borderTop = `3px solid ${color}`;
    }
  });
  PracData.groupCounter = wraps.length + 1;
}

function selectPracState(e, element) {
  e.stopPropagation(); if (PracData.isAnimating) return;
  document.querySelectorAll('.prac-chip').forEach(c => c.classList.remove('selected'));
  if (PracData.selectedState === element) { PracData.selectedState = null; } else { element.classList.add('selected'); PracData.selectedState = element; }
}
function assignPracState(boxElement) {
  if (!PracData.selectedState || PracData.isAnimating) return;
  boxElement.classList.add('active-target'); setTimeout(() => boxElement.classList.remove('active-target'), 150);
  boxElement.appendChild(PracData.selectedState); PracData.selectedState.classList.remove('selected'); PracData.selectedState = null;
}
function showPracFeedback(msg, type) { const fb = document.getElementById('prac-feedback'); fb.className = ''; fb.innerHTML = msg; fb.style.display = 'block'; fb.className = (type === 'error') ? 'prac-error' : 'prac-success'; }
function hidePracFeedback() { const fb = document.getElementById('prac-feedback'); fb.style.display = 'none'; fb.className = ''; fb.innerHTML = ''; }

function checkPracticeAnswer() {
  if (PracData.isAnimating) return;
  const unassigned = document.getElementById('prac-unassigned');
  if (Array.from(unassigned.querySelectorAll('.prac-chip')).length > 0) { showPracFeedback("Please assign all states to a group or the trash before verifying.", "error"); return; }
  const trashBox = document.getElementById('prac-trash');
  const userUnreach = Array.from(trashBox.querySelectorAll('.prac-chip')).map(c => c.dataset.state).sort();
  const actualUnreach = PracData.targetUnreach;
  const missedUnreach = actualUnreach.filter(s => !userUnreach.includes(s));
  const wronglyTrashed = userUnreach.filter(s => !actualUnreach.includes(s));
  if (missedUnreach.length > 0) { showPracFeedback(`<strong>Mistake:</strong> You missed unreachable states: <strong>{${missedUnreach.join(', ')}}</strong>.<br><span style="font-size:11px;opacity:.8;">Trace the arrows from the start state. These can never be reached.</span>`, "error"); return; }
  if (wronglyTrashed.length > 0) { showPracFeedback(`<strong>Mistake:</strong> You trashed reachable states: <strong>{${wronglyTrashed.join(', ')}}</strong>.<br><span style="font-size:11px;opacity:.8;">There is a valid path from the start state to these nodes.</span>`, "error"); return; }
  const userGroups = []; document.querySelectorAll('.prac-group-box').forEach(box => { const chips = Array.from(box.querySelectorAll('.prac-chip')); const states = chips.map(c => c.dataset.state).sort(); if (states.length > 0) userGroups.push(states); });
  const reachableStates = PracData.dfa.states.filter(s => !actualUnreach.includes(s));
  const missingFromGroups = reachableStates.filter(s => !userGroups.flat().includes(s));
  if (missingFromGroups.length > 0) { showPracFeedback(`<strong>Incomplete:</strong> States <strong>{${missingFromGroups.join(', ')}}</strong> are not in any equivalence group.`, "error"); return; }
  const FIN = new Set(PracData.dfa.finals);
  for (let i = 0; i < userGroups.length; i++) { const g = userGroups[i]; let hasFin = false, hasNonFin = false; g.forEach(s => { if (FIN.has(s)) hasFin = true; else hasNonFin = true; }); if (hasFin && hasNonFin) { showPracFeedback(`<strong>Mistake in {${g.join(', ')}}:</strong><br>You mixed Final (★) and Non-Final states.<br><span style="font-size:11px;opacity:.8;">Rule #1: Final and Non-Final states are always distinguishable.</span>`, "error"); return; } }
  const userPartsStr = userGroups.map(g => g.join(',')).sort();
  const targetPartsStr = PracData.targetParts;
  if (userPartsStr.join('|') === targetPartsStr.join('|')) { showPracFeedback("<strong>Mathematical Proof Verified! 🎉</strong><br>Watch the graph minimize...", "success"); document.getElementById('verify-prac-btn').disabled = true; animatePracticeMinimization(); return; }
  if (userGroups.length > targetPartsStr.length) { showPracFeedback(`<strong>Almost there!</strong> But you have too many groups (${userGroups.length}).<br><span style="font-size:11px;opacity:.8;">The minimal DFA only needs ${targetPartsStr.length} groups. Some groups behave identically and can be merged!</span>`, "error"); }
  else { showPracFeedback(`<strong>Mistake:</strong> You merged states that shouldn't be together.<br><span style="font-size:11px;opacity:.8;">Rule #2: For states to stay together, every input must lead them to the SAME destination group.</span>`, "error"); }
}

async function animatePracticeMinimization() {
  PracData.isAnimating = true; const minData = PracData.minInfo; if (!minData || !pracCy) return;
  const unreachAnims = []; PracData.targetUnreach.forEach(id => { const node = pracCy.$id(id); if (node.length) { unreachAnims.push(node.animation({ style: { opacity: 0, width: 0, height: 0 } }, { duration: 600 }).play().promise()); node.connectedEdges().forEach(e => unreachAnims.push(e.animation({ style: { opacity: 0 } }, { duration: 600 }).play().promise())); } });
  if (unreachAnims.length) await Promise.all(unreachAnims); PracData.targetUnreach.forEach(id => pracCy.remove(pracCy.$id(id)));
  const mergeAnims = []; minData.part.forEach(grp => { let cx = 0, cyL = 0, count = 0; grp.forEach(id => { const node = pracCy.$id(id); if (node.length) { cx += node.position('x'); cyL += node.position('y'); count++; } }); if (count > 0) { cx /= count; cyL /= count; grp.forEach(id => { const node = pracCy.$id(id); if (node.length) mergeAnims.push(node.animation({ position: { x: cx, y: cyL } }, { duration: 800, easing: 'ease-in-out' }).play().promise()); }); } });
  await Promise.all(mergeAnims);
  const pulseAnims = []; pracCy.nodes().forEach(n => { if (n.id() !== '__start_ghost__' && n.id() !== '__sg__') pulseAnims.push(n.animation({ style: { width: 74, height: 74, 'background-color': '#F59E0B' } }, { duration: 150 }).play().promise()); });
  await Promise.all(pulseAnims);
  pracCy.destroy(); pracCy = buildSimGraph('cy-prac-container', minData.minSts, minData.minTr, minData.minStart, minData.minFin, PracData.dfa.alpha); updateCyTheme();
}

/* ─────────────────────────── INIT ─────────────────────────── */
initCy();
