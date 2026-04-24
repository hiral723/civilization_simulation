/* ══════════════════════════════════════════════════════════════
   Chronicles of Collapse — Enhanced Frontend
══════════════════════════════════════════════════════════════ */

const API = '/api/civilizations';
let chartInstance = null;
let radarInstance = null;
let rateInstance  = null;
let currentCivId  = 1;
let allEvents     = [];
let currentFilter = 'all';

// ── BOOT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadCivList();
  await loadCiv(1);
  await loadLeaderboard();
  initFormRows();
});

// ── TAB SWITCHING ────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`.nav-tab[onclick="switchTab('${name}')"]`).classList.add('active');
  document.getElementById(`tab-${name}`).classList.add('active');
  if (name === 'leaderboard') loadLeaderboard();
}

// ── CIVILIZATION LIST ────────────────────────────────────────
async function loadCivList() {
  const civs = await apiFetch(API);
  const selector = document.getElementById('civSelector');
  selector.innerHTML = '';
  civs.forEach(civ => {
    const isPass = civ.case_type === 'pass';
    const card   = document.createElement('div');
    card.className  = `civ-card ${isPass ? 'pass' : 'fail'}`;
    card.dataset.id = civ.civ_id;
    card.onclick    = () => loadCiv(civ.civ_id);
    const deleteBtn = civ.civ_id > 2
      ? `<button class="delete-btn" onclick="event.stopPropagation();deleteCiv(${civ.civ_id},'${civ.name.replace(/'/g,"\\'")}')">Delete</button>`
      : '';
    card.innerHTML = `
      <span class="civ-tag tag-${civ.case_type}">${civ.case_type.toUpperCase()} CASE</span>
      <h2>${civ.name}</h2>
      <p>${civ.region}</p>
      <div class="civ-period">${formatYear(civ.start_year)} — ${formatYear(civ.end_year)}</div>
      ${deleteBtn}
    `;
    selector.appendChild(card);
  });
}

// ── LOAD A CIVILIZATION ──────────────────────────────────────
async function loadCiv(civId) {
  currentCivId = civId;
  document.querySelectorAll('.civ-card').forEach(c =>
    c.classList.toggle('active', parseInt(c.dataset.id) === civId)
  );

  const [snapshots, events, analysis, radarData, rateData] = await Promise.all([
    apiFetch(`${API}/${civId}/snapshots`),
    apiFetch(`${API}/${civId}/events`),
    apiFetch(`${API}/${civId}/analysis`),
    apiFetch(`${API}/${civId}/radar`),
    apiFetch(`${API}/${civId}/decline-rate`),
  ]);

  allEvents = events;
  renderStats(analysis);
  renderCollapsePanel(analysis);
  renderChart(snapshots);
  renderRadarChart(radarData);
  renderRateChart(rateData.rates, snapshots);
  renderEvents(events, currentFilter);
  renderTimeline(events, snapshots);

}

// ── STATS ROW ────────────────────────────────────────────────
function renderStats(a) {
  const isPass = a.collapse_prob < 50;
  const tiles = [
    { label:'Peak Population', value:`${a.peak_population_m}M`,
      sub:'across all snapshots',
      color: isPass ? '#7BC48A' : '#E07050',
      fill: Math.min(1, a.peak_population_m / 20),
      fillColor: isPass ? '#5B9E6A' : '#D4522A' },
    { label:'Peak Tech Level', value:`T${a.peak_tech_level}`,
      sub:'out of 10',
      color:'#C8A951', fill: a.peak_tech_level / 10, fillColor:'#C8A951' },
    { label:'Collapse Risk', value:`${a.collapse_prob}%`,
      sub: isPass ? 'Managed decline' : 'Critical failure',
      color: a.collapse_prob > 60 ? '#C05050' : '#E07050',
      fill: a.collapse_prob / 100,
      fillColor: a.collapse_prob > 60 ? '#9B3030' : '#D4522A' },
    { label:'Resilience Score', value:`${a.resilience_score}`,
      sub:'0 = fragile, 100 = robust',
      color: a.resilience_score > 60 ? '#7BC48A' : a.resilience_score > 30 ? '#C8A951' : '#C05050',
      fill: a.resilience_score / 100,
      fillColor: a.resilience_score > 60 ? '#5B9E6A' : '#C8A951' },
  ];
  document.getElementById('statsRow').innerHTML = tiles.map(t => `
    <div class="stat-tile fade-in">
      <div class="stat-label">
        <span class="stat-icon" style="background:${t.fillColor}44;border:1px solid ${t.fillColor}88"></span>
        ${t.label}
      </div>
      <div class="stat-value" style="color:${t.color}">${t.value}</div>
      <div class="stat-sub">${t.sub}</div>
      <div class="phase-bar"><div class="phase-fill" style="width:${Math.round(t.fill*100)}%;background:${t.fillColor}"></div></div>
    </div>
  `).join('');
}

