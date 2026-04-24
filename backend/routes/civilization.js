const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// ── GET /api/civilizations ────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM civilizations ORDER BY civ_id');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch civilizations' });
  }
});

// ── GET /api/civilizations/leaderboard ───────────────────────
router.get('/leaderboard', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.civ_id, c.name, c.case_type, c.region, c.start_year, c.end_year,
             MAX(s.population_m)  AS peak_pop,
             MAX(s.tech_level)    AS peak_tech,
             MAX(s.stability_idx) AS peak_stability,
             MIN(s.resource_pct)  AS min_resource,
             COUNT(DISTINCT s.snapshot_id) AS snapshot_count
      FROM civilizations c
      JOIN civ_snapshots s ON c.civ_id = s.civ_id
      GROUP BY c.civ_id, c.name, c.case_type, c.region, c.start_year, c.end_year
      ORDER BY peak_pop DESC
    `);
    const ranked = rows.map(r => ({
      ...r,
      lifespan_years: (r.end_year - r.start_year),
      legacy_score: Math.round(
        (parseFloat(r.peak_pop) * 2) +
        (parseFloat(r.peak_tech) * 5) +
        (parseFloat(r.peak_stability) * 0.5) +
        (Math.max(0, (r.end_year - r.start_year) / 100))
      )
    })).sort((a, b) => b.legacy_score - a.legacy_score);
    res.json(ranked);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// ── GET /api/civilizations/compare/stats ─────────────────────
router.get('/compare/stats', async (req, res) => {
  try {
    const ids = (req.query.ids || '1,2').split(',').map(Number);
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT c.civ_id, c.name, c.case_type,
              MAX(s.population_m)  AS peak_pop,
              MAX(s.tech_level)    AS peak_tech,
              MIN(s.resource_pct)  AS min_resource,
              MIN(s.stability_idx) AS min_stability,
              AVG(s.energy_index)  AS avg_energy
       FROM civilizations c
       JOIN civ_snapshots s ON c.civ_id = s.civ_id
       WHERE c.civ_id IN (${placeholders})
       GROUP BY c.civ_id, c.name, c.case_type
       ORDER BY c.civ_id`,
      ids
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compare' });
  }
});

// ── GET /api/civilizations/:id ────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM civilizations WHERE civ_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch civilization' });
  }
});

// ── GET /api/civilizations/:id/snapshots ─────────────────────
router.get('/:id/snapshots', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM civ_snapshots WHERE civ_id = ? ORDER BY year_numeric',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch snapshots' });
  }
});

