import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from '../scripts/build-page.js';

// index.html собирается из шаблона и src/texts.js. Если тексты или шаблон
// поменяли, а скрипт не запустили, в репозитории осталась бы страница со
// старыми словами — и на ней, и в поисковой выдаче.
test('index.html собран из актуальных текстов и шаблона: node scripts/build-page.js', () => {
  const onDisk = readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(onDisk, build());
});
