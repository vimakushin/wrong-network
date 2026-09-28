// Тесты дерева исходов. Запуск: npm test
//
// Адреса — настоящие, те же, что уже проверены в test/address.test.js
// (там же написано, откуда они взяты). Здесь важно не столько какой
// именно это адрес, сколько к какому он семейству и с какой сетью его
// сочетают.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { determineOutcome } from '../src/outcome.js';
import { KNOWN_CONTRACTS } from '../src/known-contracts.js';

const EVM = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const EVM_OTHER = '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359';
const SOLANA = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const BITCOIN_LEGACY = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
const BITCOIN_SEGWIT = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
// Остановленная BNB Beacon Chain — адрес не выдуманный, но сама сеть
// уже не работает (TZ.md, исход F), поэтому это адрес, а не «живой» счёт.
const BNB_BEACON = 'bnb136ns6lfw4zs5hg4n85vdthaad7hq5m4gtkgf23';

// --- Шесть исходов из TZ.md, раздел 4 ---

test('исход A: сеть не принимает такой формат — пример из TZ.md (Tron на 0x…)', () => {
  const r = determineOutcome(EVM, 'tron', 'own-wallet');
  assert.equal(r.outcome, 'A');
});

test('исход B: тот же EVM-адрес, другая сеть семейства, свой кошелёк', () => {
  const r = determineOutcome(EVM, 'polygon', 'own-wallet');
  assert.equal(r.outcome, 'B');
});

test('исход C: то же самое, но кошелёк чужой', () => {
  const r = determineOutcome(EVM, 'polygon', 'other-wallet');
  assert.equal(r.outcome, 'C');
});

test('исход D: то же самое, но получатель — биржа', () => {
  const r = determineOutcome(EVM, 'polygon', 'exchange');
  assert.equal(r.outcome, 'D');
});

test('исход E: адрес совпал с известным контрактом токена', () => {
  const c = KNOWN_CONTRACTS[0];
  const r = determineOutcome(c.address, c.network, 'own-wallet');
  assert.equal(r.outcome, 'E');
  assert.ok(r.specialCases.includes('contract-address'));
});

test('исход E: признак «нет контрольной суммы» не теряется на пути известного контракта', () => {
  // Нашёл ревьюер: адрес известного EVM-контракта, введённый одним
  // регистром (без EIP-55), давал hasNoChecksum: false вместо true —
  // в этой ветке значение было жёстко прописано, а не взято из addr.status.
  const c = KNOWN_CONTRACTS.find((x) => x.network === 'ethereum');
  const r = determineOutcome(c.address.toLowerCase(), c.network, 'own-wallet');
  assert.equal(r.outcome, 'E');
  assert.equal(r.hasNoChecksum, true);
});

test('исход F: BNB Beacon Chain остановлена — адрес bnb1… не зависит от выбранной сети отправки', () => {
  const own = determineOutcome(BNB_BEACON, 'ethereum', 'own-wallet');
  assert.equal(own.outcome, 'F');
  // Сеть отправки указана заведомо не та (ethereum), а исход всё равно F —
  // TZ.md прямо требует, чтобы это не зависело от выбора сети.
  const sameViaOwnNetwork = determineOutcome(BNB_BEACON, 'bnb-beacon-chain', 'own-wallet');
  assert.equal(sameViaOwnNetwork.outcome, 'F');
});

test('исход F: тип получателя сохраняется в фактах — от него зависит, кто может восстановить', () => {
  const r = determineOutcome(BNB_BEACON, 'bnb-beacon-chain', 'other-wallet');
  assert.equal(r.outcome, 'F');
  assert.equal(r.facts.recipientType, 'other-wallet');
});

test('«не знаем»: сочетание не описано в TZ.md — формат вообще не опознан', () => {
  const r = determineOutcome('это не похоже ни на один адрес', 'ethereum', 'own-wallet');
  assert.equal(r.outcome, 'unknown');
});

