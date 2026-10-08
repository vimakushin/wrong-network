// Страница: по кнопке считает исход и рисует ответ. Вся логика — в других
// файлах, здесь только связь с разметкой index.html. Сама форма (подписи,
// список сетей, варианты получателя) уже в index.html: его собирает
// scripts/build-page.js, чтобы текст был виден и без скриптов.
//
// Ни одного обращения в сеть: только чтение полей и изменение страницы.
// Адрес нигде не сохраняется — ни в хранилище браузера, ни в адресной
// строке, ни в истории.

import { determineOutcome } from './outcome.js';
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

// Первое незаполненное поле по порядку на странице. Пробелы вместо адреса —
// это пустое поле.
function firstEmptyField() {
  if ($('address').value.trim() === '') return 'address';
  if ($('network').value === '') return 'network';
  if (!form.querySelector('input[name="recipient"]:checked')) return 'recipient';
  return null;
}

function hideAnswer() {
  // Сообщение о пустом поле — такая же устаревшая пометка, как старый ответ.
  $('form-error').hidden = true;
  $('answer').hidden = true;
  $('answer').replaceChildren();
}

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
    hideAnswer();
    render(buildSeedPhraseAnswer());
    return;
  }
  // Ответ относится к тому, что было в полях на момент нажатия. Поменяли
  // поле — старый ответ убираем, чтобы он не читался как ответ на новое.
  hideAnswer();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const empty = firstEmptyField();
  hideAnswer();
  if (empty) {
    const error = fill($('form-error'), T.EMPTY_FIELD[empty], `EMPTY_FIELD.${empty}`);
    error.hidden = false;
    // Фокус на поле, о котором речь: у переключателей — на первый.
    (empty === 'recipient' ? form.querySelector('input[name="recipient"]') : $(empty)).focus();
    return;
  }
  const recipient = form.querySelector('input[name="recipient"]:checked').value;
  render(buildAnswer(determineOutcome(address.value, $('network').value, recipient)));
});