// ── COLLAPSE PANEL ───────────────────────────────────────────
function renderCollapsePanel(a) {
  const pct = a.collapse_prob;
  document.getElementById('collapsArc').style.strokeDashoffset = 201 - (201 * pct / 100);
  document.getElementById('collapsePct').textContent = pct + '%';
  document.getElementById('collapseTitle').textContent =
    pct > 60 ? `Critical Collapse Probability — ${pct}%` : `Low Collapse Risk — Managed Decline`;
  document.getElementById('collapseDesc').textContent =
    pct > 60
      ? 'Rapid resource depletion and inter-city warfare drove cascading failure — agricultural collapse triggered mass abandonment.'
      : 'Despite eventual fall, decline was multi-century and gradual. Institutional continuity enabled successor states.';
  document.getElementById('stabIdx').textContent     = a.stability_index;
  document.getElementById('stabIdx').style.color     = pct > 60 ? '#C05050' : '#7BC48A';
  document.getElementById('growthPhase').textContent = a.growth_phase_now;
  document.getElementById('resPressure').textContent = a.resource_pressure;
  document.getElementById('resPressure').style.color =
    a.resource_pressure === 'critical' ? '#C05050' : a.resource_pressure === 'high' ? '#E07050' : '#C8A951';
  document.getElementById('resilienceScore').textContent = a.resilience_score;
  document.getElementById('longevityTier').textContent   = a.longevity_tier || '—';
}

// ── MAIN LINE CHART ──────────────────────────────────────────
function renderChart(snapshots) {
  const labels     = snapshots.map(s => s.year_label);
  const population = snapshots.map(s => parseFloat(s.population_m));
  const tech       = snapshots.map(s => parseFloat(s.tech_level));
  const energy     = snapshots.map(s => parseFloat(s.energy_index));
  const resources  = snapshots.map(s => +(parseFloat(s.resource_pct) / 10).toFixed(1));
  const stability  = snapshots.map(s => +(parseFloat(s.stability_idx) / 10).toFixed(1));

  document.getElementById('chartLegend').innerHTML = [
    { color:'#7BC48A', label:'Population (M)' },
    { color:'#C8A951', label:'Tech Level' },
    { color:'#6B9ACE', label:'Energy Index' },
    { color:'#A0785A', label:'Resources ÷10' },
    { color:'#C05050', label:'Stability ÷10' },
  ].map(l => `<span class="legend-item"><span class="legend-dot" style="background:${l.color}"></span>${l.label}</span>`).join('');

  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(document.getElementById('mainChart').getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label:'Population', data:population, borderColor:'#7BC48A', backgroundColor:'rgba(91,158,106,0.07)', fill:true, tension:0.4, pointRadius:4, pointHoverRadius:6 },
        { label:'Tech',       data:tech,        borderColor:'#C8A951', backgroundColor:'transparent', tension:0.4, pointRadius:4 },
        { label:'Energy',     data:energy,      borderColor:'#6B9ACE', backgroundColor:'transparent', tension:0.4, pointRadius:4 },
        { label:'Resources',  data:resources,   borderColor:'#A0785A', backgroundColor:'transparent', borderDash:[4,3], tension:0.4, pointRadius:4 },
        { label:'Stability',  data:stability,   borderColor:'#C05050', backgroundColor:'transparent', borderDash:[2,2], tension:0.4, pointRadius:4 },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      interaction:{ mode:'index', intersect:false },
      plugins:{
        legend:{ display:false },
        tooltip:{
          backgroundColor:'#1A1410', borderColor:'rgba(200,169,81,0.3)', borderWidth:1,
          titleColor:'#C8A951', bodyColor:'#D8CDB8',
          titleFont:{ family:'Cinzel, serif', size:11 }
        }
      },
      scales:{
        x:{ grid:{ color:'rgba(200,169,81,0.06)' }, ticks:{ color:'#8A7F6E', font:{ size:11, family:'Cinzel, serif' } } },
        y:{ grid:{ color:'rgba(200,169,81,0.06)' }, ticks:{ color:'#8A7F6E', font:{ size:11 } }, min:0, max:16 }
      }
    }
  });
}

