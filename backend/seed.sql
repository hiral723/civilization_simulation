CREATE DATABASE IF NOT EXISTS civilization_db;
USE civilization_db;

DROP TABLE IF EXISTS civ_analysis;
DROP TABLE IF EXISTS civ_events;
DROP TABLE IF EXISTS civ_snapshots;
DROP TABLE IF EXISTS civilizations;

CREATE TABLE civilizations (
  civ_id     INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  start_year INT,
  end_year   INT,
  region     VARCHAR(100),
  case_type  ENUM('pass','fail')
);

CREATE TABLE civ_snapshots (
  snapshot_id   INT AUTO_INCREMENT PRIMARY KEY,
  civ_id        INT NOT NULL,
  year_label    VARCHAR(20),
  year_numeric  INT,
  population_m  DECIMAL(6,2),
  tech_level    DECIMAL(4,1),
  energy_index  DECIMAL(4,1),
  resource_pct  DECIMAL(5,2),
  stability_idx DECIMAL(5,2),
  growth_phase  VARCHAR(30),
  FOREIGN KEY (civ_id) REFERENCES civilizations(civ_id) ON DELETE CASCADE
);

CREATE TABLE civ_events (
  event_id     INT AUTO_INCREMENT PRIMARY KEY,
  civ_id       INT NOT NULL,
  year_label   VARCHAR(20),
  year_numeric INT,
  event_name   VARCHAR(200),
  event_type   ENUM('innovation','conflict','resource','collapse'),
  impact_score DECIMAL(4,2),
  FOREIGN KEY (civ_id) REFERENCES civilizations(civ_id) ON DELETE CASCADE
);

CREATE TABLE civ_analysis (
  analysis_id       INT AUTO_INCREMENT PRIMARY KEY,
  civ_id            INT NOT NULL,
  collapse_prob     DECIMAL(5,2),
  stability_index   DECIMAL(5,2),
  peak_population   DECIMAL(6,2),
  peak_tech         DECIMAL(4,1),
  resource_pressure VARCHAR(20),
  growth_phase_now  VARCHAR(30),
  computed_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (civ_id) REFERENCES civilizations(civ_id) ON DELETE CASCADE
);

INSERT INTO civilizations (name, start_year, end_year, region, case_type)
VALUES ('Roman Empire', -509, 476, 'Mediterranean', 'pass');

INSERT INTO civ_snapshots
  (civ_id, year_label, year_numeric, population_m, tech_level, energy_index, resource_pct, stability_idx, growth_phase)
VALUES
  (1, '100 BCE', -100, 5.0,  3.0, 2.0, 90.0, 82.0, 'rise'),
  (1, '0 CE',       0, 8.0,  5.0, 4.0, 80.0, 85.0, 'peak'),
  (1, '100 CE',   100, 12.0, 7.0, 7.0, 70.0, 88.0, 'peak'),
  (1, '200 CE',   200, 15.0, 8.0, 9.0, 55.0, 78.0, 'peak'),
  (1, '300 CE',   300, 14.0, 7.0, 8.0, 40.0, 60.0, 'decline'),
  (1, '400 CE',   400, 10.0, 5.0, 5.0, 25.0, 38.0, 'decline'),
  (1, '476 CE',   476,  4.0, 3.0, 2.0, 10.0, 12.0, 'collapse');

INSERT INTO civ_events
  (civ_id, year_label, year_numeric, event_name, event_type, impact_score)
