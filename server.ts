import express from 'express';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  DEFAULT_SCORING_SETTINGS,
  ScoringSettings,
  PersonRecord,
  AssessmentInput,
} from './src/utils/scoring';
import {
  INITIAL_PERIODS,
  INITIAL_PERSONNEL,
  generateSeedAssessments,
  PeriodRecord,
} from './src/data/seedPersonnel';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'military_fitness.sqlite');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize SQLite Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    json_data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS periods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    beneficiary TEXT NOT NULL,
    unit_name TEXT NOT NULL,
    notes TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS personnel (
    id TEXT PRIMARY KEY,
    serial_num INTEGER NOT NULL,
    military_id TEXT NOT NULL,
    corps TEXT NOT NULL,
    rank TEXT NOT NULL,
    category TEXT NOT NULL,
    force_type TEXT NOT NULL,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    weight REAL,
    height REAL
  );

  CREATE TABLE IF NOT EXISTS assessments (
    period_id TEXT NOT NULL,
    person_id TEXT NOT NULL,
    stage_override INTEGER,
    pullups_count REAL NOT NULL DEFAULT 0,
    pushups_count REAL NOT NULL DEFAULT 0,
    situps_count REAL NOT NULL DEFAULT 0,
    run_count REAL NOT NULL DEFAULT 0,
    suburb_time_code INTEGER NOT NULL DEFAULT 0,
    suburb_min INTEGER,
    suburb_sec INTEGER,
    obstacle_min INTEGER,
    obstacle_sec INTEGER,
    march_hours INTEGER,
    march_min INTEGER,
    sprint_100m REAL,
    colleague_carry REAL,
    zigzag_run REAL,
    long_jump REAL,
    grenade_throw REAL,
    attendance_status TEXT NOT NULL DEFAULT 'not_tested',
    exercises_notes TEXT NOT NULL DEFAULT '',
    suburb_notes TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (period_id, person_id),
    FOREIGN KEY (period_id) REFERENCES periods(id) ON DELETE CASCADE,
    FOREIGN KEY (person_id) REFERENCES personnel(id) ON DELETE CASCADE
  );