// ── RADAR CHART ──────────────────────────────────────────────
function renderRadarChart(data) {
  if (radarInstance) radarInstance.destroy();
  radarInstance = new Chart(document.getElementById('radarChart').getContext('2d'), {
    type: 'radar',
    data: {
      labels: data.labels,
      datasets: [{
        label: 'Civilization Profile',
        data: data.values,
        backgroundColor: 'rgba(200,169,81,0.1)',
        borderColor: 'rgba(200,169,81,0.7)',
        pointBackgroundColor: '#C8A951',
        pointBorderColor: '#C8A951',
        pointHoverBackgroundColor: '#E8C870',
        borderWidth: 1.5,
        pointRadius: 3,
      }]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      scales:{
        r:{
          min: 0, max: 100,
          grid:{ color:'rgba(200,169,81,0.1)' },
          angleLines:{ color:'rgba(200,169,81,0.12)' },
          ticks:{ color:'rgba(200,169,81,0.5)', backdropColor:'transparent', font:{ size:9 }, stepSize:25 },
          pointLabels:{ color:'#8A7F6E', font:{ size:10, family:'Cinzel, serif' } }
        }
      },
      plugins:{
        legend:{ display:false },
        tooltip:{ backgroundColor:'#1A1410', borderColor:'rgba(200,169,81,0.3)', borderWidth:1, titleColor:'#C8A951', bodyColor:'#D8CDB8' }
      }
    }
  });
}

// ── DECLINE RATE CHART ───────────────────────────────────────
function renderRateChart(rates, snapshots) {
  if (!rates || rates.length === 0) return;
  if (rateInstance) rateInstance.destroy();

  const labels = rates.map(r => `${r.from_year} → ${r.to_year}`);
  const stabRates = rates.map(r => r.stability_rate);
  const resRates  = rates.map(r => r.resource_rate);
  const popRates  = rates.map(r => r.pop_rate);

  rateInstance = new Chart(document.getElementById('rateChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Stability Δ/yr', data: stabRates, backgroundColor: rates.map(r => r.stability_rate < 0 ? 'rgba(192,80,80,0.6)' : 'rgba(91,158,106,0.6)'), borderColor: rates.map(r => r.stability_rate < 0 ? '#C05050' : '#5B9E6A'), borderWidth: 1 },
        { label: 'Resource Δ/yr', data: resRates, backgroundColor: rates.map(r => r.resource_rate < 0 ? 'rgba(139,115,85,0.5)' : 'rgba(91,158,106,0.4)'), borderColor: rates.map(r => r.resource_rate < 0 ? '#8B7355' : '#5B9E6A'), borderWidth: 1 },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      interaction:{ mode:'index', intersect:false },
      plugins:{
        legend:{ display:true, labels:{ color:'#8A7F6E', font:{ size:10, family:'Cinzel,serif' }, boxWidth:10, boxHeight:10 } },
        tooltip:{ backgroundColor:'#1A1410', borderColor:'rgba(200,169,81,0.3)', borderWidth:1, titleColor:'#C8A951', bodyColor:'#D8CDB8' }
      },
      scales:{
        x:{ grid:{ color:'rgba(200,169,81,0.06)' }, ticks:{ color:'#8A7F6E', font:{ size:9 } } },
        y:{ grid:{ color:'rgba(200,169,81,0.06)' }, ticks:{ color:'#8A7F6E', font:{ size:10 } } }
      }
    }
  });
}

