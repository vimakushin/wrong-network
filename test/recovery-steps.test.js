// Тесты последовательностей действий. Запуск: npm test
//
// Строим result вручную, а не через determineOutcome — этому файлу важно
// только то, что лежит в полях outcome/facts/specialCases, а не как они
// получены (это уже проверено в test/outcome.test.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSteps } from '../src/recovery-steps.js';

function result(outcome, overrides = {}) {
  return {
    outcome,
    hasNoChecksum: false,
    specialCases: [],
    facts: { networkId: 'ethereum', recipientType: 'own-wallet', addressFamily: 'evm', addressStatus: 'valid' },
    ...overrides,
  };
}

test('исход A: шагов нет, и это явно объяснено, а не пропущено', () => {
  const r = getSteps(result('A'));
  assert.equal(r.steps, null);
  assert.ok(r.reason.length > 0);
});

test('исход E: шагов нет — идти некуда', () => {
  const r = getSteps(result('E'));
  assert.equal(r.steps, null);
});

test('«не знаем»: шагов нет — не гадаем', () => {
  const r = getSteps(result('unknown'));
  assert.equal(r.steps, null);
});

test('исход B, EVM: три шага — добавить сеть, комиссия, вписать токен', () => {
  const r = getSteps(result('B'));
  assert.equal(r.steps.length, 4); // три шага + оговорка про комиссию
  assert.ok(r.steps[0].includes('сеть'));
  assert.ok(r.steps.some((s) => s.includes('комисси')));
  assert.ok(r.steps.some((s) => s.includes('контракт')));
});

test('исход B, Bitcoin с пометкой btc-bch-legacy: шаги про второй кошелёк, а не про добавление сети', () => {
  const r = getSteps(result('B', {
    specialCases: ['btc-bch-legacy'],
    facts: { networkId: 'bitcoin-cash', recipientType: 'own-wallet', addressFamily: 'bitcoin', addressStatus: 'valid', addressVariant: 'legacy' },
  }));
  assert.ok(r.steps.some((s) => s.includes('Bitcoin Cash')));
  assert.ok(!r.steps.some((s) => s.includes('Добавьте в свой кошелёк сеть')));
});

test('исход B, Tron (единственная сеть семейства): чинить нечего — шагов нет вовсе', () => {
  // Шаг «ничего делать не нужно» противоречил бы объяснению над ним,
  // которое как раз говорит, что проверить.
  const r = getSteps(result('B', {
    facts: { networkId: 'tron', recipientType: 'own-wallet', addressFamily: 'tron', addressStatus: 'valid' },
  }));
  assert.equal(r.steps, null);
});

test('исход C, EVM: шаги начинаются с «свяжитесь с владельцем», дальше те же, что у B', () => {
  const b = getSteps(result('B'));
  const c = getSteps(result('C'));
  assert.ok(c.steps[0].includes('владельцем'));
  assert.deepEqual(c.steps.slice(1), b.steps);
});

test('исход C, Tron (чинить нечего): не «свяжитесь с владельцем», а «если получатель не тот — уточните»', () => {
  // «Свяжитесь с владельцем» и «ошибки здесь нет» подряд были бы двумя
  // взаимоисключающими сигналами.
  const r = getSteps(result('C', {
    facts: { networkId: 'tron', recipientType: 'other-wallet', addressFamily: 'tron', addressStatus: 'valid' },
  }));
  assert.equal(r.steps.length, 1);
  assert.ok(r.steps[0].startsWith('Это не ваш кошелёк'));
  assert.ok(!r.steps[0].includes('Свяжитесь с владельцем адреса и объясните, что случилось'));
});

test('исход D: в шагах названы все данные, которые нужно приложить к обращению в поддержку', () => {
  const r = getSteps(result('D'));
  const all = r.steps.join(' ');
  for (const field of ['идентификатор транзакции', 'адрес пополнения', 'сеть, по которой отправили', 'сеть, которую поддерживает', 'сумму', 'время отправки']) {
    assert.ok(all.includes(field), field);
  }
  assert.ok(all.includes('повторно'));
});

test('исход F: своя роль в тексте зависит от типа получателя, а не подставлена одна на всех', () => {
  const own = getSteps(result('F', { facts: { networkId: 'bnb-beacon-chain', recipientType: 'own-wallet', addressFamily: 'cosmos', addressStatus: 'valid', addressPrefix: 'bnb' } }));
  const other = getSteps(result('F', { facts: { networkId: 'bnb-beacon-chain', recipientType: 'other-wallet', addressFamily: 'cosmos', addressStatus: 'valid', addressPrefix: 'bnb' } }));
  const exchange = getSteps(result('F', { facts: { networkId: 'bnb-beacon-chain', recipientType: 'exchange', addressFamily: 'cosmos', addressStatus: 'valid', addressPrefix: 'bnb' } }));

  assert.ok(own.steps.at(-1).includes('можете провести сами'));
  assert.ok(other.steps.at(-1).includes('связаться с ним'));
  assert.ok(exchange.steps.at(-1).includes('поддержку'));
  // Не просто «объясните ситуацию» — конкретно, что указать и приложить
  // (без этого шаг для биржи выпадал из общей планки
  // «действие, а не отсылка к поддержке»).
  assert.ok(exchange.steps.at(-1).includes('docs.bnbchain.org'));

  // Первые (общие, не зависящие от роли) шаги одинаковы для всех троих.
  assert.deepEqual(own.steps.slice(0, -1), other.steps.slice(0, -1));
  assert.deepEqual(own.steps.slice(0, -1), exchange.steps.slice(0, -1));
});

test('исход B и C: сид-фраза названа без числа слов — бывает и двенадцать, и двадцать четыре', () => {
  const evm = getSteps(result('B'));
  assert.ok(!evm.steps.join(' ').includes('двенадцать слов'));
  assert.ok(evm.steps.join(' ').includes('сид-фраз'));

  const btcBch = getSteps(result('B', {
    specialCases: ['btc-bch-legacy'],
    facts: { networkId: 'bitcoin-cash', recipientType: 'own-wallet', addressFamily: 'bitcoin', addressStatus: 'valid', addressVariant: 'legacy' },
  }));
  assert.ok(!btcBch.steps.join(' ').includes('двенадцать слов'));
});

test('исход F: инструмент восстановления назван по имени и со ссылкой, а не расплывчато', () => {
  const r = getSteps(result('F', { facts: { networkId: 'bnb-beacon-chain', recipientType: 'own-wallet', addressFamily: 'cosmos', addressStatus: 'valid', addressPrefix: 'bnb' } }));
  const all = r.steps.join(' ');
  assert.ok(all.includes('github.com/bnb-chain/token-recover-self-service-tools'));
  // Старая версия-сайт отключена, но не должна читаться как «всё пропало».
  assert.ok(all.includes('1 июля 2026'));
  assert.ok(all.includes('не значит, что всё пропало'));
});

test('исход F: конкретных адресов контрактов, версий Node.js и параметров газа в тексте нет', () => {
  const r = getSteps(result('F', { facts: { networkId: 'bnb-beacon-chain', recipientType: 'own-wallet', addressFamily: 'cosmos', addressStatus: 'valid', addressPrefix: 'bnb' } }));
  const all = r.steps.join(' ');
  assert.ok(!/0x[0-9a-fA-F]{6,}/.test(all)); // ни одного адреса контракта
  assert.ok(!/\d+\.\d+\.\d+/.test(all)); // ни одной версии вида x.y.z
});

test('неизвестный исход — программная ошибка, а не молчаливое «шагов нет»', () => {
  assert.throws(() => getSteps(result('Z')), RangeError);
});