`);

function seedDatabaseIfNeeded(forceReset = false) {
  const existingSettings = db
    .prepare('SELECT id FROM settings WHERE id = 1')
    .get() as { id: number } | undefined;

  if (existingSettings && !forceReset) {
    return;
  }

  const seedTx = db.transaction(() => {
    if (forceReset) {
      db.prepare('DELETE FROM assessments').run();
      db.prepare('DELETE FROM personnel').run();
      db.prepare('DELETE FROM periods').run();
      db.prepare('DELETE FROM settings').run();
    }

    db.prepare(
      'INSERT OR REPLACE INTO settings (id, json_data, updated_at) VALUES (1, ?, ?)'
    ).run(JSON.stringify(DEFAULT_SCORING_SETTINGS), new Date().toISOString());

    const insertPeriod = db.prepare(`
      INSERT INTO periods (id, name, date, beneficiary, unit_name, notes, sort_order)
      VALUES (@id, @name, @date, @beneficiary, @unitName, @notes, @sortOrder)
    `);
    INITIAL_PERIODS.forEach((p, idx) => {
      insertPeriod.run({ ...p, sortOrder: idx + 1 });
    });

    const insertPerson = db.prepare(`
      INSERT INTO personnel (id, serial_num, military_id, corps, rank, category, force_type, name, age, weight, height)
      VALUES (@id, @serialNum, @militaryId, @corps, @rank, @category, @forceType, @name, @age, @weight, @height)
    `);
    for (const person of INITIAL_PERSONNEL) {
      insertPerson.run(person);
    }

    const insertAssessment = db.prepare(`
      INSERT INTO assessments (
        period_id, person_id, stage_override,
        pullups_count, pushups_count, situps_count, run_count,
        suburb_time_code, suburb_min, suburb_sec,
        obstacle_min, obstacle_sec, march_hours, march_min,
        sprint_100m, colleague_carry, zigzag_run, long_jump, grenade_throw,
        attendance_status, exercises_notes, suburb_notes
      ) VALUES (
        @periodId, @personId, @stageOverride,
        @pullupsCount, @pushupsCount, @situpsCount, @runCount,
        @suburbTimeCode, @suburbMin, @suburbSec,
        @obstacleMin, @obstacleSec, @marchHours, @marchMin,
        @sprint100m, @colleagueCarry, @zigzagRun, @longJump, @grenadeThrow,
        @attendanceStatus, @exercisesNotes, @suburbNotes
      )
    `);

    const seedAssessments = generateSeedAssessments();
    for (const a of seedAssessments) {
      insertAssessment.run({
        ...a,
        stageOverride: a.stageOverride ?? null,
      });
    }
  });

  seedTx();
}

seedDatabaseIfNeeded(false);

function readFullDatabaseState() {
  const settingsRow = db
    .prepare('SELECT json_data, updated_at FROM settings WHERE id = 1')
    .get() as { json_data: string; updated_at: string } | undefined;

  const settings: ScoringSettings = settingsRow
    ? JSON.parse(settingsRow.json_data)
    : DEFAULT_SCORING_SETTINGS;

  const periodRows = db
    .prepare('SELECT * FROM periods ORDER BY date ASC, sort_order ASC')
    .all() as any[];

  const periods: PeriodRecord[] = periodRows.map((r) => ({
    id: r.id,
    name: r.name,
    date: r.date,
    beneficiary: r.beneficiary,
    unitName: r.unit_name,
    notes: r.notes,
  }));

  const personnelRows = db
    .prepare('SELECT * FROM personnel ORDER BY serial_num ASC')
    .all() as any[];

  const personnel: PersonRecord[] = personnelRows.map((r) => ({
    id: r.id,
    serialNum: r.serial_num,
    militaryId: r.military_id,
    corps: r.corps,
    rank: r.rank,
    category: r.category,
    forceType: r.force_type,
    name: r.name,
    age: r.age,
    weight: r.weight,
    height: r.height,
  }));

  const assessmentRows = db.prepare('SELECT * FROM assessments').all() as any[];
  const assessmentsByPeriod: Record<string, Record<string, AssessmentInput>> = {};
  for (const p of periods) {
    assessmentsByPeriod[p.id] = {};
  }

  for (const r of assessmentRows) {
    if (!assessmentsByPeriod[r.period_id]) {
      assessmentsByPeriod[r.period_id] = {};
    }
    assessmentsByPeriod[r.period_id][r.person_id] = {
      periodId: r.period_id,
      personId: r.person_id,
      stageOverride: r.stage_override,
      pullupsCount: r.pullups_count,
      pushupsCount: r.pushups_count,
      situpsCount: r.situps_count,
      runCount: r.run_count,
      suburbTimeCode: r.suburb_time_code,
      suburbMin: r.suburb_min,
      suburbSec: r.suburb_sec,
      obstacleMin: r.obstacle_min,
      obstacleSec: r.obstacle_sec,
      marchHours: r.march_hours,
      marchMin: r.march_min,
      sprint100m: r.sprint_100m,
      colleagueCarry: r.colleague_carry,
      zigzagRun: r.zigzag_run,
      longJump: r.long_jump,
      grenadeThrow: r.grenade_throw,
      attendanceStatus: r.attendance_status,
      exercisesNotes: r.exercises_notes,
      suburbNotes: r.suburb_notes,
    };
  }

  let dbSizeBytes = 0;
  try {
    dbSizeBytes = fs.statSync(DB_PATH).size;
  } catch {
    dbSizeBytes = 0;
  }

  return {
    settings,
    periods,
    personnel,
    assessmentsByPeriod,
    dbInfo: {
      engine: 'SQLite 3 (better-sqlite3 WAL)',
      filePath: 'data/military_fitness.sqlite',
      sizeBytes: dbSizeBytes,
      totalPersonnel: personnel.length,
      totalPeriods: periods.length,
      totalAssessments: assessmentRows.length,
      lastUpdated: settingsRow?.updated_at || new Date().toISOString(),
    },
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // 1. Get complete state from SQLite
  app.get('/api/state', (_req, res) => {
    try {
      res.json(readFullDatabaseState());
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to read SQLite state' });
    }
  });

  // 2. Update unit & scoring settings
  app.put('/api/settings', (req, res) => {
    try {
      const settings: ScoringSettings = req.body;
      db.prepare(
        'INSERT OR REPLACE INTO settings (id, json_data, updated_at) VALUES (1, ?, ?)'
      ).run(JSON.stringify(settings), new Date().toISOString());
      res.json(readFullDatabaseState());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Create or update period
  app.post('/api/periods', (req, res) => {
    try {
      const { name, date, beneficiary, unitName, notes, copyFromPeriodId } = req.body;
      const id = `period-${Date.now()}`;
      const countRow = db
        .prepare('SELECT COUNT(*) as cnt FROM periods')
        .get() as { cnt: number };

      const tx = db.transaction(() => {
        db.prepare(`
          INSERT INTO periods (id, name, date, beneficiary, unit_name, notes, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          name || 'فترة اختبار جديدة',
          date || new Date().toISOString().slice(0, 10),
          beneficiary || 'هيئة تدريب القوات المسلحة',
          unitName || 'اللواء الأول المشاة الميكانيكي',
          notes || '',
          countRow.cnt + 1
        );

        if (copyFromPeriodId) {
          const prevRows = db
            .prepare('SELECT * FROM assessments WHERE period_id = ?')
            .all(copyFromPeriodId) as any[];
          const insertStmt = db.prepare(`
            INSERT INTO assessments (
              period_id, person_id, stage_override,
              pullups_count, pushups_count, situps_count, run_count,
              suburb_time_code, suburb_min, suburb_sec,
              obstacle_min, obstacle_sec, march_hours, march_min,
              sprint_100m, colleague_carry, zigzag_run, long_jump, grenade_throw,
              attendance_status, exercises_notes, suburb_notes
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
          `);
          for (const r of prevRows) {
            insertStmt.run(
              id,
              r.person_id,
              r.stage_override,
              r.pullups_count,
              r.pushups_count,
              r.situps_count,
              r.run_count,
              r.suburb_time_code,
              r.suburb_min,
              r.suburb_sec,
              r.obstacle_min,
              r.obstacle_sec,
              r.march_hours,
              r.march_min,
              r.sprint_100m,
              r.colleague_carry,
              r.zigzag_run,
              r.long_jump,
              r.grenade_throw,
              r.attendance_status,
              r.exercises_notes,
              r.suburb_notes
            );
          }
        }
      });

      tx();
      res.json({ newPeriodId: id, state: readFullDatabaseState() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/periods/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { name, date, beneficiary, unitName, notes } = req.body;
      db.prepare(`
        UPDATE periods
        SET name = ?, date = ?, beneficiary = ?, unit_name = ?, notes = ?
        WHERE id = ?
      `).run(name, date, beneficiary, unitName, notes, id);
      res.json(readFullDatabaseState());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/periods/:id', (req, res) => {
    try {
      const { id } = req.params;
      const countRow = db
        .prepare('SELECT COUNT(*) as cnt FROM periods')
        .get() as { cnt: number };
      if (countRow.cnt <= 1) {
        return res.status(400).json({ error: 'لا يمكن حذف الفترة الوحيدة المتبقية' });
      }
      db.prepare('DELETE FROM periods WHERE id = ?').run(id);
      res.json(readFullDatabaseState());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 4. Clear/Zero out a period's assessments (matching the blank template Option)
  app.post('/api/periods/:id/clear-scores', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare(`
        UPDATE assessments
        SET pullups_count = 0,
            pushups_count = 0,
            situps_count = 0,
            run_count = 0,
            suburb_time_code = 0,
            suburb_min = NULL,
            suburb_sec = NULL,
            attendance_status = 'not_tested',
            exercises_notes = '',
            suburb_notes = ''
        WHERE period_id = ?
      `).run(id);
      res.json(readFullDatabaseState());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 5. Personnel CRUD
  app.post('/api/personnel', (req, res) => {
    try {
      const p: Partial<PersonRecord> = req.body;
      const maxSerial = db
        .prepare('SELECT COALESCE(MAX(serial_num), 0) as maxS FROM personnel')
        .get() as { maxS: number };
      const id = p.id || `p-${Date.now()}`;
      const serialNum = p.serialNum || maxSerial.maxS + 1;

      db.prepare(`
        INSERT INTO personnel (id, serial_num, military_id, corps, rank, category, force_type, name, age, weight, height)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        serialNum,
        p.militaryId || `${41000 + serialNum}`,
        p.corps || 'مشاة',
        p.rank || 'نقيب',
        p.category || 'officers',
        p.forceType || 'combat',
        p.name || 'فرد جديد',
        Number(p.age) || 30,
        p.weight !== undefined && p.weight !== null ? Number(p.weight) : null,
        p.height !== undefined && p.height !== null ? Number(p.height) : null
      );

      res.json({ newPersonId: id, state: readFullDatabaseState() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/personnel/:id', (req, res) => {
    try {
      const { id } = req.params;
      const p: PersonRecord = req.body;
      db.prepare(`
        UPDATE personnel
        SET serial_num = ?, military_id = ?, corps = ?, rank = ?, category = ?,
            force_type = ?, name = ?, age = ?, weight = ?, height = ?
        WHERE id = ?
      `).run(
        Number(p.serialNum) || 1,
        p.militaryId || '',
        p.corps || '',
        p.rank || '',
        p.category || 'officers',
        p.forceType || 'combat',
        p.name || '',
        Number(p.age) || 30,
        p.weight !== null && p.weight !== undefined ? Number(p.weight) : null,
        p.height !== null && p.height !== undefined ? Number(p.height) : null,
        id
      );
      res.json(readFullDatabaseState());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/personnel/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM personnel WHERE id = ?').run(id);
      res.json(readFullDatabaseState());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 6. Upsert single assessment
  app.put('/api/assessments/:periodId/:personId', (req, res) => {
    try {
      const { periodId, personId } = req.params;
      const a: AssessmentInput = req.body;
      db.prepare(`
        INSERT OR REPLACE INTO assessments (
          period_id, person_id, stage_override,
          pullups_count, pushups_count, situps_count, run_count,
          suburb_time_code, suburb_min, suburb_sec,
          obstacle_min, obstacle_sec, march_hours, march_min,
          sprint_100m, colleague_carry, zigzag_run, long_jump, grenade_throw,
          attendance_status, exercises_notes, suburb_notes
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `).run(
        periodId,
        personId,
        a.stageOverride ?? null,
        Number(a.pullupsCount) || 0,
        Number(a.pushupsCount) || 0,
        Number(a.situpsCount) || 0,
        Number(a.runCount) || 0,
        Number(a.suburbTimeCode) || 0,
        a.suburbMin ?? null,
        a.suburbSec ?? null,
        a.obstacleMin ?? null,
        a.obstacleSec ?? null,
        a.marchHours ?? null,
        a.marchMin ?? null,
        a.sprint100m ?? null,
        a.colleagueCarry ?? null,
        a.zigzagRun ?? null,
        a.longJump ?? null,
        a.grenadeThrow ?? null,
        a.attendanceStatus || 'tested',
        a.exercisesNotes || '',
        a.suburbNotes || ''
      );
      res.json(readFullDatabaseState());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 7. Download raw SQLite file
  app.get('/api/database/download-sqlite', (_req, res) => {
    try {
      db.pragma('wal_checkpoint(FULL)');
      res.download(DB_PATH, 'military_fitness_database.sqlite');
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 8. Reset or Restore Database
  app.post('/api/database/reset', (_req, res) => {
    try {
      seedDatabaseIfNeeded(true);
      res.json(readFullDatabaseState());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/database/import-json', (req, res) => {
    try {
      const { settings, periods, personnel, assessmentsByPeriod } = req.body;
      if (!Array.isArray(periods) || !Array.isArray(personnel)) {
        return res.status(400).json({ error: 'ملف النسخة الاحتياطية غير صالح' });
      }

      const restoreTx = db.transaction(() => {
        db.prepare('DELETE FROM assessments').run();
        db.prepare('DELETE FROM personnel').run();
        db.prepare('DELETE FROM periods').run();

        if (settings) {
          db.prepare(
            'INSERT OR REPLACE INTO settings (id, json_data, updated_at) VALUES (1, ?, ?)'
          ).run(JSON.stringify(settings), new Date().toISOString());
        }

        const insertPeriod = db.prepare(`
          INSERT INTO periods (id, name, date, beneficiary, unit_name, notes, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        periods.forEach((p: PeriodRecord, idx: number) => {
          insertPeriod.run(
            p.id,
            p.name,
            p.date,
            p.beneficiary || '',
            p.unitName || '',
            p.notes || '',
            idx + 1
          );
        });

        const insertPerson = db.prepare(`
          INSERT INTO personnel (id, serial_num, military_id, corps, rank, category, force_type, name, age, weight, height)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const p of personnel) {
          insertPerson.run(
            p.id,
            p.serialNum,
            p.militaryId || '',
            p.corps || '',
            p.rank || '',
            p.category || 'officers',
            p.forceType || 'combat',
            p.name,
            p.age || 30,
            p.weight ?? null,
            p.height ?? null
          );
        }

        if (assessmentsByPeriod) {
          const insertAss = db.prepare(`
            INSERT INTO assessments (
              period_id, person_id, stage_override,
              pullups_count, pushups_count, situps_count, run_count,
              suburb_time_code, suburb_min, suburb_sec,
              obstacle_min, obstacle_sec, march_hours, march_min,
              sprint_100m, colleague_carry, zigzag_run, long_jump, grenade_throw,
              attendance_status, exercises_notes, suburb_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const [periodId, personMap] of Object.entries(assessmentsByPeriod)) {
            for (const [personId, a] of Object.entries(
              personMap as Record<string, AssessmentInput>
            )) {
              insertAss.run(
                periodId,
                personId,
                a.stageOverride ?? null,
                a.pullupsCount || 0,
                a.pushupsCount || 0,
                a.situpsCount || 0,
                a.runCount || 0,
                a.suburbTimeCode || 0,
                a.suburbMin ?? null,
                a.suburbSec ?? null,
                a.obstacleMin ?? null,
                a.obstacleSec ?? null,
                a.marchHours ?? null,
                a.marchMin ?? null,
                a.sprint100m ?? null,
                a.colleagueCarry ?? null,
                a.zigzagRun ?? null,
                a.longJump ?? null,
                a.grenadeThrow ?? null,
                a.attendanceStatus || 'not_tested',
                a.exercisesNotes || '',
                a.suburbNotes || ''
              );
            }
          }
        }
      });

      restoreTx();
      res.json(readFullDatabaseState());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