// ── EVENTS (with filter) ─────────────────────────────────────
function renderEvents(events, filter) {
  const filtered = filter === 'all' ? events : events.filter(e => e.event_type === filter);
  document.getElementById('eventList').innerHTML = filtered.length === 0
    ? `<div class="empty-state">No ${filter} events recorded.</div>`
    : filtered.map(e => `
      <div class="event-row ${e.event_type} fade-in">
        <span class="event-year">${e.year_label}</span>
        <span class="event-name">${e.event_name}</span>
        <span class="event-badge badge-${e.event_type}">${e.event_type}</span>
      </div>
    `).join('');
}

function filterEvents(type, btn) {
  currentFilter = type;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderEvents(allEvents, type);
}

// ── TIMELINE TAB ─────────────────────────────────────────────
function renderTimeline(events, snapshots) {
  const panel = document.getElementById('timelinePanel');
  if (!events.length && !snapshots.length) {
    panel.innerHTML = '<div class="empty-state">No data available.</div>';
    return;
  }

  // Merge events and snapshot phase changes
  const items = [];
  events.forEach(e => items.push({ year: e.year_numeric, label: e.year_label, name: e.event_name, type: e.event_type, impact: e.impact_score, kind: 'event' }));
  snapshots.forEach(s => items.push({ year: s.year_numeric, label: s.year_label, name: `${s.growth_phase.charAt(0).toUpperCase() + s.growth_phase.slice(1)} Phase — Pop: ${s.population_m}M, Stability: ${s.stability_idx}`, type: s.growth_phase, impact: null, kind: 'snapshot' }));

  items.sort((a, b) => a.year - b.year);

  panel.innerHTML = items.map(item => {
    const phaseType = item.kind === 'snapshot'
      ? (item.type === 'peak' ? 'innovation' : item.type === 'collapse' ? 'collapse' : item.type === 'decline' ? 'conflict' : '')
      : item.type;
    const impactStr = item.impact !== null
      ? `<div class="timeline-impact">Impact: ${item.impact > 0 ? '+' : ''}${item.impact}</div>` : '';
    const kindLabel = item.kind === 'snapshot'
      ? `<span class="tag-badge badge-resource">snapshot</span> ` : '';
    return `
      <div class="timeline-item ${phaseType} fade-in">
        <div class="timeline-year">${item.label}</div>
        <div class="timeline-name">${kindLabel}${item.name}</div>
        ${impactStr}
      </div>
    `;
  }).join('');
}

