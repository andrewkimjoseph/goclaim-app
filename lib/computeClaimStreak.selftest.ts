/**
 * Manual checks for computeClaimStreak (no test runner in package.json).
 * Run: npx tsx lib/computeClaimStreak.selftest.ts
 */
import {
  computeClaimStreak,
  toLocalDateKey,
} from "./computeClaimStreak";

function assertEqual(actual: number, expected: number, label: string) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
  console.log(`ok  ${label}`);
}

const tz = "Africa/Nairobi";
const bridge = new Set(["2026-08-23"]);

// Success Mon + Wed, bridge Tue, viewing Wed → 3
{
  const now = new Date("2026-08-24T15:00:00.000Z");
  const successes = [
    new Date("2026-08-22T15:00:00.000Z"),
    new Date("2026-08-24T00:21:00.000Z"),
  ];
  assertEqual(
    computeClaimStreak(successes, tz, now, bridge),
    3,
    "bridge fills Aug 23 between Aug 22 and Aug 24"
  );
}

// Success Mon + Wed, no bridge → 1 when viewing Wed
{
  const now = new Date("2026-08-24T15:00:00.000Z");
  const successes = [
    new Date("2026-08-22T15:00:00.000Z"),
    new Date("2026-08-24T00:21:00.000Z"),
  ];
  assertEqual(
    computeClaimStreak(successes, tz, now, new Set()),
    1,
    "without bridge, Aug 23 gap resets streak to 1"
  );
}

// Only Aug 24 success + bridge → still 1 (do not inflate)
{
  const now = new Date("2026-08-24T15:00:00.000Z");
  const successes = [new Date("2026-08-24T00:21:00.000Z")];
  assertEqual(
    computeClaimStreak(successes, tz, now, bridge),
    1,
    "bridge alone does not inflate streak without prior success"
  );
}

console.log(`sample local key: ${toLocalDateKey(new Date("2026-08-23T12:00:00Z"), tz)}`);

const emptyBridge = new Set<string>();

// Last success yesterday, pause today → same streak (2)
{
  const now = new Date("2026-09-04T15:00:00.000Z");
  const successes = [
    new Date("2026-09-02T15:00:00.000Z"),
    new Date("2026-09-03T15:00:00.000Z"),
  ];
  const pause = new Set(["2026-09-04"]);
  assertEqual(
    computeClaimStreak(successes, tz, now, emptyBridge, pause),
    2,
    "pause today keeps yesterday's streak"
  );
}

// Multi-day pause, still paused → same streak
{
  const now = new Date("2026-09-05T15:00:00.000Z");
  const successes = [
    new Date("2026-09-02T15:00:00.000Z"),
    new Date("2026-09-03T15:00:00.000Z"),
  ];
  const pause = new Set(["2026-09-04", "2026-09-05"]);
  assertEqual(
    computeClaimStreak(successes, tz, now, emptyBridge, pause),
    2,
    "multi-day pause keeps last success streak"
  );
}

// Multi-day pause then success → previous streak + 1
{
  const now = new Date("2026-09-06T15:00:00.000Z");
  const successes = [
    new Date("2026-09-02T15:00:00.000Z"),
    new Date("2026-09-03T15:00:00.000Z"),
    new Date("2026-09-06T15:00:00.000Z"),
  ];
  const pause = new Set(["2026-09-04", "2026-09-05"]);
  assertEqual(
    computeClaimStreak(successes, tz, now, emptyBridge, pause),
    3,
    "success after pause is last streak + 1"
  );
}

// Missed day with no pause → 0
{
  const now = new Date("2026-09-05T15:00:00.000Z");
  const successes = [new Date("2026-09-03T15:00:00.000Z")];
  assertEqual(
    computeClaimStreak(successes, tz, now, emptyBridge),
    0,
    "missed day without pause resets streak"
  );
}

// Pause with no successes ever → 0
{
  const now = new Date("2026-09-04T15:00:00.000Z");
  const pause = new Set(["2026-09-04"]);
  assertEqual(
    computeClaimStreak([], tz, now, emptyBridge, pause),
    0,
    "pause does not create a streak without successes"
  );
}

console.log("all streak selftests passed");
