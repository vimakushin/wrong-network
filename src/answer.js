// Собирает ответ из готовых частей: заголовок и объяснение исхода
// (src/texts.js), пометки об особых случаях, предупреждение о мошенниках
// (src/scam-warning.js) и шаги (src/recovery-steps.js). Сам ничего не
// пишет и страницы не касается — её рисует src/app.js. Отдельным файлом,
// чтобы тестами проверить главное: предупреждение есть в каждом ответе.
//
// Ответ — список частей { kind, key, text }. `text: null` значит, что
// текста для этой части нет (см. src/texts.js), и страница покажет на её
// месте заглушку с `key`.
//
// Порядок: заголовок и объяснение первыми — это главный ответ, его видно
// сразу. Предупреждение о мошенниках — сразу за ним и до шагов: оно
// короткое, а шагов бывает пять-шесть, и человек, которому сказали
// «потеряно», дальше заголовка может не читать.

import { getSteps, hasFixMechanic } from './recovery-steps.js';
import { getScamWarning } from './scam-warning.js';
import * as T from './texts.js';

function pick(table, tableName, key) {
  // Нет ключа вообще — ошибка в коде; есть, но null — известный пробел в текстах.
  if (!(key in table)) throw new RangeError(`в ${tableName} нет ключа ${key}`);
  return { key: `${tableName}.${key}`, text: table[key] };
}

// Ключ текстов: исход плюс уточнение там, где один исход означает для
// человека разные ситуации (см. комментарий к OUTCOME_TITLES в src/texts.js).
function outcomeKey({ outcome, facts, specialCases }) {
  if ((outcome === 'B' || outcome === 'C') && !hasFixMechanic(facts, specialCases)) {
    return `${outcome}-nothing-to-fix`;
  }
  if (outcome === 'unknown' && facts.addressStatus === 'bad-checksum') return 'unknown-typo';
  return outcome;
}

export function buildAnswer(result) {
  const key = outcomeKey(result);
  const parts = [
    { kind: 'title', ...pick(T.OUTCOME_TITLES, 'OUTCOME_TITLES', key) },
    { kind: 'explanation', ...pick(T.OUTCOME_EXPLANATIONS, 'OUTCOME_EXPLANATIONS', key) },
  ];
  if (result.hasNoChecksum) {
    parts.push({ kind: 'note', key: 'NO_CHECKSUM_NOTE', text: T.NO_CHECKSUM_NOTE });
  }
  for (const c of result.specialCases) {
    parts.push({ kind: 'note', ...pick(T.SPECIAL_CASE_NOTES, 'SPECIAL_CASE_NOTES', c) });
  }
  parts.push({ kind: 'warning', key: 'scam-warning', text: getScamWarning() });

  // Если шагов нет, на странице ничего не добавляем: объяснение исхода
  // выше уже говорит, почему делать нечего и что проверить, а причина
  // «шагов нет» из getSteps повторила бы его другими словами.
  const { steps } = getSteps(result);
  if (steps) parts.push({ kind: 'steps', key: 'recovery-steps', items: steps });
  return parts;
}

// Ответ, когда в поле адреса вставили сид-фразу: исход не считаем
// вовсе — это не адрес. Предупреждение о мошенниках есть и здесь.
export function buildSeedPhraseAnswer() {
  return [
    { kind: 'note', key: 'SEED_PHRASE_NOTICE', text: T.SEED_PHRASE_NOTICE },
    { kind: 'warning', key: 'scam-warning', text: getScamWarning() },
  ];
}
