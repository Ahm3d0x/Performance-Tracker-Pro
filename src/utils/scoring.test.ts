import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveStageForAge,
  calculateExerciseScore,
  evaluatePersonAssessment,
  evaluateAndRankPeriod,
  calculateUnitPeriodSummary,
  comparePeriods,
  DEFAULT_SCORING_SETTINGS,
  PersonRecord,
  AssessmentInput,
} from './scoring';

test('resolveStageForAge maps military age stages 1 through 6 accurately', () => {
  assert.equal(resolveStageForAge(25).stage, 1);
  assert.equal(resolveStageForAge(30).stage, 2);
  assert.equal(resolveStageForAge(33).stage, 3);
  assert.equal(resolveStageForAge(37).stage, 4);
  assert.equal(resolveStageForAge(44).stage, 5);
  assert.equal(resolveStageForAge(51).stage, 6);
  // Stage override works
  assert.equal(resolveStageForAge(51, DEFAULT_SCORING_SETTINGS, 2).stage, 2);
});

test('calculateExerciseScore computes capped percentage', () => {
  assert.equal(calculateExerciseScore(10, 10), 100);
  assert.equal(calculateExerciseScore(15, 10), 100); // Capped at 100
  assert.equal(calculateExerciseScore(5, 10), 50);
  assert.equal(calculateExerciseScore(0, 10), 0);
});

test('evaluatePersonAssessment calculates individual exercises, suburb, and total percentage', () => {
  const officer: PersonRecord = {
    id: 'p1',
    serialNum: 1,
    militaryId: '1001',
    corps: 'مشاة',
    rank: 'عميد أح',
    category: 'officers',
    forceType: 'combat',
    name: 'عمرو حسن عبدالمجيد إبراهيم',
    age: 51, // Stage 6: pullupsMax=5, pushupsMax=22, situpsMax=25, runMax=24
    weight: 87,
    height: 181,
  };

  const input: AssessmentInput = {
    periodId: 'per1',
    personId: 'p1',
    pullupsCount: 5, // 100%
    pushupsCount: 22, // 100%
    situpsCount: 20, // 80%
    runCount: 24, // 100%
    suburbTimeCode: 2, // 22.00 ق -> 95%
    suburbMin: 22,
    suburbSec: 0,
    obstacleMin: null,
    obstacleSec: null,
    marchHours: null,
    marchMin: null,
    sprint100m: null,
    colleagueCarry: null,
    zigzagRun: null,
    longJump: null,
    grenadeThrow: null,
    attendanceStatus: 'tested',
    exercisesNotes: '',
    suburbNotes: '',
  };

  const result = evaluatePersonAssessment(officer, input);
  assert.equal(result.stage.stage, 6);
  assert.equal(result.exercisesPercentage, 95); // (100+100+80+100)/4 = 95
  assert.equal(result.suburbScore, 95);
  assert.equal(result.totalPercentage, 95);
  assert.equal(result.totalGrade, 'ممتاز');
});

test('evaluateAndRankPeriod sorts from best to lowest and calculates unit summary & period comparison', () => {
  const personnel: PersonRecord[] = [
    {
      id: 'p1',
      serialNum: 1,
      militaryId: '101',
      corps: 'مدرعات',
      rank: 'عقيد أح',
      category: 'officers',
      forceType: 'combat',
      name: 'ضابط أول',
      age: 44, // Stage 5
      weight: 82,
      height: 180,
    },
    {
      id: 'p2',
      serialNum: 2,
      militaryId: '202',
      corps: 'مشاة',
      rank: 'رقيب أول',
      category: 'other_ranks',
      forceType: 'combat',
      name: 'فرد صف أول',
      age: 30, // Stage 2
      weight: 76,
      height: 175,
    },
  ];

  const prevInputs: Record<string, AssessmentInput> = {
    p1: {
      periodId: 'prev',
      personId: 'p1',
      pullupsCount: 5,
      pushupsCount: 20,
      situpsCount: 25,
      runCount: 24,
      suburbTimeCode: 4, // 85%
      suburbMin: 23,
      suburbSec: 0,
      obstacleMin: null,
      obstacleSec: null,
      marchHours: null,
      marchMin: null,
      sprint100m: null,
      colleagueCarry: null,
      zigzagRun: null,
      longJump: null,
      grenadeThrow: null,
      attendanceStatus: 'tested',
      exercisesNotes: '',
      suburbNotes: '',
    },
    p2: {
      periodId: 'prev',
      personId: 'p2',
      pullupsCount: 12,
      pushupsCount: 44,
      situpsCount: 52,
      runCount: 40,
      suburbTimeCode: 1, // 100%
      suburbMin: 21,
      suburbSec: 30,
      obstacleMin: null,
      obstacleSec: null,
      marchHours: null,
      marchMin: null,
      sprint100m: null,
      colleagueCarry: null,
      zigzagRun: null,
      longJump: null,
      grenadeThrow: null,
      attendanceStatus: 'tested',
      exercisesNotes: '',
      suburbNotes: '',
    },
  };

  const currInputs: Record<string, AssessmentInput> = {
    p1: {
      ...prevInputs.p1,
      periodId: 'curr',
      pullupsCount: 6,
      pushupsCount: 26,
      situpsCount: 30,
      runCount: 28,
      suburbTimeCode: 1, // 100% -> Total 100%
    },
    p2: {
      ...prevInputs.p2,
      periodId: 'curr',
      suburbTimeCode: 3, // 90% -> Total 95%
    },
  };

  const prevEval = evaluateAndRankPeriod(personnel, prevInputs, 'prev');
  const currEval = evaluateAndRankPeriod(personnel, currInputs, 'curr');

  const p1Curr = currEval.find((i) => i.person.id === 'p1')!;
  const p2Curr = currEval.find((i) => i.person.id === 'p2')!;

  assert.equal(p1Curr.overallRank, 1);
  assert.equal(p2Curr.overallRank, 2);

  const summary = calculateUnitPeriodSummary(currEval);
  assert.equal(summary.overall.testedCount, 2);
  assert.equal(summary.overall.avgTotalPercentage, 97.5);

  const comparison = comparePeriods(currEval, prevEval);
  const p1Comp = comparison.find((c) => c.person.id === 'p1')!;
  assert.equal(p1Comp.trend, 'improved');
  assert.equal(p1Comp.rankDelta, 1); // Moved from #2 to #1
});
