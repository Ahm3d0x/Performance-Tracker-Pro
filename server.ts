import express from 'express';
import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DEFAULT_SCORING_SETTINGS,
  type ScoringSettings,
  type PersonRecord,
  type AssessmentInput,
} from './src/utils/scoring.ts';
import {
  INITIAL_PERIODS,
  INITIAL_PERSONNEL,
  generateSeedAssessments,
  type PeriodRecord,
} from './src/data/seedPersonnel.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveWritableDataDir(): string {
  const localDir = path.join(__dirname, 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    fs.accessSync(localDir, fs.constants.W_OK);
    return localDir;
  } catch {
    const tmpDir = path.join(os.tmpdir(), 'military_fitness_data');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }
}

const DATA_DIR = resolveWritableDataDir();
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

function wipeDatabaseToCleanState() {
  const wipeTx = db.transaction(() => {
    db.prepare('DELETE FROM assessments').run();
    db.prepare('DELETE FROM personnel').run();
    db.prepare('DELETE FROM periods').run();
    db.prepare('DELETE FROM settings').run();

    db.prepare(
      'INSERT OR REPLACE INTO settings (id, json_data, updated_at) VALUES (1, ?, ?)'
    ).run(JSON.stringify(DEFAULT_SCORING_SETTINGS), new Date().toISOString());

    const initialPeriod = {
      id: 'period-clean-2026',
      name: 'الفترة التدريبية الأولى',
      date: new Date().toISOString().split('T')[0],
      beneficiary: 'فرع التربية الرياضية - هيئة تدريب القوات المسلحة',
      unitName: 'اللواء الأول المشاة الميكانيكي',
      notes: 'فترة تدريبية جديدة فارغة جاهزة لإدخال البيانات واستيراد كشوف الإكسل',
      sortOrder: 1,
    };

    db.prepare(`
      INSERT INTO periods (id, name, date, beneficiary, unit_name, notes, sort_order)
      VALUES (@id, @name, @date, @beneficiary, @unitName, @notes, @sortOrder)
    `).run(initialPeriod);
  });

  wipeTx();
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

  // Health check endpoint for desktop launcher and diagnostics
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      engine: 'SQLite 3 (better-sqlite3 WAL)',
      timestamp: new Date().toISOString()
    });
  });

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

        // When adding a new period, its data is completely blank (all scores 0, not_tested)
        const allPersonnel = db.prepare('SELECT id FROM personnel').all() as { id: string }[];
        const insertBlankAss = db.prepare(`
          INSERT INTO assessments (
            period_id, person_id, stage_override,
            pullups_count, pushups_count, situps_count, run_count,
            suburb_time_code, suburb_min, suburb_sec,
            obstacle_min, obstacle_sec, march_hours, march_min,
            sprint_100m, colleague_carry, zigzag_run, long_jump, grenade_throw,
            attendance_status, exercises_notes, suburb_notes
          ) VALUES (
            ?, ?, NULL,
            0, 0, 0, 0,
            0, NULL, NULL,
            NULL, NULL, NULL, NULL,
            NULL, NULL, NULL, NULL, NULL,
            'not_tested', '', ''
          )
        `);

        for (const p of allPersonnel) {
          insertBlankAss.run(id, p.id);
        }
      });

      tx();
      res.json({ newPeriodId: id, state: readFullDatabaseState() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 3.5 Import from Excel (Monzoma or Dibaja)
  app.post('/api/periods/import-excel', (req, res) => {
    try {
      const {
        periodName,
        periodDate,
        beneficiary,
        unitName,
        notes,
        personnel,
        assessments,
        isNewPeriod,
        targetPeriodId,
      } = req.body;

      if (!Array.isArray(personnel) || personnel.length === 0) {
        return res.status(400).json({ error: 'لم يتم العثور على أفراد صالحين للاستيراد' });
      }

      let activePeriodId = targetPeriodId;

      const importTx = db.transaction(() => {
        if (isNewPeriod || !activePeriodId) {
          activePeriodId = `period-${Date.now()}`;
          const countRow = db
            .prepare('SELECT COUNT(*) as cnt FROM periods')
            .get() as { cnt: number };

          db.prepare(`
            INSERT INTO periods (id, name, date, beneficiary, unit_name, notes, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            activePeriodId,
            periodName || `فترة اختبار - ${periodDate || new Date().toISOString().slice(0, 10)}`,
            periodDate || new Date().toISOString().slice(0, 10),
            beneficiary || 'فرع التربية الرياضية - هيئة التدريب',
            unitName || 'اللواء الأول المشاة الميكانيكي',
            notes || 'مستوردة من كشف إكسل',
            countRow.cnt + 1
          );
        } else {
          if (unitName || periodName || periodDate) {
            db.prepare(`
              UPDATE periods
              SET name = COALESCE(?, name),
                  date = COALESCE(?, date),
                  beneficiary = COALESCE(?, beneficiary),
                  unit_name = COALESCE(?, unit_name)
              WHERE id = ?
            `).run(periodName || null, periodDate || null, beneficiary || null, unitName || null, activePeriodId);
          }
        }

        const insertPerson = db.prepare(`
          INSERT INTO personnel (id, serial_num, military_id, corps, rank, category, force_type, name, age, weight, height)
          VALUES (@id, @serialNum, @militaryId, @corps, @rank, @category, @forceType, @name, @age, @weight, @height)
          ON CONFLICT(id) DO UPDATE SET
            serial_num = excluded.serial_num,
            military_id = excluded.military_id,
            corps = excluded.corps,
            rank = excluded.rank,
            category = excluded.category,
            force_type = excluded.force_type,
            name = excluded.name,
            age = excluded.age,
            weight = COALESCE(excluded.weight, personnel.weight),
            height = COALESCE(excluded.height, personnel.height)
        `);

        for (const p of personnel) {
          insertPerson.run({
            id: p.id,
            serialNum: Number(p.serialNum) || 1,
            militaryId: p.militaryId || '',
            corps: p.corps || 'مشاة',
            rank: p.rank || 'نقيب',
            category: p.category || 'officers',
            forceType: p.forceType || 'combat',
            name: p.name || 'فرد',
            age: Number(p.age) || 30,
            weight: p.weight !== null && p.weight !== undefined ? Number(p.weight) : null,
            height: p.height !== null && p.height !== undefined ? Number(p.height) : null,
          });
        }

        const insertAss = db.prepare(`
          INSERT OR REPLACE INTO assessments (
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

        if (Array.isArray(assessments)) {
          for (const a of assessments) {
            insertAss.run({
              periodId: activePeriodId,
              personId: a.personId,
              stageOverride: a.stageOverride ?? null,
              pullupsCount: Number(a.pullupsCount) || 0,
              pushupsCount: Number(a.pushupsCount) || 0,
              situpsCount: Number(a.situpsCount) || 0,
              runCount: Number(a.runCount) || 0,
              suburbTimeCode: Number(a.suburbTimeCode) || 0,
              suburbMin: a.suburbMin !== null && a.suburbMin !== undefined ? Number(a.suburbMin) : null,
              suburbSec: a.suburbSec !== null && a.suburbSec !== undefined ? Number(a.suburbSec) : null,
              obstacleMin: a.obstacleMin !== null && a.obstacleMin !== undefined ? Number(a.obstacleMin) : null,
              obstacleSec: a.obstacleSec !== null && a.obstacleSec !== undefined ? Number(a.obstacleSec) : null,
              marchHours: a.marchHours !== null && a.marchHours !== undefined ? Number(a.marchHours) : null,
              marchMin: a.marchMin !== null && a.marchMin !== undefined ? Number(a.marchMin) : null,
              sprint100m: a.sprint100m !== null && a.sprint100m !== undefined ? Number(a.sprint100m) : null,
              colleagueCarry: a.colleagueCarry !== null && a.colleagueCarry !== undefined ? Number(a.colleagueCarry) : null,
              zigzagRun: a.zigzagRun !== null && a.zigzagRun !== undefined ? Number(a.zigzagRun) : null,
              longJump: a.longJump !== null && a.longJump !== undefined ? Number(a.longJump) : null,
              grenadeThrow: a.grenadeThrow !== null && a.grenadeThrow !== undefined ? Number(a.grenadeThrow) : null,
              attendanceStatus: a.attendanceStatus || 'not_tested',
              exercisesNotes: a.exercisesNotes || '',
              suburbNotes: a.suburbNotes || '',
            });
          }
        }
      });

      importTx();
      res.json({ newPeriodId: activePeriodId, state: readFullDatabaseState() });
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

      res.json({
        newPersonId: id,
        person: {
          id,
          serialNum,
          militaryId: p.militaryId || `${41000 + serialNum}`,
          corps: p.corps || 'مشاة',
          rank: p.rank || 'نقيب',
          category: p.category || 'officers',
          forceType: p.forceType || 'combat',
          name: p.name || 'فرد جديد',
          age: Number(p.age) || 30,
          weight: p.weight !== undefined && p.weight !== null ? Number(p.weight) : null,
          height: p.height !== undefined && p.height !== null ? Number(p.height) : null,
        },
      });
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
      res.json({ success: true, person: p });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/personnel/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM personnel WHERE id = ?').run(id);
      res.json({ success: true, deletedId: id });
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
      res.json({ success: true, periodId, personId });
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

  // 8. Reset or Wipe Database (Factory Reset - completely empty state)
  app.post('/api/database/reset', (_req, res) => {
    try {
      wipeDatabaseToCleanState();
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

  // --------------------------------------------------------------------------
  // SYSTEM & UPDATE MANAGEMENT (النسخ الاحتياطي وإدارة التحديثات الذكية)
  // --------------------------------------------------------------------------
  const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
  if (!fs.existsSync(BACKUPS_DIR)) {
    try {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    } catch { }
  }

  function compareVersions(v1: string, v2: string): number {
    const p1 = v1.split('.').map((n) => parseInt(n, 10) || 0);
    const p2 = v2.split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const num1 = p1[i] || 0;
      const num2 = p2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }

  // A. System Info & Dedication to Commander Mohamed Abdo Ramadan
  app.get('/api/system/info', (_req, res) => {
    try {
      const stats = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH) : null;
      const personnelCount = (
        db.prepare('SELECT COUNT(*) as count FROM personnel').get() as { count: number }
      ).count;
      const periodsCount = (
        db.prepare('SELECT COUNT(*) as count FROM periods').get() as { count: number }
      ).count;
      const assessmentsCount = (
        db.prepare('SELECT COUNT(*) as count FROM assessments').get() as { count: number }
      ).count;

      res.json({
        version: '2.2.0',
        edition: 'Military Pro Edition (النسخة العسكرية الاحترافية)',
        appName: 'منظومة التقييم واللياقة البدنية للقوات المسلحة',
        commander: 'السيد القائد / محمد عبده رمضان',
        institution: 'الكلية الحربية المصرية - مصنع الرجال وعرين الأبطال',
        motto: 'الواجب · الشرف · الوطن',
        author: 'المهندس / أحمد محمد عطية',
        specialization: 'مهندس تصميم الدوائر المتكاملة الرقمية وتطوير النظم البرمجية (Digital IC Design & Software Systems Engineer)',
        dbPath: DB_PATH,
        dbSizeBytes: stats ? stats.size : 0,
        personnelCount,
        periodsCount,
        assessmentsCount,
        lastUpdated: stats ? stats.mtime.toISOString() : new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // B. Check for updates on GitHub (Online check with offline resilience)
  app.get('/api/system/check-updates', async (_req, res) => {
    const currentVersion = '2.2.0';
    const repoUrl = 'https://github.com/Ahm3d0x/Performance-Tracker-Pro';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(
        'https://raw.githubusercontent.com/Ahm3d0x/Performance-Tracker-Pro/main/package.json',
        {
          headers: { 'User-Agent': 'Performance-Tracker-Pro-Client' },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const remotePkg = (await response.json()) as any;
        const remoteVersion = remotePkg.version || currentVersion;
        const hasUpdate = compareVersions(remoteVersion, currentVersion) > 0;

        res.json({
          online: true,
          hasUpdate,
          currentVersion,
          latestVersion: remoteVersion,
          repoUrl,
          checkedAt: new Date().toISOString(),
          message: hasUpdate
            ? `يوجد إصدار أحدث متوفر الآن (${remoteVersion}) من خادم التحديثات الرسمي!`
            : 'المنظومة محدثة لأحدث إصدار رسمي ممتاز.',
        });
      } else {
        res.json({
          online: false,
          hasUpdate: false,
          currentVersion,
          latestVersion: currentVersion,
          repoUrl,
          checkedAt: new Date().toISOString(),
          message: 'تعذر جلب بيانات التحديث من الخادم المركزي.',
        });
      }
    } catch {
      res.json({
        online: false,
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        repoUrl,
        checkedAt: new Date().toISOString(),
        message: 'وضع غير متصل بالإنترنت (Offline Mode). المنظومة تعمل محلياً بكامل طاقتها.',
      });
    }
  });

  // C. Create automatic backup of SQLite database before update or on demand
  app.post('/api/system/create-backup', (_req, res) => {
    try {
      if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      }

      db.pragma('wal_checkpoint(FULL)');

      const now = new Date();
      const dateStr = now
        .toISOString()
        .replace(/:/g, '-')
        .replace(/\..+/, '')
        .replace('T', '_');
      const backupFileName = `military_fitness_backup_${dateStr}.sqlite`;
      const backupFilePath = path.join(BACKUPS_DIR, backupFileName);

      fs.copyFileSync(DB_PATH, backupFilePath);
      const stat = fs.statSync(backupFilePath);

      res.json({
        success: true,
        fileName: backupFileName,
        filePath: backupFilePath,
        sizeBytes: stat.size,
        createdAt: now.toISOString(),
        message: 'تم حفظ نسخة احتياطية آمنة لقاعدة البيانات بنجاح قبل التحديث.',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // D. List all available local backups
  app.get('/api/system/backups', (_req, res) => {
    try {
      if (!fs.existsSync(BACKUPS_DIR)) {
        return res.json({ backups: [] });
      }

      const files = fs.readdirSync(BACKUPS_DIR);
      const backups = files
        .filter((f) => f.endsWith('.sqlite'))
        .map((fileName) => {
          const filePath = path.join(BACKUPS_DIR, fileName);
          const stat = fs.statSync(filePath);
          return {
            fileName,
            sizeBytes: stat.size,
            createdAt: stat.mtime.toISOString(),
          };
        })
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      res.json({ backups });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // E. Restore a specific backup file
  app.post('/api/system/restore-backup', (req, res) => {
    try {
      const { fileName } = req.body;
      if (!fileName || typeof fileName !== 'string') {
        return res.status(400).json({ error: 'اسم ملف النسخة غير محدد' });
      }

      const backupFilePath = path.join(BACKUPS_DIR, path.basename(fileName));
      if (!fs.existsSync(backupFilePath)) {
        return res.status(404).json({ error: 'ملف النسخة الاحتياطية غير موجود' });
      }

      // 1. Take safety snapshot of current before overwriting
      const safetyName = `safety_before_restore_${Date.now()}.sqlite`;
      fs.copyFileSync(DB_PATH, path.join(BACKUPS_DIR, safetyName));

      // 2. Close active DB handles and restore
      db.pragma('wal_checkpoint(FULL)');
      fs.copyFileSync(backupFilePath, DB_PATH);

      res.json({
        success: true,
        message: `تم استرجاع النسخة الاحتياطية (${fileName}) بنجاح تام!`,
        state: readFullDatabaseState(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
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

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