test('«не знаем», а не угадывание: адрес похож на семейство, но контрольная сумма не сошлась', () => {
  const r = determineOutcome('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96044', 'ethereum', 'own-wallet');
  assert.equal(r.outcome, 'unknown');
});

// --- Требование 2: случай без контрольной суммы должен дойти до ответа ---

test('Solana: контрольной суммы нет — признак доходит до исхода, а не теряется', () => {
  const r = determineOutcome(SOLANA, 'solana', 'own-wallet');
  assert.equal(r.outcome, 'B');
  assert.equal(r.hasNoChecksum, true);
});

test('EVM с настоящей контрольной суммой (EIP-55): признак — false, а не унаследованное true', () => {
  const r = determineOutcome(EVM, 'polygon', 'own-wallet');
  assert.equal(r.hasNoChecksum, false);
});

// --- Особые случаи TZ.md, раздел 5 ---

test('Bitcoin/Bitcoin Cash: устаревший формат совпадает — исход обычный, но с пометкой', () => {
  const r = determineOutcome(BITCOIN_LEGACY, 'bitcoin-cash', 'own-wallet');
  assert.equal(r.outcome, 'B'); // ключ общий для обоих форматов — поправимо своими силами
  assert.ok(r.specialCases.includes('btc-bch-legacy'));
});

test('Bitcoin/Bitcoin Cash: сегвит-адрес под пометку не попадает — с Bitcoin Cash не пересекается', () => {
  const r = determineOutcome(BITCOIN_SEGWIT, 'bitcoin-cash', 'own-wallet');
  assert.equal(r.outcome, 'A');
  assert.ok(!r.specialCases.includes('btc-bch-legacy'));
});

test('BEP-2/BEP-20: адрес Beacon Chain (bnb1…) с сетью BNB Smart Chain — это исход F, не A', () => {
  // Раньше это было отдельной пометкой при исходе A. После остановки
  // BNB Beacon Chain (19 ноября 2024) для такого адреса всегда исход F,
  // независимо от того, что выбрано сетью отправки — см. тест исхода F выше.
  const r = determineOutcome(BNB_BEACON, 'bnb-smart-chain', 'own-wallet');
  assert.equal(r.outcome, 'F');
  assert.ok(!r.specialCases.includes('bep2-bep20'));
});

test('BEP-2/BEP-20: EVM-адрес на сеть BNB Beacon Chain — исход A с пометкой, сеть жива только по названию', () => {
  const r = determineOutcome(EVM, 'bnb-beacon-chain', 'own-wallet');
  assert.equal(r.outcome, 'A');
  assert.ok(r.specialCases.includes('bep2-bep20'));
});

test('Avalanche: EVM-адрес на X-Chain — формат явно другой, исход A с пометкой', () => {
  const r = determineOutcome(EVM, 'avalanche-x-chain', 'own-wallet');
  assert.equal(r.outcome, 'A');
  assert.ok(r.specialCases.includes('avalanche-chains'));
});

test('Avalanche: формат X-Chain не разбираем вовсе — честное «не знаем» с той же пометкой', () => {
  const r = determineOutcome('X-avax1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqp0z8x9', 'avalanche-x-chain', 'own-wallet');
  assert.equal(r.outcome, 'unknown');
  assert.ok(r.specialCases.includes('avalanche-chains'));
});

test('адрес контракта: список работает в одну сторону — обычный адрес ничего не помечает', () => {
  const r = determineOutcome(EVM_OTHER, 'ethereum', 'own-wallet');
  assert.ok(!r.specialCases.includes('contract-address'));
  assert.equal('knownContractSource' in r.facts, false);
});

// --- Проверка входа ---

test('неизвестная сеть — программная ошибка, а не бизнес-исход', () => {
  assert.throws(() => determineOutcome(EVM, 'no-such-network', 'own-wallet'), RangeError);
});

test('неизвестный тип получателя — программная ошибка, а не бизнес-исход', () => {
  assert.throws(() => determineOutcome(EVM, 'ethereum', 'friend'), RangeError);
});