// ── GET /api/civilizations/:id/events ────────────────────────
router.get('/:id/events', async (req, res) => {
  try {
    const { type } = req.query;
    let query  = 'SELECT * FROM civ_events WHERE civ_id = ?';
    const params = [req.params.id];
    if (type) { query += ' AND event_type = ?'; params.push(type); }
    query += ' ORDER BY year_numeric';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// ── GET /api/civilizations/:id/radar ─────────────────────────
router.get('/:id/radar', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM civ_snapshots WHERE civ_id = ? ORDER BY year_numeric',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'No snapshots' });

    const peakPop    = Math.max(...rows.map(r => parseFloat(r.population_m)));
    const peakTech   = Math.max(...rows.map(r => parseFloat(r.tech_level)));
    const peakEnergy = Math.max(...rows.map(r => parseFloat(r.energy_index)));
    const peakRes    = Math.max(...rows.map(r => parseFloat(r.resource_pct)));
    const peakStab   = Math.max(...rows.map(r => parseFloat(r.stability_idx)));

    const [[{ inno }]] = await pool.query(
      "SELECT COUNT(*) AS inno FROM civ_events WHERE civ_id = ? AND event_type = 'innovation'",
      [req.params.id]
    );

    res.json({
      labels: ['Population', 'Technology', 'Energy', 'Resources', 'Stability', 'Innovation'],
      values: [
        Math.round(Math.min(100, (peakPop / 20) * 100)),
        Math.round((peakTech / 10) * 100),
        Math.round(Math.min(100, (peakEnergy / 15) * 100)),
        Math.round(Math.min(100, peakRes)),
        Math.round(Math.min(100, peakStab)),
        Math.min(100, parseInt(inno) * 12),
      ]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute radar data' });
  }
});

// ── GET /api/civilizations/:id/decline-rate ──────────────────
router.get('/:id/decline-rate', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM civ_snapshots WHERE civ_id = ? ORDER BY year_numeric',
      [req.params.id]
    );
    if (rows.length < 2) return res.json({ rates: [] });

    const rates = [];
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      const curr = rows[i];
      const yearDelta = curr.year_numeric - prev.year_numeric;
      if (yearDelta === 0) continue;
      rates.push({
        from_year:      prev.year_label,
        to_year:        curr.year_label,
        stability_rate: parseFloat(((parseFloat(curr.stability_idx) - parseFloat(prev.stability_idx)) / yearDelta).toFixed(3)),
        resource_rate:  parseFloat(((parseFloat(curr.resource_pct)  - parseFloat(prev.resource_pct))  / yearDelta).toFixed(3)),
        pop_rate:       parseFloat(((parseFloat(curr.population_m)  - parseFloat(prev.population_m))  / yearDelta).toFixed(3)),
      });
    }
    res.json({ rates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute decline rates' });
  }
});

// ── GET /api/civilizations/:id/analysis ──────────────────────
router.get('/:id/analysis', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM civ_snapshots WHERE civ_id = ? ORDER BY year_numeric',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'No snapshots found' });

    const first = rows[0];
    const last  = rows[rows.length - 1];

    const resourceDrop  = (parseFloat(first.resource_pct)  - parseFloat(last.resource_pct))  / Math.max(1, parseFloat(first.resource_pct));
    const stabilityDrop = (parseFloat(first.stability_idx) - parseFloat(last.stability_idx)) / Math.max(1, parseFloat(first.stability_idx));
    const collapsePct   = Math.max(0, Math.min(100, Math.round((resourceDrop * 0.5 + stabilityDrop * 0.5) * 100)));

    const peakPop  = Math.max(...rows.map(r => parseFloat(r.population_m)));
    const peakTech = Math.max(...rows.map(r => parseFloat(r.tech_level)));
    const resPct   = parseFloat(last.resource_pct);

    const resourcePressure =
      resPct < 10 ? 'critical' :
      resPct < 30 ? 'high'     :
      resPct < 60 ? 'medium'   : 'low';

    const [[{ inno }]] = await pool.query(
      "SELECT COUNT(*) AS inno FROM civ_events WHERE civ_id = ? AND event_type = 'innovation'", [req.params.id]
    );
    const [[{ conf }]] = await pool.query(
      "SELECT COUNT(*) AS conf FROM civ_events WHERE civ_id = ? AND event_type = 'conflict'", [req.params.id]
    );
    const [[{ totalEvents }]] = await pool.query(
      "SELECT COUNT(*) AS totalEvents FROM civ_events WHERE civ_id = ?", [req.params.id]
    );

    const resilienceScore = Math.max(0, Math.min(100,
      50 + (parseInt(inno) * 8) - (parseInt(conf) * 5) - (collapsePct * 0.3)
    ));

    const [civRow] = await pool.query('SELECT * FROM civilizations WHERE civ_id = ?', [req.params.id]);
    const lifespan = civRow.length > 0 ? (civRow[0].end_year - civRow[0].start_year) : 0;
    const longevityTier =
      lifespan > 1000 ? 'Millennial'  :
      lifespan > 500  ? 'Enduring'    :
      lifespan > 200  ? 'Substantial' :
      lifespan > 50   ? 'Fleeting'    : 'Ephemeral';

    res.json({
      civ_id:             parseInt(req.params.id),
      collapse_prob:      collapsePct,
      stability_index:    parseFloat(last.stability_idx).toFixed(1),
      peak_population_m:  peakPop,
      peak_tech_level:    peakTech,
      growth_phase_now:   last.growth_phase,
      resource_pressure:  resourcePressure,
      innovation_bursts:  parseInt(inno),
      conflict_events:    parseInt(conf),
      total_events:       parseInt(totalEvents),
      total_snapshots:    rows.length,
      span_years:         last.year_numeric - first.year_numeric,
      resilience_score:   Math.round(resilienceScore),
      longevity_tier:     longevityTier,
      lifespan_years:     lifespan,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute analysis' });
  }
});

// ── GET /api/civilizations/:id/narrative ─────────────────────
router.get('/:id/narrative', async (req, res) => {
  try {
    const [civRows] = await pool.query('SELECT * FROM civilizations WHERE civ_id = ?', [req.params.id]);
    if (civRows.length === 0) return res.status(404).json({ error: 'Not found' });
    const civ = civRows[0];

    const [snapshots] = await pool.query(
      'SELECT * FROM civ_snapshots WHERE civ_id = ? ORDER BY year_numeric', [req.params.id]
    );
    const [events] = await pool.query(
      'SELECT * FROM civ_events WHERE civ_id = ? ORDER BY year_numeric', [req.params.id]
    );

    const snapshotSummary = snapshots.map(s =>
      `${s.year_label}: Pop=${s.population_m}M, Tech=${s.tech_level}, Stability=${s.stability_idx}, Resources=${s.resource_pct}%, Phase=${s.growth_phase}`
    ).join('\n');

    const eventSummary = events.map(e =>
      `${e.year_label}: [${e.event_type}] ${e.event_name} (impact: ${e.impact_score})`
    ).join('\n');

    const startLabel = civ.start_year < 0 ? `${Math.abs(civ.start_year)} BCE` : `${civ.start_year} CE`;
    const prompt = `You are a historian narrating the story of the ${civ.name} (${startLabel} to ${civ.end_year} CE, ${civ.region}).

Time-series data:
${snapshotSummary}

Key events:
${eventSummary}

Write a dramatic, insightful 3-paragraph historical narrative (150-200 words total) in the style of an ancient chronicle. Use vivid, evocative language. End with a one-sentence epitaph in italics. Be concise but powerful.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      console.error('Claude API error:', await response.text());
      return res.status(500).json({ error: 'AI narrative generation failed', narrative: null });
    }

    const data = await response.json();
    const narrative = data.content?.[0]?.text || 'Narrative unavailable.';
    res.json({ narrative, civ_name: civ.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate narrative' });
  }
});

// ── POST /api/civilizations ───────────────────────────────────
router.post('/', async (req, res) => {
  const { name, start_year, end_year, region, case_type, snapshots, events } = req.body;
  if (!name || !region || !case_type || !snapshots || snapshots.length === 0) {
    return res.status(400).json({ error: 'name, region, case_type, and at least one snapshot are required.' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [civResult] = await conn.query(
      'INSERT INTO civilizations (name, start_year, end_year, region, case_type) VALUES (?, ?, ?, ?, ?)',
      [name, start_year || null, end_year || null, region, case_type]
    );
    const civId = civResult.insertId;
    for (const snap of snapshots) {
      await conn.query(
        `INSERT INTO civ_snapshots (civ_id, year_label, year_numeric, population_m, tech_level, energy_index, resource_pct, stability_idx, growth_phase)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [civId, snap.year_label, snap.year_numeric, snap.population_m, snap.tech_level,
         snap.energy_index, snap.resource_pct, snap.stability_idx, snap.growth_phase]
      );
    }
    if (events && events.length > 0) {
      for (const ev of events) {
        await conn.query(
          `INSERT INTO civ_events (civ_id, year_label, year_numeric, event_name, event_type, impact_score)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [civId, ev.year_label, ev.year_numeric, ev.event_name, ev.event_type, ev.impact_score || 0]
        );
      }
    }
    await conn.commit();
    res.status(201).json({ civ_id: civId, message: 'Civilization created successfully.' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to create civilization.' });
  } finally {
    conn.release();
  }
});

// ── DELETE /api/civilizations/:id ────────────────────────────
router.delete('/:id', async (req, res) => {
  const civId = parseInt(req.params.id);
  if (civId <= 2) {
    return res.status(403).json({ error: 'Cannot delete the built-in civilizations.' });
  }
  try {
    await pool.query('DELETE FROM civilizations WHERE civ_id = ?', [civId]);
    res.json({ message: 'Civilization deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete civilization.' });
  }
});

module.exports = router;
