import { describe, test } from "@jest/globals";
import assert from "assert";
import { orderedRandItems, randomSum } from "./data/random";

const rand = require("random-seed").create("sum-test");
const list = new Array(100).fill(0).map((_, i) => i);

describe("randomSum", () => {
  test("Should create an array", () => {
    let out = randomSum(rand, 100, 10);
    assert(Array.isArray(out), "Should be an array");
    assert.equal(out.length, 10, "Should be 10 items");

    out = randomSum(rand, 100, 1);
    assert(Array.isArray(out), "Should be an array");
    assert.equal(out.length, 1, "Should be 1 item");

    out = randomSum(rand, 100, 0);
    assert(Array.isArray(out), "Should be an array");
    assert.equal(out.length, 0, "Should be 1 item");

    out = randomSum(rand, 100, 100);
    assert(Array.isArray(out), "Should be an array");
    assert.equal(out.length, 100, "Should be 100 items");

    out = randomSum(rand, 100, 101);
    assert(Array.isArray(out), "Should be an array");
    assert.equal(out.length, 101, "Should be 101 items");

    out = randomSum(rand, 100, 1000);
    assert(Array.isArray(out), "Should be an array");
    assert.equal(out.length, 1000, "Should be 1000 items");
  });

  test("Should sum to 100", () => {
    let test = randomSum(rand, 100, 10);
    let sum = test.reduce((a, b) => a + b, 0);
    assert(sum === 100, "10 elements shold sum to 100");

    test = randomSum(rand, 100, 100);
    sum = test.reduce((a, b) => a + b, 0);
    assert(sum === 100, "100 elements should sum to 100");

    test = randomSum(rand, 100, 1);
    sum = test.reduce((a, b) => a + b, 0);
    assert.equal(sum, 100, "One element should sum to 100");

    test = randomSum(rand, 100, 0);
    sum = test.reduce((a, b) => a + b, 0);
    assert.equal(sum, 0, "Zero elements should sum to 0");

    test = randomSum(rand, 100, 101);
    sum = test.reduce((a, b) => a + b, 0);
    assert.equal(sum, 100, "101 elements should equal 100 still");

    test = randomSum(rand, 100, 1000);
    sum = test.reduce((a, b) => a + b, 0);
    assert.equal(sum, 100, "1000 elements should equal 100 still");
  });
});

describe("exclusiveRandItems", () => {
  test("Should return an array", () => {
    let test = orderedRandItems(rand, list, 10);
    assert(Array.isArray(test), "Should be an array");
    assert.equal(test.length, 10, "Should be 10 items");

    test = orderedRandItems(rand, list, 1);
    assert(Array.isArray(test), "Should be an array");
    assert.equal(test.length, 1, "Should be 1 item");

    test = orderedRandItems(rand, list, 0);
    assert(Array.isArray(test), "Should be an array");
    assert.equal(test.length, 0, "Should be 0 items");

    test = orderedRandItems(rand, list, -1);
    assert(Array.isArray(test), "Should be an array");
    assert.equal(test.length, 0, "Should be 0 items from negative value");

    test = orderedRandItems(rand, list, 100);
    assert(Array.isArray(test), "Should be an array");
    assert.equal(test.length, 100, "Should be 100 items from 100 count");

    test = orderedRandItems(rand, list, 101);
    assert(Array.isArray(test), "Should be an array");
    assert.equal(test.length, 100, "Should be 100 items from 101 count");

    test = orderedRandItems(rand, list, 1000);
    assert(Array.isArray(test), "Should be an array");
    assert.equal(test.length, 100, "Should be 100 items from 1000 count");
  });

  test("Should return items from the list and be unique", () => {
    const check = new Set(list);
    let duplication = new Set();
    let test = orderedRandItems(rand, list, 10);
    test.forEach((item) => {
      assert(check.has(item), "10 Should be in the list");
      assert(!duplication.has(item), "10 Should not be duplicated");
      duplication.add(item);
    });

    test.reduce((prev, curr) => {
      assert(
        list.indexOf(prev) < list.indexOf(curr),
        "10 Should be in increasing order"
      );
      return curr;
    }, -1);

    test = orderedRandItems(rand, list, 100);
    duplication = new Set();
    test.forEach((item) => {
      assert(check.has(item), "100 Should be in the list");
      assert(!duplication.has(item), "100 Should not be duplicated");
      duplication.add(item);
    });

    test.reduce((prev, curr) => {
      assert(
        list.indexOf(prev) < list.indexOf(curr),
        "100 Should be in increasing order"
      );
      return curr;
    }, -1);

    test = orderedRandItems(rand, list, 90);
    duplication = new Set();
    test.forEach((item) => {
      assert(check.has(item), "90 Should be in the list");
      assert(!duplication.has(item), "90 Should not be duplicated");
      duplication.add(item);
    });

    test.reduce((prev, curr) => {
      assert(
        list.indexOf(prev) < list.indexOf(curr),
        "90 Should be in increasing order"
      );
      return curr;
    }, -1);

    test = orderedRandItems(rand, list, 1);
    duplication = new Set();
    test.forEach((item) => {
      assert(check.has(item), "1 Should be in the list");
      assert(!duplication.has(item), "1 Should not be duplicated");
      duplication.add(item);
    });

    test.reduce((prev, curr) => {
      assert(
        list.indexOf(prev) < list.indexOf(curr),
        "1 Should be in increasing order"
      );
      return curr;
    }, -1);

    test = orderedRandItems(rand, list, 1000);
    duplication = new Set();
    test.forEach((item) => {
      assert(check.has(item), "1000 Should be in the list");
      assert(!duplication.has(item), "1000 Should not be duplicated");
      duplication.add(item);
    });

    test.reduce((prev, curr) => {
      assert(
        list.indexOf(prev) < list.indexOf(curr),
        "1000 Should be in increasing order"
      );
      return curr;
    });
  });
});
