// Тесты предупреждения о мошенниках (MVP.md, пункт 4). Запуск: npm test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getScamWarning } from '../src/scam-warning.js';

test('обязательные мысли из TZ.md, раздел 6, все на месте', () => {
  const text = getScamWarning();
  assert.ok(text.includes('сид-фраз'));
  assert.ok(text.includes('приватный ключ'));
  assert.ok(text.toLowerCase().includes('предоплат'));
  assert.ok(text.includes('никогда'));
});

test('не принимает исход и не меняется в зависимости от него', () => {
  // Проверяем и сигнатуру (не завязана на аргумент), и стабильность:
  // одинаковый вызов — одинаковый результат, ветвления по исходу нет.
  assert.equal(getScamWarning.length, 0);
  assert.equal(getScamWarning('A'), getScamWarning('E'));
  assert.equal(getScamWarning(), getScamWarning());
});

test('тон: без восклицательных знаков и без «надо было внимательнее»', () => {
  const text = getScamWarning();
  assert.ok(!text.includes('!'));
  assert.ok(!text.toLowerCase().includes('внимательнее'));
  assert.ok(!text.toLowerCase().includes('надо было'));
});

test('короткий текст — одно-два предложения, а не длинный абзац', () => {
  // Осознанное решение из комментария в src/scam-warning.js: короткое
  // читают, длинное проматывают. Проверяем, что решение не расползлось.
  const text = getScamWarning();
  assert.ok(text.length < 500, `слишком длинно: ${text.length} символов`);
});
