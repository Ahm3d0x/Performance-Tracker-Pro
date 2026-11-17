// server.ts
import express from "express";
import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

// src/utils/scoring.ts
var DEFAULT_SCORING_SETTINGS = {
  unitName: "\u0627\u0644\u0644\u0648\u0627\u0621 \u0627\u0644\u0623\u0648\u0644 \u0627\u0644\u0645\u0634\u0627\u0629 \u0627\u0644\u0645\u064A\u0643\u0627\u0646\u064A\u0643\u064A",
  ministryHeader: "\u0648\u0632\u0627\u0631\u0629 \u0627\u0644\u062F\u0641\u0627\u0639",
  authorityHeader: "\u0647\u064A\u0626\u0629 \u062A\u062F\u0631\u064A\u0628 \u0627\u0644\u0642\u0648\u0627\u062A \u0627\u0644\u0645\u0633\u0644\u062D\u0629",
  branchHeader: "\u0641\u0631\u0639 \u0627\u0644\u062A\u0631\u0628\u064A\u0629 \u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0629",
  forceTypeLabel: "\u0645\u0642\u0627\u062A\u0644\u0629 / \u0645\u0639\u0627\u0648\u0646\u0629",
  genderLabel: "\u0630\u0643\u0648\u0631",
  exercisesWeight: 0.5,
  suburbWeight: 0.5,
  passThreshold: 50,
  stages: [
    {
      stage: 1,
      name: "\u0645\u0631\u062D\u0644\u0629 \u0623\u0648\u0644\u0649",
      minAge: 18,
      maxAge: 26,
      pullupsMax: 14,
      pushupsMax: 50,
      situpsMax: 60,
      runMax: 45
    },
    {
      stage: 2,
      name: "\u0645\u0631\u062D\u0644\u0629 \u062B\u0627\u0646\u064A\u0629",
      minAge: 27,
      maxAge: 31,
      pullupsMax: 12,
      pushupsMax: 44,
      situpsMax: 52,
      runMax: 40
    },
    {
      stage: 3,
      name: "\u0645\u0631\u062D\u0644\u0629 \u062B\u0627\u0644\u062B\u0629",
      minAge: 32,
      maxAge: 36,
      pullupsMax: 10,
      pushupsMax: 38,
      situpsMax: 45,
      runMax: 36
    },
    {
      stage: 4,
      name: "\u0645\u0631\u062D\u0644\u0629 \u0631\u0627\u0628\u0639\u0629",
      minAge: 37,
      maxAge: 41,
      pullupsMax: 8,
      pushupsMax: 32,
      situpsMax: 38,
      runMax: 32
    },
    {
      stage: 5,
      name: "\u0645\u0631\u062D\u0644\u0629 \u062E\u0627\u0645\u0633\u0629",
      minAge: 42,
      maxAge: 46,
      pullupsMax: 6,
      pushupsMax: 26,
      situpsMax: 30,
      runMax: 28
    },
    {
      stage: 6,
      name: "\u0645\u0631\u062D\u0644\u0629 \u0633\u0627\u062F\u0633\u0629",
      minAge: 47,
      maxAge: 70,
      pullupsMax: 5,
      pushupsMax: 22,
      situpsMax: 25,
      runMax: 24
    }
  ],
  suburbTimes: [
    { code: 0, label: "\u0644\u0645 \u064A\u062E\u062A\u0628\u0631", score: 0, isUntested: true },
    { code: 1, label: "21.30 \u0642", score: 100 },
    { code: 2, label: "22.00 \u0642", score: 95 },
    { code: 3, label: "22.30 \u0642", score: 90 },
    { code: 4, label: "23.00 \u0642", score: 85 },
    { code: 5, label: "23.30 \u0642", score: 80 },
    { code: 6, label: "24.00 \u0642", score: 75 },
    { code: 7, label: "24.30 \u0642", score: 70 },
    { code: 8, label: "25.00 \u0642", score: 65 },
    { code: 9, label: "25.30 \u0642", score: 60 },
    { code: 10, label: "26.00 \u0642", score: 55 },
    { code: 11, label: "\u062E\u0627\u0631\u062C \u0627\u0644\u0632\u0645\u0646", score: 0, isOutOfTime: true },
    { code: 12, label: "\u0645\u0648\u0642\u0641 \u0637\u0628\u0649", score: 0, isMedical: true }
  ]
};
function resolveStageForAge(age, settings = DEFAULT_SCORING_SETTINGS, override) {
  if (override) {
    const foundOverride = settings.stages.find((s) => s.stage === override);
    if (foundOverride) return foundOverride;
  }
  const safeAge = Number.isFinite(age) && age > 0 ? age : 25;
  for (const st of settings.stages) {
    if (safeAge >= st.minAge && safeAge <= st.maxAge) {
      return st;
    }
  }
  if (safeAge < settings.stages[0].minAge) return settings.stages[0];
  return settings.stages[settings.stages.length - 1];
}