VALUES
  (1, '264 BCE', -264, 'Punic Wars begin — naval expansion',          'conflict',    -0.3),
  (1, '80 BCE',   -80, 'Aqueduct and road engineering peak',          'innovation',   0.8),
  (1, '46 BCE',   -46, 'Julian calendar reform adopted',              'innovation',   0.5),
  (1, '0 CE',       0, 'Grain supply routes across empire expand',    'resource',     0.6),
  (1, '117 CE',   117, 'Empire reaches maximum territorial extent',   'innovation',   0.7),
  (1, '165 CE',   165, 'Antonine Plague — 5M deaths estimated',       'collapse',    -0.8),
  (1, '212 CE',   212, 'Edict of Caracalla expands citizenship',      'innovation',   0.3),
  (1, '284 CE',   284, 'Military civil wars destabilise succession',  'conflict',    -0.6),
  (1, '376 CE',   376, 'Visigoths cross Danube — barbarian pressure', 'conflict',    -0.7),
  (1, '410 CE',   410, 'Sack of Rome by Visigoths',                  'collapse',    -0.9),
  (1, '455 CE',   455, 'Vandals sack Rome — second major sack',      'collapse',    -0.9),
  (1, '476 CE',   476, 'Fall of Western Roman Empire',               'collapse',    -1.0);

INSERT INTO civilizations (name, start_year, end_year, region, case_type)
VALUES ('Classic Maya', 600, 900, 'Mesoamerica', 'fail');

INSERT INTO civ_snapshots
  (civ_id, year_label, year_numeric, population_m, tech_level, energy_index, resource_pct, stability_idx, growth_phase)
VALUES
  (2, '600 CE', 600,  8.0, 6.0, 5.0, 75.0, 60.0, 'peak'),
  (2, '650 CE', 650, 10.0, 7.0, 7.0, 60.0, 55.0, 'peak'),
  (2, '700 CE', 700, 11.0, 7.0, 6.0, 45.0, 45.0, 'decline'),
  (2, '750 CE', 750,  9.0, 6.0, 4.0, 25.0, 28.0, 'decline'),
  (2, '800 CE', 800,  6.0, 4.0, 2.0, 12.0, 14.0, 'collapse'),
  (2, '850 CE', 850,  3.0, 2.0, 1.0,  5.0,  6.0, 'collapse'),
  (2, '900 CE', 900,  1.0, 1.0, 0.5,  2.0,  2.0, 'collapse');

INSERT INTO civ_events
  (civ_id, year_label, year_numeric, event_name, event_type, impact_score)
VALUES
  (2, '600 CE', 600, 'Classic period peak — monumental architecture',    'innovation',  0.7),
  (2, '628 CE', 628, 'Pakal the Great begins Palenque golden age',       'innovation',  0.8),
  (2, '650 CE', 650, 'Intensive deforestation for agriculture begins',   'resource',   -0.5),
  (2, '695 CE', 695, 'Calakmul defeats Tikal — prolonged warfare era',   'conflict',   -0.6),
  (2, '720 CE', 720, 'Soil erosion accelerates across lowlands',         'resource',   -0.7),
  (2, '750 CE', 750, 'First prolonged drought cycle recorded',           'collapse',   -0.8),
  (2, '790 CE', 790, 'Agricultural output collapses in southern cities', 'resource',   -0.9),
  (2, '810 CE', 810, 'Copan abandonment — first major city deserted',    'collapse',   -0.9),
  (2, '820 CE', 820, 'Widespread city abandonment accelerates',          'collapse',   -0.95),
  (2, '860 CE', 860, 'Terminal Classic inter-city warfare peaks',        'conflict',   -0.8),
  (2, '900 CE', 900, 'Southern lowlands fully abandoned',                'collapse',   -1.0);

INSERT INTO civ_analysis
  (civ_id, collapse_prob, stability_index, peak_population, peak_tech, resource_pressure, growth_phase_now)
VALUES
  (1, 18.0, 12.0, 15.0, 8.0, 'high',     'collapse'),
  (2, 87.0,  2.0, 11.0, 7.0, 'critical', 'collapse');

CREATE INDEX idx_snap_civ  ON civ_snapshots(civ_id);
CREATE INDEX idx_event_civ ON civ_events(civ_id);
CREATE INDEX idx_event_type ON civ_events(event_type);
