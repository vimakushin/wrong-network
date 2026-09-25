// Дерево исходов: по трём входным данным из TZ.md, раздел 2 — адрес,
// сеть отправки, тип получателя — определяет исход из TZ.md, раздел 4,
// и особые случаи из TZ.md, раздел 5.
//
// Результат — только коды и факты, ни одного слова для пользователя.
// Тексты появятся позже отдельным файлом (по образцу strings.js в
// соседнем проекте btc-what-if), который редактор сможет менять, не
// трогая эту логику. Собственного файла-заглушки для текстов сейчас не
// заводим — заводить нечего показывать, пустой файл был бы кодом на
// будущее.
//
// Главное правило: если сочетание входных данных не описано в TZ.md,
// возвращаем 'unknown', а не ближайший похожий исход. Подставленный по
// сходству исход — это уверенный ответ про чужие деньги, который никто
// не проверял.

import { detectFamily } from './address.js';
import { NETWORKS } from './networks.js';
import { matchKnownContract } from './known-contracts.js';

export const RECIPIENT_TYPES = ['own-wallet', 'other-wallet', 'exchange'];

// Совпадает ли семейство адреса с семейством выбранной сети.
// Отдельные условия для Bitcoin и Cosmos — из-за особых случаев TZ.md,
// раздел 5: там одного совпадения семейства недостаточно.
function familyMatches(addr, networkId, network) {
  if (network.family === null) return false; // формат сети не реализован — см. src/networks.js
  if (addr.family !== network.family) return false;

  if (addr.family === 'bitcoin') {
    // Bitcoin Cash принимает только устаревший формат адреса — тот самый,
    // что совпадает с Bitcoin (TZ.md, раздел 5). У сегвит-адреса (bc1…)
    // с Bitcoin Cash совпадения нет.
    if (networkId === 'bitcoin-cash') return addr.variant === 'legacy';
    return true;
  }

  if (addr.family === 'cosmos') {
    // Префикс bech32 — часть контрольной суммы (TZ.md, раздел 3), поэтому
    // адрес с чужим префиксом невалиден сам по себе и сюда не попадёт:
    // здесь сверяем, что префикс соответствует именно выбранной сети.
    return addr.prefix === network.prefix;
  }

  return true; // evm, tron, solana, ton — семейства не делятся на сети внутри себя
}

// Особые случаи TZ.md, раздел 5, не зависящие от того, какой исход
// получился. Собраны отдельно от вычисления исхода, потому что каждый
// требует своего объяснения, а не подмешивается в общий текст (TZ.md,
// раздел 5: «Требование: каждый такой случай должен иметь отдельное
// объяснение, а не сводиться к общему исходу»).
function specialCasesFor(addr, networkId) {
  const cases = [];

  // Bitcoin и Bitcoin Cash: устаревший формат адреса совпадает, поэтому
  // деньги могут прийти не в ту сеть, даже если формат сам по себе не
  // ошибся. Предупреждение нужно, даже когда семейство совпало и исход
  // получился обычным B/C/D.
  if (addr.family === 'bitcoin' && addr.variant === 'legacy' && (networkId === 'bitcoin' || networkId === 'bitcoin-cash')) {
    cases.push('btc-bch-legacy');
  }

  // BEP-2 (bnb1…, семейство cosmos) и BEP-20 (0x…, семейство evm) — разные
  // форматы одной и той же по названию сети. Совпадение семейств здесь
  // невозможно в принципе, но путаница по названию — частая, поэтому даём
  // отдельную пометку, а не общий «сеть не подходит».
  if (networkId === 'bnb-smart-chain' && addr.family === 'cosmos' && addr.prefix === 'bnb') {
    cases.push('bep2-bep20');
  }
  if (networkId === 'bnb-beacon-chain' && addr.family === 'evm') {
    cases.push('bep2-bep20');
  }

  // Avalanche X-Chain использует не тот формат, что мы умеем разбирать
  // (TZ.md, раздел 5). Помечаем в любом случае: и когда адрес узнан как
  // явно несовместимый по формату (исход A), и когда формат вообще не
  // опознан и остаётся честное «не знаем».
  if (networkId === 'avalanche-x-chain') {
    cases.push('avalanche-chains');
  }

  return cases;
}

function baseFacts(networkId, recipientType, addr) {
  const facts = {
    networkId,
    recipientType,
    addressFamily: addr.family,
    addressStatus: addr.status,
  };
  if (addr.variant) facts.addressVariant = addr.variant;
  if (addr.prefix) facts.addressPrefix = addr.prefix;
  return facts;
}

/**
 * @param {string} address — строка адреса получателя, как её ввёл человек.
 * @param {string} networkId — id сети из src/networks.js.
 * @param {'own-wallet'|'other-wallet'|'exchange'} recipientType — TZ.md, раздел 2.
 * @returns {{outcome: 'A'|'B'|'C'|'D'|'E'|'unknown', hasNoChecksum: boolean, specialCases: string[], facts: object}}
 */
export function determineOutcome(address, networkId, recipientType) {
  const network = NETWORKS[networkId];
  if (!network) throw new RangeError(`неизвестная сеть: ${networkId}`);
  if (!RECIPIENT_TYPES.includes(recipientType)) throw new RangeError(`неизвестный тип получателя: ${recipientType}`);

  const addr = detectFamily(address);
  const specialCases = specialCasesFor(addr, networkId);
  const facts = baseFacts(networkId, recipientType, addr);

  // Известный адрес контракта — проверяем в первую очередь и независимо
  // от семейства/статуса контрольной суммы: раз строка совпала с адресом
  // из списка, дальше не важно, сошлась бы обычная проверка формата или
  // нет. Не совпало — список тут ничего не решает и не упоминается вообще
  // (src/known-contracts.js): короткий список не может подтвердить
  // обратное.
  const contract = matchKnownContract(address, networkId, addr.family);
  if (contract) {
    return {
      outcome: 'E',
      hasNoChecksum: addr.status === 'no-checksum',
      specialCases: [...specialCases, 'contract-address'],
      facts: { ...facts, knownContractSource: contract.source },
    };
  }

  // Семейство не опознано или контрольная сумма не сошлась — оба случая
  // означают одно: мы не знаем, что это за адрес, и не можем честно
  // сказать ни «возможно», ни «поправимо», ни «потеряно».
  if (addr.family === null || addr.status === 'bad-checksum') {
    return { outcome: 'unknown', hasNoChecksum: false, specialCases, facts };
  }

  const hasNoChecksum = addr.status === 'no-checksum';

  if (!familyMatches(addr, networkId, network)) {
    // TZ.md, исход A: сеть не приняла бы такой формат на вводе.
    return { outcome: 'A', hasNoChecksum, specialCases, facts };
  }

  // Семейство совпало — дальше решает только тип получателя (TZ.md, раздел 4).
  const outcomeByRecipient = { 'own-wallet': 'B', 'other-wallet': 'C', exchange: 'D' };
  return { outcome: outcomeByRecipient[recipientType], hasNoChecksum, specialCases, facts };
}
