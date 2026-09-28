// Тесты определения семейства адреса. Запуск: npm test
//
// Адреса настоящие: из спецификаций (EIP-55, BIP-173, BIP-350) и известные
// адреса из открытых источников. Откуда адреса — сказано у каждого. Что они
// набраны без ошибки, подтверждает их же контрольная сумма: у адреса с перевранным
// знаком она почти наверняка не сошлась бы. При подборе так и вышло — три адреса,
// вспомненные неточно, проверку не прошли и сюда не попали. Кому принадлежат
// адреса, здесь не проверено, и для тестов это неважно.
//
// Для каждого семейства: верный адрес, адрес с опечаткой в одном знаке,
// адрес другого семейства.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectFamily, looksLikeSeedPhrase } from '../src/address.js';

const REAL = {
  evm: [
    '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed', // пример из текста EIP-55
    '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359', // пример из текста EIP-55
    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // vitalik.eth
    '0xdAC17F958D2ee523a2206206994597C13D831ec7', // контракт USDT в Ethereum
  ],
  tron: [
    'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // контракт USDT в Tron
  ],
  bitcoin: [
    '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', // адрес из генезис-блока
    '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', // пример P2SH из вики Bitcoin
    'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', // пример из BIP-173
    'BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4', // он же заглавными — тоже допустимо
    'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3', // пример из BIP-173, 32 байта
    'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0', // Taproot, пример из BIP-350
  ],
  solana: [
    'So11111111111111111111111111111111111111112', // обёрнутый SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // токен USDC в Solana
    '11111111111111111111111111111111', // системная программа Solana
  ],
  ton: [
    'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs', // мастер-контракт USDT в TON
    'EQDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff-W72r5gqPrHF', // пример из документации TON
  ],
  cosmos: [
    'cosmos1fl48vsnmsdzcv85q5d2q4z5ajdha8yu34mf0eh',
    'cosmos1t5u0jfg3ljsjrh2m9e47d4ny2hea7eehxrzdgd',
    'osmo1clpqr4nrk4khgkxj78fcwwh6dl3uw4epasmvnj',
    'bnb136ns6lfw4zs5hg4n85vdthaad7hq5m4gtkgf23', // BEP-2, кошелёк Binance
  ],
};

// Верные адреса опознаются своим семейством и только им.
// Это же покрывает «адрес другого семейства»: каждый адрес прогоняется
// через все проверки, и чужое семейство ни одна из них не присвоит.
for (const [family, addresses] of Object.entries(REAL)) {
  test(`${family}: настоящие адреса опознаются`, () => {
    for (const a of addresses) {
      const r = detectFamily(a);
      assert.equal(r.family, family, a);
      assert.equal(r.status, family === 'solana' ? 'no-checksum' : 'valid', a);
      assert.ok(r.networks.length > 0, a);
    }
  });
}

// Опечатка в одном знаке. Изменённый знак — последний, если не сказано иное.
const TYPOS = {
  evm: [
    '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96044',
    '0xd8da6BF26964aF9D7eEd9e03E53415D37aA96045', // сменился только регистр одной буквы
  ],
  tron: ['TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6u'],
  bitcoin: [
    '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNb',
    '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLz',
    'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5',
    'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj2',
  ],
  ton: ['EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDt'],
  cosmos: [
    'cosmos1fl48vsnmsdzcv85q5d2q4z5ajdha8yu34mf0ej',
    'bnb136ns6lfw4zs5hg4n85vdthaad7hq5m4gtkgf24',
  ],
};

for (const [family, addresses] of Object.entries(TYPOS)) {
  test(`${family}: опечатку отсекает контрольная сумма`, () => {
    for (const a of addresses) {
      assert.deepEqual(detectFamily(a), { family, status: 'bad-checksum' }, a);
    }
  });
}

// У Solana контрольной суммы нет, и честный результат — опечатку не поймать.
// Адрес с опечаткой остаётся формально верным: он просто чужой.
// Поэтому статус 'no-checksum', а не 'valid' — тексты для пользователя должны
// это учитывать.
test('solana: опечатку формат не ловит, и мы этого не скрываем', () => {
  const r = detectFamily('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1w');
  assert.equal(r.family, 'solana');
  assert.equal(r.status, 'no-checksum');
});

