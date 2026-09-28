// Тесты сборки ответа и текстов интерфейса. Запуск: npm test
//
// Главное здесь — перебор: каждый адрес из набора с каждой сетью и каждым
// типом получателя. Правило MVP.md, пункт 4, — предупреждение о мошенниках
// в каждом ответе — проверяется на всех сочетаниях, а не на примерах.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAnswer, buildSeedPhraseAnswer } from '../src/answer.js';
import { determineOutcome, RECIPIENT_TYPES } from '../src/outcome.js';
import { NETWORKS } from '../src/networks.js';
import { getScamWarning } from '../src/scam-warning.js';
import { KNOWN_CONTRACTS } from '../src/known-contracts.js';
import * as T from '../src/texts.js';

// Настоящие адреса из test/address.test.js — по одному на каждый путь
// дерева исходов, плюс мусор и опечатка.
const ADDRESSES = [
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
  'EQDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff-W72r5gqPrHF',
  'cosmos1fl48vsnmsdzcv85q5d2q4z5ajdha8yu34mf0eh',
  'osmo1clpqr4nrk4khgkxj78fcwwh6dl3uw4epasmvnj',
  'bnb136ns6lfw4zs5hg4n85vdthaad7hq5m4gtkgf23',
  KNOWN_CONTRACTS[0].address,
  'не адрес',
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96044',
];

function everyAnswer() {
  const all = [];
  for (const address of ADDRESSES) {
    for (const networkId of Object.keys(NETWORKS)) {
      for (const recipient of RECIPIENT_TYPES) {
        const result = determineOutcome(address, networkId, recipient);
        all.push({ result, parts: buildAnswer(result), label: `${address} / ${networkId} / ${recipient}` });
      }
    }
  }
  return all;
}

test('предупреждение о мошенниках — в каждом ответе, ровно одно и целиком', () => {
  for (const { parts, label } of everyAnswer()) {
    const warnings = parts.filter((p) => p.kind === 'warning');
    assert.equal(warnings.length, 1, label);
    assert.equal(warnings[0].text, getScamWarning(), label);
  }
});

test('перебор покрывает все исходы — иначе предыдущий тест проверял бы не всё', () => {
  const seen = new Set(everyAnswer().map(({ result }) => result.outcome));
  assert.deepEqual([...seen].sort(), ['A', 'B', 'C', 'D', 'E', 'F', 'unknown']);
});

test('главный ответ — первым: заголовок, за ним объяснение', () => {
  for (const { parts, label } of everyAnswer()) {
    assert.equal(parts[0].kind, 'title', label);
    assert.equal(parts[1].kind, 'explanation', label);
  }
});

test('ответ на вставленную сид-фразу тоже несёт предупреждение', () => {
  const parts = buildSeedPhraseAnswer();
  assert.ok(parts.some((p) => p.kind === 'warning' && p.text === getScamWarning()));
});

test('исход B там, где чинить нечего (TON), не получает заголовок «Поправимо…»', () => {
  // Не Tron: единственный настоящий адрес Tron в тестах — контракт USDT,
  // для него правильный исход E.
  const parts = buildAnswer(determineOutcome('EQDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff-W72r5gqPrHF', 'ton', 'own-wallet'));
  assert.equal(parts[0].key, 'OUTCOME_TITLES.B-nothing-to-fix');
  assert.notEqual(parts[0].text, T.OUTCOME_TITLES.B);
});

test('признак «нет контрольной суммы» доходит до страницы отдельной пометкой', () => {
  const parts = buildAnswer(determineOutcome('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'solana', 'own-wallet'));
  assert.ok(parts.some((p) => p.key === 'NO_CHECKSUM_NOTE'));
});

test('названия есть у каждой сети из src/networks.js и у каждого типа получателя — и ни одного лишнего', () => {
  assert.deepEqual(Object.keys(T.NETWORK_NAMES).sort(), Object.keys(NETWORKS).sort());
  assert.deepEqual(Object.keys(T.RECIPIENT_OPTIONS).sort(), [...RECIPIENT_TYPES].sort());
});