// ── LEADERBOARD ──────────────────────────────────────────────
async function loadLeaderboard() {
  const data = await apiFetch(`${API}/leaderboard`);
  const maxScore = data.length > 0 ? Math.max(...data.map(r => r.legacy_score)) : 1;

  const medals = ['gold-rank', 'silver-rank', ''];

  const html = `
    <table class="leaderboard-table fade-in">
      <thead>
        <tr>
          <th>#</th>
          <th>Civilization</th>
          <th>Region</th>
          <th>Case</th>
          <th>Peak Pop</th>
          <th>Peak Tech</th>
          <th>Lifespan</th>
          <th>Legacy Score</th>
        </tr>
      </thead>
      <tbody>
        ${data.map((r, i) => `
          <tr onclick="switchTab('dashboard');loadCiv(${r.civ_id})" style="cursor:pointer">
            <td><div class="rank-badge ${medals[i] || ''}">${i + 1}</div></td>
            <td style="font-family:'Cinzel',serif;font-size:.88rem;color:#E8DCC8">${r.name}</td>
            <td style="color:var(--ash);font-size:.82rem;font-style:italic">${r.region}</td>
            <td><span class="tag-badge tag-${r.case_type}">${r.case_type.toUpperCase()}</span></td>
            <td style="font-family:'Cinzel',serif">${parseFloat(r.peak_pop).toFixed(1)}M</td>
            <td style="font-family:'Cinzel',serif">T${parseFloat(r.peak_tech).toFixed(1)}</td>
            <td style="color:var(--ash);font-size:.82rem">${r.lifespan_years > 0 ? r.lifespan_years + ' yrs' : '—'}</td>
            <td>
              <div style="font-family:'Cinzel',serif;color:var(--gold)">${r.legacy_score}</div>
              <div class="legacy-bar"><div class="legacy-fill" style="width:${Math.round((r.legacy_score / maxScore) * 100)}%"></div></div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <p style="font-size:.78rem;color:var(--ash);font-style:italic;margin-top:.5rem">
      Legacy Score = (Peak Pop × 2) + (Peak Tech × 5) + (Peak Stability × 0.5) + (Lifespan ÷ 100). Click a row to load that civilization.
    </p>
  `;

  document.getElementById('leaderboardContent').innerHTML = html;
}

// ── COMPARE ──────────────────────────────────────────────────
async function compareAll() {
  const ids = [...document.querySelectorAll('.civ-card')].map(c => c.dataset.id).join(',');
  const result = await apiFetch(`${API}/compare/stats?ids=${ids}`);

  document.getElementById('compareModal').innerHTML = `
    <div class="compare-grid fade-in">
      ${result.map(r => `
        <div class="compare-column">
          <h3>${r.name}</h3>
          <div class="compare-row">
            <span class="compare-key">Case Type</span>
            <span class="compare-val" style="color:${r.case_type === 'pass' ? 'var(--gold)' : 'var(--ember)'}">${r.case_type.toUpperCase()}</span>
          </div>
          <div class="compare-row">
            <span class="compare-key">Peak Population</span>
            <span class="compare-val">${parseFloat(r.peak_pop).toFixed(1)}M</span>
          </div>
          <div class="compare-row">
            <span class="compare-key">Peak Tech Level</span>
            <span class="compare-val">T${parseFloat(r.peak_tech).toFixed(1)}</span>
          </div>
          <div class="compare-row">
            <span class="compare-key">Min Resources %</span>
            <span class="compare-val" style="color:${parseFloat(r.min_resource) < 20 ? 'var(--ember)' : 'inherit'}">${parseFloat(r.min_resource).toFixed(1)}%</span>
          </div>
          <div class="compare-row">
            <span class="compare-key">Min Stability</span>
            <span class="compare-val" style="color:${parseFloat(r.min_stability) < 20 ? '#C05050' : 'inherit'}">${parseFloat(r.min_stability).toFixed(1)}</span>
          </div>
          <div class="compare-row">
            <span class="compare-key">Avg Energy</span>
            <span class="compare-val">${parseFloat(r.avg_energy).toFixed(1)}</span>
          </div>
        </div>
      `).join('')}
    </div>
    <button class="modal-close-btn" onclick="document.getElementById('compareModal').innerHTML=''">Close Comparison</button>
  `;
}

// ── UTILITY ──────────────────────────────────────────────────
async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

function formatYear(y) {
  if (y === null || y === undefined) return '?';
  return y < 0 ? `${Math.abs(y)} BCE` : `${y} CE`;
}

// ── DELETE ───────────────────────────────────────────────────
async function deleteCiv(civId, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    const res = await fetch(`${API}/${civId}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); alert(d.error || 'Delete failed'); return; }
    await loadCivList();
    await loadCiv(1);
  } catch (err) {
    alert('Delete failed: ' + err.message);
  }
}

/* ══════════════════════════════════════════════════════════════
   ADD CIVILIZATION FORM
══════════════════════════════════════════════════════════════ */
function initFormRows() {
  addSnapRow(); addSnapRow();
  addEvtRow();
}

function snapRowHTML(idx) {
  const phases = ['rise','peak','stagnation','decline','collapse'];
  const s = inputSty();
  return `
  <div class="snap-row" id="snap-${idx}">
    <input type="text"   placeholder="100 CE"  style="${s}" title="Year Label"/>
    <input type="number" placeholder="100"     style="${s}" title="Year (numeric)"/>
    <input type="number" placeholder="10.0"    style="${s}" step="0.1" title="Population (M)"/>
    <input type="number" placeholder="6.0"     style="${s}" step="0.1" title="Tech Level (0-10)"/>
    <input type="number" placeholder="5.0"     style="${s}" step="0.1" title="Energy Index"/>
    <input type="number" placeholder="70.0"    style="${s}" step="0.1" title="Resource %"/>
    <input type="number" placeholder="75.0"    style="${s}" step="0.1" title="Stability Index"/>
    <select style="${s}" title="Growth Phase">
      ${phases.map(p => `<option value="${p}">${p}</option>`).join('')}
    </select>
    <button class="rm-btn" onclick="removeRow('snap-${idx}')" title="Remove">×</button>
  </div>`;
}