// EIP-55 необязателен: адрес целиком строчными — законная запись без контрольной суммы.
test('evm: адрес в одном регистре принимается, но без проверки суммы', () => {
  const r = detectFamily('0xd8da6bf26964af9d7eed9e03e53415d37aa96045');
  assert.equal(r.family, 'evm');
  assert.equal(r.status, 'no-checksum');
});

// TZ.md, раздел 3: префикс входит в контрольную сумму, чужой префикс не проходит.
test('cosmos: адрес Osmosis с префиксом cosmos не проходит', () => {
  const swapped = 'cosmos1' + 'osmo1clpqr4nrk4khgkxj78fcwwh6dl3uw4epasmvnj'.slice('osmo1'.length);
  assert.deepEqual(detectFamily(swapped), { family: 'cosmos', status: 'bad-checksum' });
});

// TZ.md, раздел 5: BEP-2 и BEP-20 путают по названию, форматы разные.
test('bnb1… — это BNB Beacon Chain, а не BNB Smart Chain', () => {
  assert.deepEqual(detectFamily(REAL.cosmos[3]).networks, ['BNB Beacon Chain (BEP-2)']);
  assert.ok(!detectFamily(REAL.cosmos[3]).networks.includes('BNB Smart Chain'));
  assert.ok(detectFamily(REAL.evm[2]).networks.includes('BNB Smart Chain'));
});

// TZ.md, раздел 5: устаревший формат Bitcoin Cash совпадает с Bitcoin.
test('bitcoin: у адресов 1… и 3… названа и Bitcoin Cash, у bc1… — нет', () => {
  assert.ok(detectFamily(REAL.bitcoin[0]).networks.some((n) => n.startsWith('Bitcoin Cash')));
  assert.ok(detectFamily(REAL.bitcoin[1]).networks.some((n) => n.startsWith('Bitcoin Cash')));
  assert.deepEqual(detectFamily(REAL.bitcoin[2]).networks, ['Bitcoin']);
});

test('неопознанное — не угадываем', () => {
  for (const s of [
    '',
    'привет',
    '0x1234', // слишком короткий
    'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx', // префикс тестовой сети Bitcoin
    'foo1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', // незнакомый префикс bech32
  ]) {
    assert.equal(detectFamily(s).family, null, s);
  }
});

test('пробелы и перевод строки по краям не мешают', () => {
  assert.equal(detectFamily('  ' + REAL.tron[0] + '\n').status, 'valid');
});

// Фраза ниже — общеизвестный тестовый пример из стандарта сид-фраз,
// специально для тестов; реальных денег за ней нет.
const TEST_PHRASE = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

test('сид-фраза в поле адреса узнаётся — двенадцать слов и двадцать четыре', () => {
  assert.equal(looksLikeSeedPhrase(TEST_PHRASE), true);
  assert.equal(looksLikeSeedPhrase(`${TEST_PHRASE} ${TEST_PHRASE}`), true);
  assert.equal(looksLikeSeedPhrase(`  ${TEST_PHRASE}\n`), true);
});

test('сид-фраза узнаётся и в том виде, как её показывают кошельки: с номерами, через запятую', () => {
  const words = TEST_PHRASE.split(' ');
  assert.equal(looksLikeSeedPhrase(words.map((w, i) => `${i + 1}. ${w}`).join(' ')), true);
  assert.equal(looksLikeSeedPhrase(words.map((w, i) => `${i + 1} ${w}`).join(' ')), true);
  assert.equal(looksLikeSeedPhrase(words.map((w, i) => `${i + 1}.${w}`).join('\n')), true);
  assert.equal(looksLikeSeedPhrase(words.join(', ')), true);
});

test('настоящие адреса за сид-фразу не принимаются', () => {
  for (const addresses of Object.values(REAL)) {
    for (const a of addresses) assert.equal(looksLikeSeedPhrase(a), false, a);
  }
  assert.equal(looksLikeSeedPhrase('abandon abandon abandon'), false); // слишком мало слов
  assert.equal(looksLikeSeedPhrase(''), false);
});
