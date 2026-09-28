// Страница: заполняет форму текстами из src/texts.js, по кнопке считает
// исход и рисует ответ. Вся логика — в других файлах, здесь только
// связь с разметкой index.html.
//
// Ни одного обращения в сеть: только чтение полей и изменение страницы.
// Адрес нигде не сохраняется — ни в хранилище браузера, ни в адресной
// строке, ни в истории.

import { determineOutcome, RECIPIENT_TYPES } from './outcome.js';
import { NETWORKS } from './networks.js';
import { looksLikeSeedPhrase } from './address.js';
import { buildAnswer, buildSeedPhraseAnswer } from './answer.js';
import * as T from './texts.js';

const $ = (id) => document.getElementById(id);

// Текст или видимая заглушка, если текста нет (null в src/texts.js).
function fill(el, text, key) {
  el.replaceChildren();
  if (text === null) {
    const stub = document.createElement('span');
    stub.className = 'missing';
    stub.textContent = `нет текста: ${key}`;
    el.append(stub);
  } else {
    el.textContent = text;
  }
  return el;
}

function setUpForm() {
  if (T.PAGE_TITLE !== null) document.title = T.PAGE_TITLE;
  fill($('page-title'), T.PAGE_TITLE, 'PAGE_TITLE');
  fill($('privacy-note'), T.PRIVACY_NOTE, 'PRIVACY_NOTE');
  fill($('label-address'), T.LABELS.address, 'LABELS.address');
  fill($('label-network'), T.LABELS.network, 'LABELS.network');
  fill($('label-recipient'), T.LABELS.recipient, 'LABELS.recipient');
  fill($('recipient-hint'), T.RECIPIENT_HINT, 'RECIPIENT_HINT');
  fill($('submit'), T.SUBMIT, 'SUBMIT');

  const select = $('network');
  for (const id of Object.keys(NETWORKS)) {
    select.append(new Option(T.NETWORK_NAMES[id], id));
  }

  const options = $('recipient-options');
  for (const type of RECIPIENT_TYPES) {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'recipient';
    radio.value = type;
    radio.required = true;
    label.append(radio, T.RECIPIENT_OPTIONS[type]);
    options.append(label);
  }
}

function render(parts) {
  const answer = $('answer');
  answer.replaceChildren();
  for (const part of parts) {
    if (part.kind === 'steps') {
      const ol = document.createElement('ol');
      for (const item of part.items) ol.append(fill(document.createElement('li'), item, part.key));
      answer.append(ol);
      continue;
    }
    const el = document.createElement(part.kind === 'title' ? 'h2' : 'p');
    if (part.kind === 'note' || part.kind === 'warning') el.className = part.kind;
    answer.append(fill(el, part.text, part.key));
  }
  answer.hidden = false;
  // Главный ответ — сразу перед глазами, без прокрутки: человек нажал
  // кнопку внизу формы, а ответ ниже неё.
  answer.scrollIntoView({ block: 'start' });
  answer.focus({ preventScroll: true });
}

function hideAnswer() {
  $('answer').hidden = true;
  $('answer').replaceChildren();
}

setUpForm();

const form = $('form');
const address = $('address');

// Один обработчик на всю форму (событие input приходит и от поля, и от
// списка, и от переключателей). Два отдельных здесь нельзя: событие
// поля всплывает до формы, и её обработчик тут же спрятал бы то, что
// показал обработчик поля.
form.addEventListener('input', (event) => {
  // Сид-фразу в поле адреса не держим ни секунды: стираем сразу при
  // вставке и объясняем почему, не дожидаясь кнопки.
  if (event.target === address && looksLikeSeedPhrase(address.value)) {
    address.value = '';
    render(buildSeedPhraseAnswer());
    return;
  }
  // Ответ относится к тому, что было в полях на момент нажатия. Поменяли
  // поле — старый ответ убираем, чтобы он не читался как ответ на новое.
  hideAnswer();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const recipient = form.querySelector('input[name="recipient"]:checked').value;
  render(buildAnswer(determineOutcome(address.value, $('network').value, recipient)));
});