let snapIdx = 0;
function addSnapRow() {
  document.getElementById('snapRows').insertAdjacentHTML('beforeend', snapRowHTML(snapIdx++));
}

function evtRowHTML(idx) {
  const types = ['innovation','conflict','resource','collapse'];
  const s = inputSty();
  return `
  <div class="evt-row" id="evt-${idx}">
    <input type="text"   placeholder="165 CE"             style="${s}" title="Year Label"/>
    <input type="number" placeholder="165"                style="${s}" title="Year (numeric)"/>
    <input type="text"   placeholder="Event description…" style="${s}" title="Event Name"/>
    <select style="${s}" title="Event Type">
      ${types.map(t => `<option value="${t}">${t}</option>`).join('')}
    </select>
    <input type="number" placeholder="0.5" step="0.05" min="-1" max="1" style="${s}" title="Impact Score (-1 to 1)"/>
    <button class="rm-btn" onclick="removeRow('evt-${idx}')" title="Remove">×</button>
  </div>`;
}

let evtIdx = 0;
function addEvtRow() {
  document.getElementById('evtRows').insertAdjacentHTML('beforeend', evtRowHTML(evtIdx++));
}

function removeRow(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function inputSty() {
  return 'background:rgba(255,255,255,0.04);border:1px solid rgba(200,169,81,0.2);border-radius:3px;color:#E8DCC8;font-family:\'Crimson Pro\',Georgia,serif;font-size:.85rem;padding:.4rem .5rem;width:100%;outline:none;';
}

async function submitCiv() {
  const msg    = document.getElementById('formMsg');
  const name   = document.getElementById('f-name').value.trim();
  const region = document.getElementById('f-region').value.trim();
  if (!name || !region) { showMsg(msg, 'err', 'Name and Region are required.'); return; }

  const snapRows = [...document.getElementById('snapRows').children];
  if (snapRows.length === 0) { showMsg(msg, 'err', 'Add at least one snapshot row.'); return; }

  const snapshots = snapRows.map(row => {
    const inputs = row.querySelectorAll('input, select');
    return {
      year_label:    inputs[0].value.trim() || String(inputs[1].value),
      year_numeric:  parseFloat(inputs[1].value) || 0,
      population_m:  parseFloat(inputs[2].value) || 0,
      tech_level:    parseFloat(inputs[3].value) || 0,
      energy_index:  parseFloat(inputs[4].value) || 0,
      resource_pct:  parseFloat(inputs[5].value) || 0,
      stability_idx: parseFloat(inputs[6].value) || 0,
      growth_phase:  inputs[7].value,
    };
  });

  const events = [...document.getElementById('evtRows').children]
    .map(row => {
      const inputs = row.querySelectorAll('input, select');
      return {
        year_label:   inputs[0].value.trim() || String(inputs[1].value),
        year_numeric: parseFloat(inputs[1].value) || 0,
        event_name:   inputs[2].value.trim(),
        event_type:   inputs[3].value,
        impact_score: parseFloat(inputs[4].value) || 0,
      };
    }).filter(e => e.event_name);

  const payload = {
    name, region,
    start_year: parseInt(document.getElementById('f-start').value) || null,
    end_year:   parseInt(document.getElementById('f-end').value)   || null,
    case_type:  document.getElementById('f-type').value,
    snapshots, events,
  };

  try {
    const res  = await fetch(API, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unknown error');
    showMsg(msg, 'ok', `✓ "${name}" created! Switching to dashboard...`);
    await loadCivList();
    await loadCiv(data.civ_id);
    await loadLeaderboard();
    setTimeout(() => { switchTab('dashboard'); msg.style.display = 'none'; }, 1800);
  } catch (err) {
    showMsg(msg, 'err', 'Error: ' + err.message);
  }
}

function showMsg(el, type, text) {
  el.className = `form-msg ${type}`;
  el.textContent = text;
  el.style.display = 'inline-block';
}
