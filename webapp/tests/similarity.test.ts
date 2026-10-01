import { test } from "node:test";
import assert from "node:assert/strict";
import { similarityPercent } from "../src/lib/similarity";

test("identical names score 100", () => {
  assert.equal(similarityPercent("Anthony Girls School", "Anthony Girls School"), 100);
});

test("case / punctuation / whitespace insensitive", () => {
  assert.equal(similarityPercent("Anthony Girls School", "anthony   girls, SCHOOL!"), 100);
});

test("near-miss typo scores >= 80 (catches real duplicates)", () => {
  const score = similarityPercent("Anthony Girls Secondary School", "Anthony Girls Secondary Schl");
  assert.ok(score >= 80, `expected >= 80, got ${score}`);
});

test("different schools score low", () => {
  const score = similarityPercent("Anthony Girls School", "Command Day Secondary");
  assert.ok(score < 50, `expected < 50, got ${score}`);
});

test("empty input scores 0", () => {
  assert.equal(similarityPercent("", "Anything"), 0);
  assert.equal(similarityPercent("Anything", ""), 0);
});

test("is symmetric", () => {
  const a = similarityPercent("Greenfield Academy", "Greenfeld Acadmy");
  const b = similarityPercent("Greenfeld Acadmy", "Greenfield Academy");
  assert.equal(a, b);
});