// src/data/seedPersonnel.ts
var INITIAL_PERIODS = [
  {
    id: "period-2025-nov",
    name: "\u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631 \u0627\u0644\u062F\u0648\u0631\u064A \u0627\u0644\u0633\u0627\u0628\u0642 - \u0646\u0648\u0641\u0645\u0628\u0631 2025",
    date: "2025-11-10",
    beneficiary: "\u0647\u064A\u0626\u0629 \u062A\u062F\u0631\u064A\u0628 \u0627\u0644\u0642\u0648\u0627\u062A \u0627\u0644\u0645\u0633\u0644\u062D\u0629",
    unitName: "\u0627\u0644\u0644\u0648\u0627\u0621 \u0627\u0644\u0623\u0648\u0644 \u0627\u0644\u0645\u0634\u0627\u0629 \u0627\u0644\u0645\u064A\u0643\u0627\u0646\u064A\u0643\u064A",
    notes: "\u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631 \u0627\u0644\u062F\u0648\u0631\u064A \u0644\u0644\u0631\u0628\u0639 \u0627\u0644\u0631\u0627\u0628\u0639 \u0644\u0639\u0627\u0645 2025"
  },
  {
    id: "period-2026-feb",
    name: "\u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631 \u0627\u0644\u0631\u0633\u0645\u064A - 3 \u0641\u0628\u0631\u0627\u064A\u0631 2026",
    date: "2026-02-03",
    beneficiary: "\u0641\u0631\u0639 \u0627\u0644\u062A\u0631\u0628\u064A\u0629 \u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0629 - \u0647\u064A\u0626\u0629 \u0627\u0644\u062A\u062F\u0631\u064A\u0628",
    unitName: "\u0627\u0644\u0644\u0648\u0627\u0621 \u0627\u0644\u0623\u0648\u0644 \u0627\u0644\u0645\u0634\u0627\u0629 \u0627\u0644\u0645\u064A\u0643\u0627\u0646\u064A\u0643\u064A",
    notes: "\u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0641\u0635\u064A\u0644\u064A\u0629 \u0644\u0644\u062A\u0631\u0628\u064A\u0629 \u0627\u0644\u0628\u062F\u0646\u064A\u0629 - \u0643\u0634\u0641 \u0641\u0628\u0631\u0627\u064A\u0631 2026"
  },
  {
    id: "period-2026-may",
    name: "\u0627\u062E\u062A\u0628\u0627\u0631 \u0627\u0644\u0645\u062A\u0627\u0628\u0639\u0629 \u0648\u0627\u0644\u062A\u0631\u062A\u064A\u0628 \u0627\u0644\u0639\u0627\u0645 - \u0645\u0627\u064A\u0648 2026",
    date: "2026-05-15",
    beneficiary: "\u0647\u064A\u0626\u0629 \u062A\u062F\u0631\u064A\u0628 \u0627\u0644\u0642\u0648\u0627\u062A \u0627\u0644\u0645\u0633\u0644\u062D\u0629",
    unitName: "\u0627\u0644\u0644\u0648\u0627\u0621 \u0627\u0644\u0623\u0648\u0644 \u0627\u0644\u0645\u0634\u0627\u0629 \u0627\u0644\u0645\u064A\u0643\u0627\u0646\u064A\u0643\u064A",
    notes: "\u0627\u062E\u062A\u0628\u0627\u0631 \u0642\u064A\u0627\u0633 \u062A\u0637\u0648\u0631 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0628\u062F\u0646\u064A \u0648\u0645\u0642\u0627\u0631\u0646\u0629 \u0627\u0644\u0641\u062A\u0631\u0627\u062A"
  }
];
var INITIAL_PERSONNEL = [
  { id: "p-1", serialNum: 1, militaryId: "41001", corps: "\u0645\u0634\u0627\u0629", rank: "\u0639\u0645\u064A\u062F \u0623\u062D", category: "officers", forceType: "combat", name: "\u0639\u0645\u0631\u0648 \u062D\u0633\u0646 \u0639\u0628\u062F\u0627\u0644\u0645\u062C\u064A\u062F \u0625\u0628\u0631\u0627\u0647\u064A\u0645", age: 51, weight: 87, height: 181 },
  { id: "p-2", serialNum: 2, militaryId: "41002", corps: "\u0645\u062F\u0631\u0639\u0627\u062A", rank: "\u0639\u0645\u064A\u062F \u0623\u062D", category: "officers", forceType: "combat", name: "\u062D\u0627\u062A\u0645 \u0623\u0628\u0648\u062F\u0647\u0628 \u062A\u0645\u0627\u0645 \u0645\u062D\u0645\u062F", age: 50, weight: 87, height: 186 },
  { id: "p-3", serialNum: 3, militaryId: "41003", corps: "\u0645\u062F\u0641\u0639\u064A\u0629", rank: "\u0639\u0645\u064A\u062F \u0623\u062D", category: "officers", forceType: "combat", name: "\u0645\u0635\u0637\u0641\u0649 \u0639\u0628\u0627\u0633 \u0646\u062F\u0627 \u0627\u0644\u0628\u0642\u0631\u0649", age: 50, weight: 88, height: 185 },
  { id: "p-4", serialNum: 4, militaryId: "41004", corps: "\u0645\u0634\u0627\u0629", rank: "\u0639\u0645\u064A\u062F \u0623\u062D", category: "officers", forceType: "combat", name: "\u0627\u062D\u0645\u062F \u0641\u062A\u062D\u0649 \u0634\u0641\u064A\u0642 \u0627\u0644\u0646\u062C\u0627\u0631", age: 50, weight: 81, height: 175 },
  { id: "p-5", serialNum: 5, militaryId: "41005", corps: "\u0625\u0634\u0627\u0631\u0629", rank: "\u0639\u0645\u064A\u062F \u0623\u062D", category: "officers", forceType: "support", name: "\u0631\u0627\u0645\u0649 \u062D\u0644\u0645\u0649 \u0639\u0628\u062F\u0627\u0644\u0631\u062D\u0645\u0646 \u0627\u0628\u0648\u0632\u064A\u062F", age: 49, weight: 82, height: 177 },
  { id: "p-6", serialNum: 6, militaryId: "41006", corps: "\u0645\u0647\u0646\u062F\u0633\u064A\u0646", rank: "\u0639\u0645\u064A\u062F", category: "officers", forceType: "combat", name: "\u0639\u0627\u0637\u0641 \u0639\u0628\u062F\u0627\u0644\u0641\u062A\u0627\u062D \u0627\u0644\u0633\u064A\u062F \u0627\u0644\u0639\u0637\u0627\u0631", age: 48, weight: 93, height: 183 },
  { id: "p-7", serialNum: 7, militaryId: "41007", corps: "\u0645\u0634\u0627\u0629", rank: "\u0639\u0645\u064A\u062F \u0623\u062D", category: "officers", forceType: "combat", name: "\u0627\u062D\u0645\u062F \u0639\u0644\u0649 \u0633\u0644\u064A\u0645\u0627\u0646 \u0645\u062D\u0645\u062F", age: 48, weight: 88, height: 181 },
  { id: "p-8", serialNum: 8, militaryId: "41008", corps: "\u062F\u0641\u0627\u0639 \u062C\u0648\u064A", rank: "\u0639\u0645\u064A\u062F \u0623\u062D", category: "officers", forceType: "combat", name: "\u0639\u0644\u0649 \u0627\u0644\u0633\u064A\u062F \u062D\u0633\u0646 \u0639\u0645\u0631\u0627\u0646", age: 48, weight: 95, height: 195 },
  { id: "p-9", serialNum: 9, militaryId: "41009", corps: "\u0645\u0631\u0643\u0628\u0627\u062A", rank: "\u0639\u0645\u064A\u062F", category: "officers", forceType: "support", name: "\u0645\u062D\u0645\u062F \u0633\u0639\u062F \u062D\u0633\u064A\u0646 \u0639\u0628\u062F\u0627\u0644\u062D\u0642", age: 47, weight: 96, height: 189 },
  { id: "p-10", serialNum: 10, militaryId: "41010", corps: "\u0645\u0634\u0627\u0629", rank: "\u0639\u0645\u064A\u062F \u0623\u062D", category: "officers", forceType: "combat", name: "\u0639\u0645\u0631\u0648 \u062D\u0633\u064A\u0646 \u0639\u0644\u0649 \u0627\u062D\u0645\u062F", age: 47, weight: 85, height: 178 },
  { id: "p-11", serialNum: 11, militaryId: "41011", corps: "\u0645\u062F\u0631\u0639\u0627\u062A", rank: "\u0639\u0645\u064A\u062F \u0623\u062D", category: "officers", forceType: "combat", name: "\u0637\u0627\u0631\u0642 \u0627\u062D\u0645\u062F \u0639\u0628\u062F\u0627\u0644\u0631\u062D\u064A\u0645", age: 49, weight: 87, height: 180 },
  { id: "p-12", serialNum: 12, militaryId: "41012", corps: "\u0645\u062F\u0641\u0639\u064A\u0629", rank: "\u0639\u0645\u064A\u062F \u0623\u062D", category: "officers", forceType: "combat", name: "\u0639\u0635\u0627\u0645 \u062D\u0633\u064A\u0646 \u0627\u0644\u0633\u0628\u0627\u0639\u0649 \u0639\u0628\u062F\u0627\u0644\u0639\u0627\u0644", age: 47, weight: 82, height: 176 },
  { id: "p-13", serialNum: 13, militaryId: "41013", corps: "\u0645\u0634\u0627\u0629", rank: "\u0639\u0645\u064A\u062F \u0623\u062D", category: "officers", forceType: "combat", name: "\u0645\u062D\u0645\u0648\u062F \u0627\u062D\u0645\u062F \u0645\u062D\u0645\u0648\u062F \u0627\u062D\u0645\u062F \u0642\u062F\u062D", age: 48, weight: 80, height: 179 },
  { id: "p-14", serialNum: 14, militaryId: "41014", corps: "\u0642\u0648\u0627\u062A \u062C\u0648\u064A\u0629", rank: "\u0639\u0642\u064A\u062F \u062C\u0648\u0649", category: "officers", forceType: "combat", name: "\u0627\u0644\u0628\u0627\u0634\u0627 \u062B\u0631\u0648\u062A \u0639\u0628\u062F\u0627\u0644\u0628\u062F\u064A\u0639 \u0639\u0637\u064A\u0647", age: 46, weight: 77, height: 174 },
  { id: "p-15", serialNum: 15, militaryId: "41015", corps: "\u0645\u0634\u0627\u0629", rank: "\u0639\u0642\u064A\u062F \u0623\u062D", category: "officers", forceType: "combat", name: "\u0639\u0628\u062F\u0627\u0644\u0644\u0647 \u0645\u062D\u0645\u0648\u062F \u0645\u062D\u0645\u062F \u0631\u0634\u062F\u0649 \u0627\u0644\u0645\u0639\u062F\u0627\u0648\u0649", age: 46, weight: 82, height: 177 },
  { id: "p-16", serialNum: 16, militaryId: "41016", corps: "\u0645\u062F\u0631\u0639\u0627\u062A", rank: "\u0639\u0642\u064A\u062F \u0623\u062D", category: "officers", forceType: "combat", name: "\u0639\u0645\u0631\u0648 \u062F\u064A\u0628 \u0639\u0644\u0649 \u062F\u064A\u0628", age: 45, weight: 93, height: 191 },
  { id: "p-17", serialNum: 17, militaryId: "41017", corps: "\u0625\u0645\u062F\u0627\u062F \u0648\u062A\u0645\u0648\u064A\u0646", rank: "\u0639\u0642\u064A\u062F", category: "officers", forceType: "support", name: "\u0639\u0628\u062F\u0627\u0644\u062D\u0645\u064A\u062F \u0645\u062D\u0645\u0648\u062F \u0645\u062D\u0645\u062F \u0646\u0635\u064A\u0631", age: 45, weight: 79, height: 184 },
  { id: "p-18", serialNum: 18, militaryId: "41018", corps: "\u0645\u0634\u0627\u0629", rank: "\u0639\u0642\u064A\u062F", category: "officers", forceType: "combat", name: "\u0627\u062D\u0645\u062F \u0645\u062D\u0645\u062F \u0639\u0628\u062F\u0627\u0644\u0642\u0627\u062F\u0631 \u0639\u0644\u0649", age: 45, weight: 95, height: 189 },
  { id: "p-19", serialNum: 19, militaryId: "41019", corps: "\u0645\u062F\u0641\u0639\u064A\u0629", rank: "\u0639\u0642\u064A\u062F \u0623\u062D", category: "officers", forceType: "combat", name: "\u0645\u062D\u0645\u062F \u0623\u0628\u0648 \u0628\u0643\u0631 \u0625\u0628\u0631\u0627\u0647\u064A\u0645 \u0647\u0644\u0627\u0644 \u064A\u0648\u0633\u0641", age: 42, weight: 89, height: 181 },
  { id: "p-20", serialNum: 20, militaryId: "41020", corps: "\u062D\u0631\u0628 \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0629", rank: "\u0639\u0642\u064A\u062F", category: "officers", forceType: "support", name: "\u0627\u062D\u0645\u062F \u0641\u062E\u0631\u0649 \u0645\u062D\u0645\u0648\u062F \u0627\u062D\u0645\u062F \u0628\u0643\u0631", age: 44, weight: 81, height: 180 },
  { id: "p-21", serialNum: 21, militaryId: "41021", corps: "\u0645\u0634\u0627\u0629", rank: "\u0639\u0642\u064A\u062F \u0623\u062D", category: "officers", forceType: "combat", name: "\u0645\u062D\u0645\u062F \u0639\u0632\u062A \u0645\u062D\u0645\u062F \u0639\u0637\u064A\u0647", age: 44, weight: 85, height: 185 },
  { id: "p-22", serialNum: 22, militaryId: "41022", corps: "\u0645\u062F\u0631\u0639\u0627\u062A", rank: "\u0639\u0642\u064A\u062F \u0623\u062D", category: "officers", forceType: "combat", name: "\u0645\u062D\u0645\u062F \u0645\u0635\u0637\u0641\u0649 \u0639\u0628\u062F\u0627\u0644\u0628\u0627\u0642\u0649 \u0628\u064A\u0648\u0645\u0649", age: 44, weight: 83, height: 180 },
  { id: "p-23", serialNum: 23, militaryId: "41023", corps: "\u0645\u0634\u0627\u0629", rank: "\u0639\u0642\u064A\u062F \u0623\u062D", category: "officers", forceType: "combat", name: "\u0645\u062D\u0645\u062F \u0633\u0639\u062F \u0639\u0628\u062F\u0627\u0644\u0647\u0627\u062F\u0649 \u0631\u0632\u0648\u0642\u0629", age: 44, weight: 84, height: 182 },
  { id: "p-24", serialNum: 24, militaryId: "41024", corps: "\u0645\u062F\u0641\u0639\u064A\u0629", rank: "\u0639\u0642\u064A\u062F \u0623\u062D", category: "officers", forceType: "combat", name: "\u0641\u0643\u0631\u0649 \u062D\u0645\u062F\u0649 \u0641\u0643\u0631\u0649 \u0639\u062C\u064A\u0632", age: 44, weight: 85, height: 176 },
  { id: "p-25", serialNum: 25, militaryId: "41025", corps: "\u0645\u0647\u0646\u062F\u0633\u064A\u0646", rank: "\u0639\u0642\u064A\u062F \u0623\u062D", category: "officers", forceType: "combat", name: "\u062D\u0633\u0646 \u0645\u062D\u0645\u062F \u0633\u0639\u064A\u062F \u0645\u062D\u0645\u062F \u0627\u062D\u0645\u062F", age: 44, weight: 94, height: 192 },
  { id: "p-26", serialNum: 26, militaryId: "41026", corps: "\u0625\u0634\u0627\u0631\u0629", rank: "\u0639\u0642\u064A\u062F", category: "officers", forceType: "support", name: "\u0645\u062D\u0645\u062F \u0628\u062F\u0631\u0649 \u0639\u0628\u062F\u0627\u0644\u062D\u0645\u064A\u062F \u062D\u0633\u064A\u0646", age: 44, weight: 92, height: 188 },
  { id: "p-27", serialNum: 27, militaryId: "41027", corps: "\u0645\u0634\u0627\u0629", rank: "\u0639\u0642\u064A\u062F", category: "officers", forceType: "combat", name: "\u0645\u062D\u0645\u062F \u062D\u0627\u062A\u0645 \u0639\u0628\u062F\u0627\u0644\u0648\u0647\u0627\u0628 \u0633\u0644\u064A\u0645\u0647", age: 44, weight: 76, height: 173 },
  { id: "p-28", serialNum: 28, militaryId: "41028", corps: "\u0645\u062F\u0631\u0639\u0627\u062A", rank: "\u0639\u0642\u064A\u062F", category: "officers", forceType: "combat", name: "\u0627\u062D\u0645\u062F \u0639\u0644\u0649 \u0645\u062D\u0645\u062F \u0639\u0637\u064A\u0647", age: 44, weight: 92, height: 185 },
  { id: "p-29", serialNum: 29, militaryId: "41029", corps: "\u0623\u0633\u0644\u062D\u0629 \u0648\u0630\u062E\u064A\u0631\u0629", rank: "\u0639\u0642\u064A\u062F", category: "officers", forceType: "support", name: "\u0627\u062D\u0645\u062F \u0639\u0628\u062F\u0627\u0644\u0628\u062F\u064A\u0639 \u0627\u062D\u0645\u062F \u0627\u0644\u062A\u0631\u0627\u0633", age: 43, weight: 75, height: 178 },
  { id: "p-30", serialNum: 30, militaryId: "41030", corps: "\u0645\u0634\u0627\u0629", rank: "\u0639\u0642\u064A\u062F \u0623\u062D", category: "officers", forceType: "combat", name: "\u0648\u0644\u064A\u062F \u0627\u0628\u0648\u0627\u0644\u0641\u062A\u0648\u062D \u0645\u062D\u0645\u062F \u062C\u0648\u0647\u0631", age: 45, weight: 71, height: 175 },
  { id: "p-31", serialNum: 31, militaryId: "41031", corps: "\u0645\u062F\u0641\u0639\u064A\u0629", rank: "\u0639\u0642\u064A\u062F \u0623\u062D", category: "officers", forceType: "combat", name: "\u0639\u0645\u0631\u0648 \u0627\u062D\u0645\u062F \u0641\u0624\u0627\u062F \u0639\u0644\u0649 \u0627\u0644\u0628\u062D\u064A\u0631\u0649", age: 44, weight: 84, height: 179 },
  { id: "p-32", serialNum: 32, militaryId: "41032", corps: "\u0645\u0634\u0627\u0629", rank: "\u0645\u0642\u062F\u0645 \u0623\u062D", category: "officers", forceType: "combat", name: "\u0645\u062D\u0645\u062F \u0627\u0644\u0633\u064A\u062F \u0639\u0628\u062F\u0627\u0644\u062D\u0649 \u0645\u062D\u0645\u062F \u0645\u062D\u0645\u062F", age: 42, weight: 86, height: 181 },
  { id: "p-33", serialNum: 33, militaryId: "41033", corps: "\u0645\u062F\u0631\u0639\u0627\u062A", rank: "\u0645\u0642\u062F\u0645 \u0623\u062D", category: "officers", forceType: "combat", name: "\u0645\u0635\u0637\u0641\u0649 \u0635\u0628\u0631\u0649 \u0639\u0628\u062F\u0627\u0644\u062D\u0645\u064A\u062F \u0628\u062F\u0648\u0649", age: 42, weight: 86, height: 179 },
  { id: "p-34", serialNum: 34, militaryId: "41034", corps: "\u0627\u0633\u062A\u0637\u0644\u0627\u0639", rank: "\u0645\u0642\u062F\u0645", category: "officers", forceType: "combat", name: "\u0645\u062D\u0645\u062F \u0627\u0644\u0635\u0627\u062F\u0642 \u0639\u0628\u062F\u0627\u0644\u0645\u0637\u0644\u0628 \u0627\u0644\u062F\u064A\u0647\u0649", age: 42, weight: 82, height: 184 },
  { id: "p-35", serialNum: 35, militaryId: "41035", corps: "\u0645\u0634\u0627\u0629", rank: "\u0645\u0642\u062F\u0645 \u0623\u062D", category: "officers", forceType: "combat", name: "\u0648\u0644\u064A\u062F \u0645\u062D\u0645\u062F \u0635\u0644\u0627\u062D \u0625\u0633\u0645\u0627\u0639\u064A\u0644", age: 41, weight: 88, height: 182 },
  { id: "p-36", serialNum: 36, militaryId: "41036", corps: "\u0645\u062F\u0641\u0639\u064A\u0629", rank: "\u0645\u0642\u062F\u0645", category: "officers", forceType: "combat", name: "\u0645\u062D\u0645\u062F \u0646\u0634\u0627\u062A \u0639\u0644\u0649 \u0639\u0644\u0649 \u062A\u0648\u062A\u0648", age: 41, weight: 99, height: 189 },
  { id: "p-37", serialNum: 37, militaryId: "41037", corps: "\u0645\u0634\u0627\u0629", rank: "\u0645\u0642\u062F\u0645", category: "officers", forceType: "combat", name: "\u0627\u062D\u0645\u062F \u0628\u062F\u0631 \u0639\u0628\u062F\u0627\u0644\u0644\u0647 \u0645\u062D\u0645\u062F \u0639\u0641\u064A\u0641\u0649 \u0627\u0644\u0634\u064A\u062E", age: 37, weight: 81, height: 180 },
  { id: "p-38", serialNum: 38, militaryId: "41038", corps: "\u0645\u0647\u0646\u062F\u0633\u064A\u0646", rank: "\u0645\u0642\u062F\u0645", category: "officers", forceType: "combat", name: "\u0627\u062D\u0645\u062F \u062D\u0644\u0645\u0649 \u0627\u062D\u0645\u062F \u0627\u062D\u0645\u062F", age: 37, weight: 88, height: 183 },
  { id: "p-39", serialNum: 39, militaryId: "41039", corps: "\u0625\u0634\u0627\u0631\u0629", rank: "\u0645\u0642\u062F\u0645", category: "officers", forceType: "support", name: "\u0645\u062D\u0645\u062F \u0625\u0628\u0631\u0627\u0647\u064A\u0645 \u0645\u062D\u0645\u062F \u0639\u0628\u062F\u0627\u0644\u0644\u0647", age: 37, weight: 80, height: 177 },
  { id: "p-40", serialNum: 40, militaryId: "41040", corps: "\u0645\u062F\u0631\u0639\u0627\u062A", rank: "\u0645\u0642\u062F\u0645", category: "officers", forceType: "combat", name: "\u0637\u0647 \u0645\u062D\u0645\u062F \u0637\u0647 \u0627\u0628\u0648\u0646\u0639\u0645\u0647 \u0646\u062F\u0631\u064A\u0646", age: 37, weight: 95, height: 191 },
  { id: "p-41", serialNum: 41, militaryId: "41041", corps: "\u0642\u0648\u0627\u062A \u0628\u062D\u0631\u064A\u0629", rank: "\u0631\u0627\u0626\u062F \u0628\u062D\u0631\u0649", category: "officers", forceType: "combat", name: "\u0627\u062D\u0645\u062F \u0645\u062D\u0645\u062F \u0631\u0636\u0627 \u0645\u062D\u0645\u062F \u0634\u0645\u0633 \u0627\u0644\u062F\u064A\u0646", age: 33, weight: 71, height: 176 },
  { id: "p-42", serialNum: 42, militaryId: "41042", corps: "\u0641\u0646\u064A", rank: "\u0631\u0627\u0626\u062F \u0641\u0646\u0649", category: "officers", forceType: "support", name: "\u0627\u0633\u0644\u0627\u0645 \u0639\u0628\u062F\u0627\u0644\u063A\u0641\u0627\u0631 \u0639\u0628\u062F\u0627\u0644\u0633\u064A\u062F \u0639\u0628\u062F\u0627\u0644\u0644\u0637\u064A\u0641", age: 33, weight: 73, height: 175 },
  { id: "p-43", serialNum: 43, militaryId: "41043", corps: "\u0645\u0634\u0627\u0629", rank: "\u0631\u0627\u0626\u062F", category: "officers", forceType: "combat", name: "\u0627\u062D\u0645\u062F \u062D\u0633\u064A\u0646 \u0645\u062D\u0645\u062F \u0639\u0628\u062F\u0627\u0644\u062E\u0627\u0644\u0642", age: 33, weight: 82, height: 184 },
  { id: "p-44", serialNum: 44, militaryId: "82044", corps: "\u0645\u0634\u0627\u0629", rank: "\u0645\u0633\u0627\u0639\u062F", category: "other_ranks", forceType: "combat", name: "\u0627\u0628\u0631\u0627\u0647\u064A\u0645 \u062C\u0645\u0627\u0644 \u0639\u062F\u0644\u064A", age: 41, weight: 89, height: 184 },
  { id: "p-45", serialNum: 45, militaryId: "82045", corps: "\u0645\u062F\u0631\u0639\u0627\u062A", rank: "\u0645\u0633\u0627\u0639\u062F", category: "other_ranks", forceType: "combat", name: "\u0645\u062D\u0645\u062F \u0645\u0627\u0647\u0631 \u0627\u0628\u0631\u0627\u0647\u064A\u0645", age: 37, weight: 82, height: 178 },
  { id: "p-46", serialNum: 46, militaryId: "82046", corps: "\u0645\u062F\u0641\u0639\u064A\u0629", rank: "\u0645\u0633\u0627\u0639\u062F", category: "other_ranks", forceType: "combat", name: "\u0627\u062D\u0645\u062F \u0633\u0627\u0645\u0649 \u0645\u062D\u0645\u062F", age: 38, weight: 84, height: 179 },
  { id: "p-47", serialNum: 47, militaryId: "82047", corps: "\u0645\u0634\u0627\u0629", rank: "\u0631\u0642\u064A\u0628 \u0623\u0648\u0644", category: "other_ranks", forceType: "combat", name: "\u0645\u062D\u0645\u062F \u0639\u064A\u062F \u0645\u062D\u0645\u062F \u062D\u0633\u0646", age: 30, weight: 75, height: 176 },
  { id: "p-48", serialNum: 48, militaryId: "82048", corps: "\u0625\u0634\u0627\u0631\u0629", rank: "\u0631\u0642\u064A\u0628 \u0623\u0648\u0644", category: "other_ranks", forceType: "support", name: "\u0627\u0634\u0631\u0641 \u0645\u062C\u062F\u0649 \u0634\u0639\u0628\u0627\u0646", age: 33, weight: 76, height: 175 },
  { id: "p-49", serialNum: 49, militaryId: "82049", corps: "\u0645\u0647\u0646\u062F\u0633\u064A\u0646", rank: "\u0631\u0642\u064A\u0628 \u0623\u0648\u0644", category: "other_ranks", forceType: "combat", name: "\u0645\u062D\u0645\u0648\u062F \u0628\u062F\u0631 \u0639\u0628\u062F \u0627\u0644\u0633\u0645\u064A\u0639", age: 33, weight: 78, height: 177 },
  { id: "p-50", serialNum: 50, militaryId: "82050", corps: "\u0645\u0634\u0627\u0629", rank: "\u0631\u0642\u064A\u0628 \u0623\u0648\u0644", category: "other_ranks", forceType: "combat", name: "\u0645\u062D\u0645\u062F \u0634\u0639\u0628\u0627\u0646 \u0623\u062D\u0645\u062F", age: 30, weight: 74, height: 175 },
  { id: "p-51", serialNum: 51, militaryId: "82051", corps: "\u0645\u0631\u0643\u0628\u0627\u062A", rank: "\u0631\u0642\u064A\u0628 \u0623\u0648\u0644", category: "other_ranks", forceType: "support", name: "\u0627\u0633\u0644\u0627\u0645 \u064A\u062D\u0649 \u0639\u0644\u0649", age: 35, weight: 80, height: 178 },
  { id: "p-52", serialNum: 52, militaryId: "82052", corps: "\u0645\u0634\u0627\u0629", rank: "\u0631\u0642\u064A\u0628 \u0623\u0648\u0644", category: "other_ranks", forceType: "combat", name: "\u0645\u0635\u0637\u0641\u0649 \u0645\u062D\u0645\u0648\u062F \u0627\u0644\u0633\u064A\u062F", age: 32, weight: 79, height: 177 },
  { id: "p-53", serialNum: 53, militaryId: "82053", corps: "\u0635\u0627\u0639\u0642\u0629", rank: "\u0631\u0642\u064A\u0628 \u0623\u0648\u0644", category: "other_ranks", forceType: "combat", name: "\u0645\u062D\u0645\u062F \u0645\u062D\u0645\u0648\u062F \u0639\u0628\u062F \u0627\u0644\u062D\u0645\u064A\u062F", age: 31, weight: 71, height: 170 },
  { id: "p-54", serialNum: 54, militaryId: "82054", corps: "\u0645\u062F\u0631\u0639\u0627\u062A", rank: "\u0631\u0642\u064A\u0628 \u0623\u0648\u0644", category: "other_ranks", forceType: "combat", name: "\u0627\u0633\u0627\u0645\u0629 \u0627\u0644\u0633\u064A\u062F \u0642\u0646\u062F\u064A\u0644", age: 31, weight: 77, height: 176 },
  { id: "p-55", serialNum: 55, militaryId: "82055", corps: "\u0645\u0634\u0627\u0629", rank: "\u0631\u0642\u064A\u0628", category: "other_ranks", forceType: "combat", name: "\u0645\u062D\u0645\u062F \u0646\u0627\u062C\u0649 \u0627\u0628\u0631\u0627\u0647\u064A\u0645", age: 27, weight: 81, height: 181 },
  { id: "p-56", serialNum: 56, militaryId: "82056", corps: "\u0625\u0645\u062F\u0627\u062F \u0648\u062A\u0645\u0648\u064A\u0646", rank: "\u0645\u0633\u0627\u0639\u062F", category: "other_ranks", forceType: "support", name: "\u0645\u062D\u0645\u0648\u062F \u0623\u062D\u0645\u062F \u0645\u062D\u0649", age: 33, weight: 87, height: 180 },
  { id: "p-57", serialNum: 57, militaryId: "82057", corps: "\u0645\u062F\u0641\u0639\u064A\u0629", rank: "\u0645\u0633\u0627\u0639\u062F \u0623", category: "other_ranks", forceType: "combat", name: "\u0633\u0627\u0645\u062D \u0641\u0627\u0631\u0648\u0642 \u0627\u0644\u0633\u064A\u062F", age: 36, weight: 90, height: 182 },
  { id: "p-58", serialNum: 58, militaryId: "82058", corps: "\u0645\u0634\u0627\u0629", rank: "\u0631\u0642\u064A\u0628", category: "other_ranks", forceType: "combat", name: "\u0639\u0645\u0631\u0648 \u0639\u0628\u062F \u0627\u0644\u0628\u0635\u064A\u0631 \u0641\u062A\u062D\u0649", age: 25, weight: 87, height: 175 }
];
function generateSeedAssessments() {
  const results = [];
  for (const person of INITIAL_PERSONNEL) {
    const st = resolveStageForAge(person.age, DEFAULT_SCORING_SETTINGS);
    const seed = person.serialNum;
    const p1Ratio = 0.68 + seed * 7 % 28 / 100;
    const p1SuburbCode = Math.max(1, Math.min(8, 1 + seed * 3 % 7));
    results.push({
      periodId: "period-2025-nov",
      personId: person.id,
      stageOverride: null,
      pullupsCount: Math.max(1, Math.round(st.pullupsMax * p1Ratio)),
      pushupsCount: Math.max(5, Math.round(st.pushupsMax * (p1Ratio + 0.03))),
      situpsCount: Math.max(8, Math.round(st.situpsMax * (p1Ratio + 0.02))),
      runCount: Math.max(8, Math.round(st.runMax * p1Ratio)),
      suburbTimeCode: seed === 17 ? 12 : p1SuburbCode,
      suburbMin: 21 + Math.floor(p1SuburbCode / 2),
      suburbSec: p1SuburbCode % 2 * 30,
      obstacleMin: 2,
      obstacleSec: 15 + seed % 35,
      marchHours: 2,
      marchMin: 20 + seed % 25,
      sprint100m: 13.2 + seed % 5 * 0.4,
      colleagueCarry: 18 + seed % 7,
      zigzagRun: 14.5 + seed % 6 * 0.3,
      longJump: 3.8 + seed % 5 * 0.2,
      grenadeThrow: 35 + seed % 12,
      attendanceStatus: seed === 17 ? "medical" : "tested",
      exercisesNotes: seed === 17 ? "\u0625\u0639\u0641\u0627\u0621 \u0637\u0628\u064A \u0645\u0624\u0642\u062A" : "\u0623\u062F\u0627\u0621 \u0645\u0646\u062A\u0638\u0645",
      suburbNotes: seed === 17 ? "\u0645\u0648\u0642\u0641 \u0637\u0628\u0649" : ""
    });
    const delta2 = seed * 5 % 13 - 3;
    const p2Ratio = Math.min(1, Math.max(0.55, p1Ratio + delta2 / 100));
    const p2SuburbCode = Math.max(
      1,
      Math.min(9, p1SuburbCode - (delta2 > 2 ? 1 : delta2 < -1 ? -1 : 0))
    );
    results.push({
      periodId: "period-2026-feb",
      personId: person.id,
      stageOverride: null,
      pullupsCount: Math.max(1, Math.round(st.pullupsMax * p2Ratio)),
      pushupsCount: Math.max(6, Math.round(st.pushupsMax * (p2Ratio + 0.04))),
      situpsCount: Math.max(10, Math.round(st.situpsMax * (p2Ratio + 0.03))),
      runCount: Math.max(10, Math.round(st.runMax * (p2Ratio + 0.02))),
      suburbTimeCode: seed === 17 ? 12 : seed === 36 ? 11 : p2SuburbCode,
      suburbMin: 21 + Math.floor(p2SuburbCode / 2),
      suburbSec: p2SuburbCode % 2 * 30,
      obstacleMin: 2,
      obstacleSec: 10 + seed % 30,
      marchHours: 2,
      marchMin: 15 + seed % 20,
      sprint100m: Number((12.9 + seed % 5 * 0.35).toFixed(1)),
      colleagueCarry: 17 + seed % 6,
      zigzagRun: Number((14.1 + seed % 6 * 0.25).toFixed(1)),
      longJump: Number((4 + seed % 5 * 0.2).toFixed(1)),
      grenadeThrow: 37 + seed % 12,
      attendanceStatus: seed === 17 ? "medical" : "tested",
      exercisesNotes: p2Ratio >= 0.9 ? "\u0645\u0633\u062A\u0648\u0649 \u0645\u062A\u0645\u064A\u0632" : seed === 17 ? "\u0645\u0648\u0642\u0641 \u0637\u0628\u0649" : "\u0644\u0627\u0626\u0642 \u0628\u062F\u0646\u064A\u064B\u0627",
      suburbNotes: seed === 36 ? "\u062E\u0627\u0631\u062C \u0627\u0644\u0632\u0645\u0646 \u0627\u0644\u0645\u062D\u062F\u062F" : seed === 17 ? "\u0645\u0648\u0642\u0641 \u0637\u0628\u0649" : "\u0636\u0645\u0646 \u0627\u0644\u0632\u0645\u0646 \u0627\u0644\u0642\u064A\u0627\u0633\u064A"
    });
    const delta3 = seed * 11 % 11 - 2;
    const p3Ratio = Math.min(1, Math.max(0.6, p2Ratio + delta3 / 100));
    const p3SuburbCode = Math.max(
      1,
      Math.min(8, p2SuburbCode - (delta3 > 3 ? 1 : 0))
    );
    results.push({
      periodId: "period-2026-may",
      personId: person.id,
      stageOverride: null,
      pullupsCount: Math.max(2, Math.round(st.pullupsMax * p3Ratio)),
      pushupsCount: Math.max(8, Math.round(st.pushupsMax * (p3Ratio + 0.04))),
      situpsCount: Math.max(12, Math.round(st.situpsMax * (p3Ratio + 0.04))),
      runCount: Math.max(12, Math.round(st.runMax * (p3Ratio + 0.03))),
      suburbTimeCode: seed === 17 ? 12 : p3SuburbCode,
      suburbMin: 21 + Math.floor(p3SuburbCode / 2),
      suburbSec: p3SuburbCode % 2 * 30,
      obstacleMin: 2,
      obstacleSec: 8 + seed % 28,
      marchHours: 2,
      marchMin: 12 + seed % 18,
      sprint100m: Number((12.7 + seed % 5 * 0.3).toFixed(1)),
      colleagueCarry: 16 + seed % 6,
      zigzagRun: Number((13.8 + seed % 6 * 0.25).toFixed(1)),
      longJump: Number((4.1 + seed % 5 * 0.2).toFixed(1)),
      grenadeThrow: 38 + seed % 12,
      attendanceStatus: seed === 17 ? "medical" : "tested",
      exercisesNotes: p3Ratio >= 0.92 ? "\u062A\u0641\u0648\u0642 \u0628\u062F\u0646\u064A" : "\u062A\u0637\u0648\u0631 \u0645\u0644\u062D\u0648\u0638",
      suburbNotes: seed === 17 ? "\u0645\u0648\u0642\u0641 \u0637\u0628\u0649" : "\u0627\u062C\u062A\u064A\u0627\u0632 \u0628\u0646\u062C\u0627\u062D"
    });
  }
  return results;
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
function resolveWritableDataDir() {
  const localDir = path.join(__dirname, "data");
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    fs.accessSync(localDir, fs.constants.W_OK);
    return localDir;
  } catch {
    const tmpDir = path.join(os.tmpdir(), "military_fitness_data");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }
}
var DATA_DIR = resolveWritableDataDir();
var DB_PATH = path.join(DATA_DIR, "military_fitness.sqlite");
var db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
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
  const existingSettings = db.prepare("SELECT id FROM settings WHERE id = 1").get();
  if (existingSettings && !forceReset) {
    return;
  }
  const seedTx = db.transaction(() => {
    if (forceReset) {
      db.prepare("DELETE FROM assessments").run();
      db.prepare("DELETE FROM personnel").run();
      db.prepare("DELETE FROM periods").run();
      db.prepare("DELETE FROM settings").run();
    }
    db.prepare(
      "INSERT OR REPLACE INTO settings (id, json_data, updated_at) VALUES (1, ?, ?)"
    ).run(JSON.stringify(DEFAULT_SCORING_SETTINGS), (/* @__PURE__ */ new Date()).toISOString());
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
        stageOverride: a.stageOverride ?? null
      });
    }
  });
  seedTx();
}
function wipeDatabaseToCleanState() {
  const wipeTx = db.transaction(() => {
    db.prepare("DELETE FROM assessments").run();
    db.prepare("DELETE FROM personnel").run();
    db.prepare("DELETE FROM periods").run();
    db.prepare("DELETE FROM settings").run();
    db.prepare(
      "INSERT OR REPLACE INTO settings (id, json_data, updated_at) VALUES (1, ?, ?)"
    ).run(JSON.stringify(DEFAULT_SCORING_SETTINGS), (/* @__PURE__ */ new Date()).toISOString());
    const initialPeriod = {
      id: "period-clean-2026",
      name: "\u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u062A\u062F\u0631\u064A\u0628\u064A\u0629 \u0627\u0644\u0623\u0648\u0644\u0649",
      date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      beneficiary: "\u0641\u0631\u0639 \u0627\u0644\u062A\u0631\u0628\u064A\u0629 \u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0629 - \u0647\u064A\u0626\u0629 \u062A\u062F\u0631\u064A\u0628 \u0627\u0644\u0642\u0648\u0627\u062A \u0627\u0644\u0645\u0633\u0644\u062D\u0629",
      unitName: "\u0627\u0644\u0644\u0648\u0627\u0621 \u0627\u0644\u0623\u0648\u0644 \u0627\u0644\u0645\u0634\u0627\u0629 \u0627\u0644\u0645\u064A\u0643\u0627\u0646\u064A\u0643\u064A",
      notes: "\u0641\u062A\u0631\u0629 \u062A\u062F\u0631\u064A\u0628\u064A\u0629 \u062C\u062F\u064A\u062F\u0629 \u0641\u0627\u0631\u063A\u0629 \u062C\u0627\u0647\u0632\u0629 \u0644\u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0627\u0633\u062A\u064A\u0631\u0627\u062F \u0643\u0634\u0648\u0641 \u0627\u0644\u0625\u0643\u0633\u0644",
      sortOrder: 1
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
  const settingsRow = db.prepare("SELECT json_data, updated_at FROM settings WHERE id = 1").get();
  const settings = settingsRow ? JSON.parse(settingsRow.json_data) : DEFAULT_SCORING_SETTINGS;
  const periodRows = db.prepare("SELECT * FROM periods ORDER BY date ASC, sort_order ASC").all();
  const periods = periodRows.map((r) => ({
    id: r.id,
    name: r.name,
    date: r.date,
    beneficiary: r.beneficiary,
    unitName: r.unit_name,
    notes: r.notes
  }));
  const personnelRows = db.prepare("SELECT * FROM personnel ORDER BY serial_num ASC").all();
  const personnel = personnelRows.map((r) => ({
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
    height: r.height
  }));
  const assessmentRows = db.prepare("SELECT * FROM assessments").all();
  const assessmentsByPeriod = {};
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
      suburbNotes: r.suburb_notes
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
      engine: "SQLite 3 (better-sqlite3 WAL)",
      filePath: "data/military_fitness.sqlite",
      sizeBytes: dbSizeBytes,
      totalPersonnel: personnel.length,
      totalPeriods: periods.length,
      totalAssessments: assessmentRows.length,
      lastUpdated: settingsRow?.updated_at || (/* @__PURE__ */ new Date()).toISOString()
    }
  };
}
async function startServer() {
  const app = express();
  app.use(express.json({ limit: "15mb" }));
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      engine: "SQLite 3 (better-sqlite3 WAL)",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.get("/api/state", (_req, res) => {
    try {
      res.json(readFullDatabaseState());
    } catch (error) {
      res.status(500).json({ error: error.message || "Failed to read SQLite state" });
    }
  });
  app.put("/api/settings", (req, res) => {
    try {
      const settings = req.body;
      db.prepare(
        "INSERT OR REPLACE INTO settings (id, json_data, updated_at) VALUES (1, ?, ?)"
      ).run(JSON.stringify(settings), (/* @__PURE__ */ new Date()).toISOString());
      res.json(readFullDatabaseState());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/periods", (req, res) => {
    try {
      const { name, date, beneficiary, unitName, notes, copyFromPeriodId } = req.body;
      const id = `period-${Date.now()}`;
      const countRow = db.prepare("SELECT COUNT(*) as cnt FROM periods").get();
      const tx = db.transaction(() => {
        db.prepare(`
          INSERT INTO periods (id, name, date, beneficiary, unit_name, notes, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          name || "\u0641\u062A\u0631\u0629 \u0627\u062E\u062A\u0628\u0627\u0631 \u062C\u062F\u064A\u062F\u0629",
          date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
          beneficiary || "\u0647\u064A\u0626\u0629 \u062A\u062F\u0631\u064A\u0628 \u0627\u0644\u0642\u0648\u0627\u062A \u0627\u0644\u0645\u0633\u0644\u062D\u0629",
          unitName || "\u0627\u0644\u0644\u0648\u0627\u0621 \u0627\u0644\u0623\u0648\u0644 \u0627\u0644\u0645\u0634\u0627\u0629 \u0627\u0644\u0645\u064A\u0643\u0627\u0646\u064A\u0643\u064A",
          notes || "",
          countRow.cnt + 1
        );
        const allPersonnel = db.prepare("SELECT id FROM personnel").all();
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
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/periods/import-excel", (req, res) => {
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
        targetPeriodId
      } = req.body;
      if (!Array.isArray(personnel) || personnel.length === 0) {
        return res.status(400).json({ error: "\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u0639\u062B\u0648\u0631 \u0639\u0644\u0649 \u0623\u0641\u0631\u0627\u062F \u0635\u0627\u0644\u062D\u064A\u0646 \u0644\u0644\u0627\u0633\u062A\u064A\u0631\u0627\u062F" });
      }
      let activePeriodId = targetPeriodId;
      const importTx = db.transaction(() => {
        if (isNewPeriod || !activePeriodId) {
          activePeriodId = `period-${Date.now()}`;
          const countRow = db.prepare("SELECT COUNT(*) as cnt FROM periods").get();
          db.prepare(`
            INSERT INTO periods (id, name, date, beneficiary, unit_name, notes, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            activePeriodId,
            periodName || `\u0641\u062A\u0631\u0629 \u0627\u062E\u062A\u0628\u0627\u0631 - ${periodDate || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}`,
            periodDate || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
            beneficiary || "\u0641\u0631\u0639 \u0627\u0644\u062A\u0631\u0628\u064A\u0629 \u0627\u0644\u0631\u064A\u0627\u0636\u064A\u0629 - \u0647\u064A\u0626\u0629 \u0627\u0644\u062A\u062F\u0631\u064A\u0628",
            unitName || "\u0627\u0644\u0644\u0648\u0627\u0621 \u0627\u0644\u0623\u0648\u0644 \u0627\u0644\u0645\u0634\u0627\u0629 \u0627\u0644\u0645\u064A\u0643\u0627\u0646\u064A\u0643\u064A",
            notes || "\u0645\u0633\u062A\u0648\u0631\u062F\u0629 \u0645\u0646 \u0643\u0634\u0641 \u0625\u0643\u0633\u0644",
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
            militaryId: p.militaryId || "",
            corps: p.corps || "\u0645\u0634\u0627\u0629",
            rank: p.rank || "\u0646\u0642\u064A\u0628",
            category: p.category || "officers",
            forceType: p.forceType || "combat",
            name: p.name || "\u0641\u0631\u062F",
            age: Number(p.age) || 30,
            weight: p.weight !== null && p.weight !== void 0 ? Number(p.weight) : null,
            height: p.height !== null && p.height !== void 0 ? Number(p.height) : null
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
              suburbMin: a.suburbMin !== null && a.suburbMin !== void 0 ? Number(a.suburbMin) : null,
              suburbSec: a.suburbSec !== null && a.suburbSec !== void 0 ? Number(a.suburbSec) : null,
              obstacleMin: a.obstacleMin !== null && a.obstacleMin !== void 0 ? Number(a.obstacleMin) : null,
              obstacleSec: a.obstacleSec !== null && a.obstacleSec !== void 0 ? Number(a.obstacleSec) : null,
              marchHours: a.marchHours !== null && a.marchHours !== void 0 ? Number(a.marchHours) : null,
              marchMin: a.marchMin !== null && a.marchMin !== void 0 ? Number(a.marchMin) : null,
              sprint100m: a.sprint100m !== null && a.sprint100m !== void 0 ? Number(a.sprint100m) : null,
              colleagueCarry: a.colleagueCarry !== null && a.colleagueCarry !== void 0 ? Number(a.colleagueCarry) : null,
              zigzagRun: a.zigzagRun !== null && a.zigzagRun !== void 0 ? Number(a.zigzagRun) : null,
              longJump: a.longJump !== null && a.longJump !== void 0 ? Number(a.longJump) : null,
              grenadeThrow: a.grenadeThrow !== null && a.grenadeThrow !== void 0 ? Number(a.grenadeThrow) : null,
              attendanceStatus: a.attendanceStatus || "not_tested",
              exercisesNotes: a.exercisesNotes || "",
              suburbNotes: a.suburbNotes || ""
            });
          }
        }
      });
      importTx();
      res.json({ newPeriodId: activePeriodId, state: readFullDatabaseState() });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.put("/api/periods/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, date, beneficiary, unitName, notes } = req.body;
      db.prepare(`
        UPDATE periods
        SET name = ?, date = ?, beneficiary = ?, unit_name = ?, notes = ?
        WHERE id = ?
      `).run(name, date, beneficiary, unitName, notes, id);
      res.json(readFullDatabaseState());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.delete("/api/periods/:id", (req, res) => {
    try {
      const { id } = req.params;
      const countRow = db.prepare("SELECT COUNT(*) as cnt FROM periods").get();
      if (countRow.cnt <= 1) {
        return res.status(400).json({ error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u0648\u062D\u064A\u062F\u0629 \u0627\u0644\u0645\u062A\u0628\u0642\u064A\u0629" });
      }
      db.prepare("DELETE FROM periods WHERE id = ?").run(id);
      res.json(readFullDatabaseState());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/periods/:id/clear-scores", (req, res) => {
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
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/personnel", (req, res) => {
    try {
      const p = req.body;
      const maxSerial = db.prepare("SELECT COALESCE(MAX(serial_num), 0) as maxS FROM personnel").get();
      const id = p.id || `p-${Date.now()}`;
      const serialNum = p.serialNum || maxSerial.maxS + 1;
      db.prepare(`
        INSERT INTO personnel (id, serial_num, military_id, corps, rank, category, force_type, name, age, weight, height)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        serialNum,
        p.militaryId || `${41e3 + serialNum}`,
        p.corps || "\u0645\u0634\u0627\u0629",
        p.rank || "\u0646\u0642\u064A\u0628",
        p.category || "officers",
        p.forceType || "combat",
        p.name || "\u0641\u0631\u062F \u062C\u062F\u064A\u062F",
        Number(p.age) || 30,
        p.weight !== void 0 && p.weight !== null ? Number(p.weight) : null,
        p.height !== void 0 && p.height !== null ? Number(p.height) : null
      );
      res.json({
        newPersonId: id,
        person: {
          id,
          serialNum,
          militaryId: p.militaryId || `${41e3 + serialNum}`,
          corps: p.corps || "\u0645\u0634\u0627\u0629",
          rank: p.rank || "\u0646\u0642\u064A\u0628",
          category: p.category || "officers",
          forceType: p.forceType || "combat",
          name: p.name || "\u0641\u0631\u062F \u062C\u062F\u064A\u062F",
          age: Number(p.age) || 30,
          weight: p.weight !== void 0 && p.weight !== null ? Number(p.weight) : null,
          height: p.height !== void 0 && p.height !== null ? Number(p.height) : null
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.put("/api/personnel/:id", (req, res) => {
    try {
      const { id } = req.params;
      const p = req.body;
      db.prepare(`
        UPDATE personnel
        SET serial_num = ?, military_id = ?, corps = ?, rank = ?, category = ?,
            force_type = ?, name = ?, age = ?, weight = ?, height = ?
        WHERE id = ?
      `).run(
        Number(p.serialNum) || 1,
        p.militaryId || "",
        p.corps || "",
        p.rank || "",
        p.category || "officers",
        p.forceType || "combat",
        p.name || "",
        Number(p.age) || 30,
        p.weight !== null && p.weight !== void 0 ? Number(p.weight) : null,
        p.height !== null && p.height !== void 0 ? Number(p.height) : null,
        id
      );
      res.json({ success: true, person: p });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.delete("/api/personnel/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM personnel WHERE id = ?").run(id);
      res.json({ success: true, deletedId: id });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.put("/api/assessments/:periodId/:personId", (req, res) => {
    try {
      const { periodId, personId } = req.params;
      const a = req.body;
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
        a.attendanceStatus || "tested",
        a.exercisesNotes || "",
        a.suburbNotes || ""
      );
      res.json({ success: true, periodId, personId });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.get("/api/database/download-sqlite", (_req, res) => {
    try {
      db.pragma("wal_checkpoint(FULL)");
      res.download(DB_PATH, "military_fitness_database.sqlite");
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/database/reset", (_req, res) => {
    try {
      wipeDatabaseToCleanState();
      res.json(readFullDatabaseState());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/database/import-json", (req, res) => {
    try {
      const { settings, periods, personnel, assessmentsByPeriod } = req.body;
      if (!Array.isArray(periods) || !Array.isArray(personnel)) {
        return res.status(400).json({ error: "\u0645\u0644\u0641 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D" });
      }
      const restoreTx = db.transaction(() => {
        db.prepare("DELETE FROM assessments").run();
        db.prepare("DELETE FROM personnel").run();
        db.prepare("DELETE FROM periods").run();
        if (settings) {
          db.prepare(
            "INSERT OR REPLACE INTO settings (id, json_data, updated_at) VALUES (1, ?, ?)"
          ).run(JSON.stringify(settings), (/* @__PURE__ */ new Date()).toISOString());
        }
        const insertPeriod = db.prepare(`
          INSERT INTO periods (id, name, date, beneficiary, unit_name, notes, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        periods.forEach((p, idx) => {
          insertPeriod.run(
            p.id,
            p.name,
            p.date,
            p.beneficiary || "",
            p.unitName || "",
            p.notes || "",
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
            p.militaryId || "",
            p.corps || "",
            p.rank || "",
            p.category || "officers",
            p.forceType || "combat",
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
              personMap
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
                a.attendanceStatus || "not_tested",
                a.exercisesNotes || "",
                a.suburbNotes || ""
              );
            }
          }
        }
      });
      restoreTx();
      res.json(readFullDatabaseState());
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  const BACKUPS_DIR = path.join(DATA_DIR, "backups");
  if (!fs.existsSync(BACKUPS_DIR)) {
    try {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    } catch {
    }
  }
  function compareVersions(v1, v2) {
    const p1 = v1.split(".").map((n) => parseInt(n, 10) || 0);
    const p2 = v2.split(".").map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const num1 = p1[i] || 0;
      const num2 = p2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }
  app.get("/api/system/info", (_req, res) => {
    try {
      const stats = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH) : null;
      const personnelCount = db.prepare("SELECT COUNT(*) as count FROM personnel").get().count;
      const periodsCount = db.prepare("SELECT COUNT(*) as count FROM periods").get().count;
      const assessmentsCount = db.prepare("SELECT COUNT(*) as count FROM assessments").get().count;
      res.json({
        version: "2.2.0",
        edition: "Military Pro Edition (\u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0639\u0633\u0643\u0631\u064A\u0629 \u0627\u0644\u0627\u062D\u062A\u0631\u0627\u0641\u064A\u0629)",
        appName: "\u0645\u0646\u0638\u0648\u0645\u0629 \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0648\u0627\u0644\u0644\u064A\u0627\u0642\u0629 \u0627\u0644\u0628\u062F\u0646\u064A\u0629 \u0644\u0644\u0642\u0648\u0627\u062A \u0627\u0644\u0645\u0633\u0644\u062D\u0629",
        commander: "\u0627\u0644\u0633\u064A\u062F \u0627\u0644\u0642\u0627\u0626\u062F / \u0645\u062D\u0645\u062F \u0639\u0628\u062F\u0647 \u0631\u0645\u0636\u0627\u0646",
        institution: "\u0627\u0644\u0643\u0644\u064A\u0629 \u0627\u0644\u062D\u0631\u0628\u064A\u0629 \u0627\u0644\u0645\u0635\u0631\u064A\u0629 - \u0645\u0635\u0646\u0639 \u0627\u0644\u0631\u062C\u0627\u0644 \u0648\u0639\u0631\u064A\u0646 \u0627\u0644\u0623\u0628\u0637\u0627\u0644",
        motto: "\u0627\u0644\u0648\u0627\u062C\u0628 \xB7 \u0627\u0644\u0634\u0631\u0641 \xB7 \u0627\u0644\u0648\u0637\u0646",
        author: "\u0645\u0637\u0648\u0631 \u0648\u0645\u0628\u0631\u0645\u062C \u0627\u0644\u0645\u0646\u0638\u0648\u0645\u0629 (Ahm3d0x)",
        repo: "Ahm3d0x/Performance-Tracker-Pro",
        repoUrl: "https://github.com/Ahm3d0x/Performance-Tracker-Pro",
        dbPath: DB_PATH,
        dbSizeBytes: stats ? stats.size : 0,
        personnelCount,
        periodsCount,
        assessmentsCount,
        lastUpdated: stats ? stats.mtime.toISOString() : (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.get("/api/system/check-updates", async (_req, res) => {
    const currentVersion = "2.2.0";
    const repoUrl = "https://github.com/Ahm3d0x/Performance-Tracker-Pro";
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4e3);
      const response = await fetch(
        "https://raw.githubusercontent.com/Ahm3d0x/Performance-Tracker-Pro/main/package.json",
        {
          headers: { "User-Agent": "Performance-Tracker-Pro-Client" },
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);
      if (response.ok) {
        const remotePkg = await response.json();
        const remoteVersion = remotePkg.version || currentVersion;
        const hasUpdate = compareVersions(remoteVersion, currentVersion) > 0;
        res.json({
          online: true,
          hasUpdate,
          currentVersion,
          latestVersion: remoteVersion,
          repoUrl,
          checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
          message: hasUpdate ? `\u064A\u0648\u062C\u062F \u0625\u0635\u062F\u0627\u0631 \u0623\u062D\u062F\u062B \u0645\u062A\u0648\u0641\u0631 \u0627\u0644\u0622\u0646 (${remoteVersion}) \u0645\u0646 \u062E\u0627\u062F\u0645 \u0627\u0644\u062A\u062D\u062F\u064A\u062B\u0627\u062A \u0627\u0644\u0631\u0633\u0645\u064A!` : "\u0627\u0644\u0645\u0646\u0638\u0648\u0645\u0629 \u0645\u062D\u062F\u062B\u0629 \u0644\u0623\u062D\u062F\u062B \u0625\u0635\u062F\u0627\u0631 \u0631\u0633\u0645\u064A \u0645\u0645\u062A\u0627\u0632."
        });
      } else {
        res.json({
          online: false,
          hasUpdate: false,
          currentVersion,
          latestVersion: currentVersion,
          repoUrl,
          checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
          message: "\u062A\u0639\u0630\u0631 \u062C\u0644\u0628 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u062D\u062F\u064A\u062B \u0645\u0646 \u0627\u0644\u062E\u0627\u062F\u0645 \u0627\u0644\u0645\u0631\u0643\u0632\u064A."
        });
      }
    } catch {
      res.json({
        online: false,
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        repoUrl,
        checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
        message: "\u0648\u0636\u0639 \u063A\u064A\u0631 \u0645\u062A\u0635\u0644 \u0628\u0627\u0644\u0625\u0646\u062A\u0631\u0646\u062A (Offline Mode). \u0627\u0644\u0645\u0646\u0638\u0648\u0645\u0629 \u062A\u0639\u0645\u0644 \u0645\u062D\u0644\u064A\u0627\u064B \u0628\u0643\u0627\u0645\u0644 \u0637\u0627\u0642\u062A\u0647\u0627."
      });
    }
  });
  app.post("/api/system/create-backup", (_req, res) => {
    try {
      if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      }
      db.pragma("wal_checkpoint(FULL)");
      const now = /* @__PURE__ */ new Date();
      const dateStr = now.toISOString().replace(/:/g, "-").replace(/\..+/, "").replace("T", "_");
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
        message: "\u062A\u0645 \u062D\u0641\u0638 \u0646\u0633\u062E\u0629 \u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u0622\u0645\u0646\u0629 \u0644\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0628\u0646\u062C\u0627\u062D \u0642\u0628\u0644 \u0627\u0644\u062A\u062D\u062F\u064A\u062B."
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.get("/api/system/backups", (_req, res) => {
    try {
      if (!fs.existsSync(BACKUPS_DIR)) {
        return res.json({ backups: [] });
      }
      const files = fs.readdirSync(BACKUPS_DIR);
      const backups = files.filter((f) => f.endsWith(".sqlite")).map((fileName) => {
        const filePath = path.join(BACKUPS_DIR, fileName);
        const stat = fs.statSync(filePath);
        return {
          fileName,
          sizeBytes: stat.size,
          createdAt: stat.mtime.toISOString()
        };
      }).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      res.json({ backups });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/system/restore-backup", (req, res) => {
    try {
      const { fileName } = req.body;
      if (!fileName || typeof fileName !== "string") {
        return res.status(400).json({ error: "\u0627\u0633\u0645 \u0645\u0644\u0641 \u0627\u0644\u0646\u0633\u062E\u0629 \u063A\u064A\u0631 \u0645\u062D\u062F\u062F" });
      }
      const backupFilePath = path.join(BACKUPS_DIR, path.basename(fileName));
      if (!fs.existsSync(backupFilePath)) {
        return res.status(404).json({ error: "\u0645\u0644\u0641 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      }
      const safetyName = `safety_before_restore_${Date.now()}.sqlite`;
      fs.copyFileSync(DB_PATH, path.join(BACKUPS_DIR, safetyName));
      db.pragma("wal_checkpoint(FULL)");
      fs.copyFileSync(backupFilePath, DB_PATH);
      res.json({
        success: true,
        message: `\u062A\u0645 \u0627\u0633\u062A\u0631\u062C\u0627\u0639 \u0627\u0644\u0646\u0633\u062E\u0629 \u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637\u064A\u0629 (${fileName}) \u0628\u0646\u062C\u0627\u062D \u062A\u0627\u0645!`,
        state: readFullDatabaseState()
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  const PORT = Number(process.env.PORT) || 3e3;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
