// Собирает index.html из шаблона src/page.template.html и текстов
// src/texts.js: метка {{имя}} в шаблоне заменяется строкой. Готовый файл
// лежит в репозитории (см. комментарий в его начале), руками его не правят:
// правят шаблон или тексты и запускают
//   node scripts/build-page.js
// Если у любого текста значение null (заглушка), сборка останавливается:
// пустое место в готовой странице было бы хуже ошибки здесь.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { RECIPIENT_TYPES } from '../src/outcome.js';
import { NETWORKS } from '../src/networks.js';
import * as T from '../src/texts.js';

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Те же списки, что раньше собирал в браузере src/app.js: сети в порядке
// src/networks.js, типы получателя в порядке src/outcome.js.
const networkOptions = Object.keys(NETWORKS)
  .map((id) => `      <option value="${escapeHtml(id)}">${escapeHtml(T.NETWORK_NAMES[id])}</option>`)
  .join('\n');

// Радио без атрибута required: см. комментарий над формой в шаблоне.
const recipientOptions = RECIPIENT_TYPES.map(
  (type) =>
    `        <label><input type="radio" name="recipient" value="${escapeHtml(type)}">${escapeHtml(T.RECIPIENT_OPTIONS[type])}</label>`,
).join('\n');

const texts = {
  title: T.PAGE_TITLE,
  description: T.PAGE_DESCRIPTION,
  privacy: T.PRIVACY_NOTE,
  labelAddress: T.LABELS.address,
  labelNetwork: T.LABELS.network,
  labelRecipient: T.LABELS.recipient,
  hint: T.RECIPIENT_HINT,
  submit: T.SUBMIT,
};

export function build() {
  const template = readFileSync(new URL('../src/page.template.html', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (key === 'networkOptions') return networkOptions;
    if (key === 'recipientOptions') return recipientOptions;
    if (typeof texts[key] !== 'string') throw new Error(`Нет текста для {{${key}}}`);
    return escapeHtml(texts[key]);
  });
}

// Запуск как скрипт, а не подключение из теста.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(new URL('../index.html', import.meta.url), build());
  console.log('Собрано: index.html');
}
