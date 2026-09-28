// Дерево исходов: по трём входным данным — адрес получателя, сеть
// отправки, тип получателя (свой кошелёк, чужой кошелёк, биржа) —
// определяет, что случилось с деньгами. Главная мысль всего сервиса:
// решает не сеть, а то, кто владеет ключом на той стороне.
//
// Исходы:
//   A — ошибка была невозможна: сеть не приняла бы адрес такого вида;
//   B — поправимо своими силами: адрес свой, ключ тот же во всех сетях семейства;
//   C — поправимо, но не вами: то же, но ключ у владельца чужого кошелька;
//   D — зависит от биржи: ключ у биржи, решение за ней;
//   E — скорее всего потеряно: ключа нет ни у кого (адрес контракта токена);
//   F — сеть выключена, есть техническое восстановление (BNB Beacon Chain);
//   unknown — не знаем.
//
// Результат — только коды и факты, ни одного слова для пользователя.
// Слова — в src/texts.js, их можно править, не трогая эту логику.
//
// Главное правило: если сочетание входных данных не описано выше,
// возвращаем 'unknown', а не ближайший похожий исход. Подставленный по
// сходству исход — это уверенный ответ про чужие деньги, который никто
// не проверял.

import { detectFamily } from './address.js';
import { NETWORKS } from './networks.js';
import { matchKnownContract } from './known-contracts.js';

export const RECIPIENT_TYPES = ['own-wallet', 'other-wallet', 'exchange'];

// Совпадает ли семейство адреса с семейством выбранной сети.
// Отдельные условия для Bitcoin и Cosmos: там одного совпадения
// семейства недостаточно.
function familyMatches(addr, networkId, network) {
  if (network.family === null) return false; // формат сети не реализован — см. src/networks.js
  if (addr.family !== network.family) return false;

  if (addr.family === 'bitcoin') {
    // Bitcoin Cash принимает только устаревший формат адреса — тот самый,
    // что совпадает с Bitcoin. У сегвит-адреса (bc1…) с Bitcoin Cash
    // совпадения нет.
    if (networkId === 'bitcoin-cash') return addr.variant === 'legacy';
    return true;
  }

  if (addr.family === 'cosmos') {
    // Префикс bech32 — часть контрольной суммы, поэтому адрес с чужим
    // префиксом невалиден сам по себе и сюда не попадёт: здесь сверяем,
    // что префикс соответствует именно выбранной сети.
    return addr.prefix === network.prefix;
  }

  return true; // evm, tron, solana, ton — семейства не делятся на сети внутри себя
}

// Особые случаи — места, где обычная проверка формата даёт неверный или
// неполный ответ. Не зависят от того, какой исход получился, и собраны
// отдельно, потому что каждый требует своего объяснения, а не сводится
// к общему тексту исхода.
function specialCasesFor(addr, networkId) {
  const cases = [];

  // Bitcoin и Bitcoin Cash: устаревший формат адреса совпадает, поэтому
  // деньги могут прийти не в ту сеть, даже если формат сам по себе не
  // ошибся. Предупреждение нужно, даже когда семейство совпало и исход
  // получился обычным B/C/D.
  if (addr.family === 'bitcoin' && addr.variant === 'legacy' && (networkId === 'bitcoin' || networkId === 'bitcoin-cash')) {
    cases.push('btc-bch-legacy');
  }

  // BEP-2 (bnb1…) и BEP-20 (0x…) путают по названию. Направление «адрес
  // bnb1…» сюда не входит: с 19 ноября 2024 сеть BNB Beacon Chain
  // остановлена, для такого адреса всегда исход F — см. ниже, до
  // вычисления обычного A/B/C/D. Здесь остаётся только обратное
  // направление: адрес evm, а сеть отправки выбрана «BNB Beacon Chain»
  // по ошибке в названии.
  if (networkId === 'bnb-beacon-chain' && addr.family === 'evm') {
    cases.push('bep2-bep20');
  }

  // У Avalanche несколько цепей с разными форматами; формат X-Chain мы
  // не разбираем. Помечаем в любом случае: и когда адрес узнан как явно
  // несовместимый по формату (исход A), и когда формат вообще не опознан
  // и остаётся честное «не знаем».
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
 * @param {'own-wallet'|'other-wallet'|'exchange'} recipientType — свой кошелёк, чужой кошелёк, биржа.
 * @returns {{outcome: 'A'|'B'|'C'|'D'|'E'|'F'|'unknown', hasNoChecksum: boolean, specialCases: string[], facts: object}}
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
  // сказать ни «возможно», ни «поправимо», ни «потеряно». Чем именно
  // случаи различаются для человека, решают тексты (src/answer.js).
  if (addr.family === null || addr.status === 'bad-checksum') {
    return { outcome: 'unknown', hasNoChecksum: false, specialCases, facts };
  }

  const hasNoChecksum = addr.status === 'no-checksum';

  // BNB Beacon Chain (bnb1…) остановлена 19 ноября 2024 года. Какую бы
  // сеть отправки человек ни указал, это не вопрос выбора сети: сети,
  // которой принадлежит адрес, больше нет. Поэтому проверяем это раньше
  // обычного сопоставления семейства и сети, а не как ещё один вариант
  // исхода A/B/C/D.
  if (addr.family === 'cosmos' && addr.prefix === 'bnb') {
    return { outcome: 'F', hasNoChecksum, specialCases, facts };
  }

  if (!familyMatches(addr, networkId, network)) {
    // Исход A: кошелёк или биржа отвергли бы адрес такого вида на вводе.
    return { outcome: 'A', hasNoChecksum, specialCases, facts };
  }

  // Семейство совпало — дальше решает только тип получателя: у кого ключ.
  const outcomeByRecipient = { 'own-wallet': 'B', 'other-wallet': 'C', exchange: 'D' };
  return { outcome: outcomeByRecipient[recipientType], hasNoChecksum, specialCases, facts };
}
