// Определение семейства адреса по строке (TZ.md, раздел 3).
//
// Только разбор строки: никаких обращений к блокчейну и в сеть вообще.
//
// Контрольные суммы не написаны по памяти, а взяты из двух библиотек
// одного автора — @noble/hashes (keccak-256, SHA-256) и @scure/base
// (Base58, Base58Check, bech32/bech32m). Обе прошли независимый аудит и
// не имеют своих зависимостей. Keccak для EIP-55 — сотня строк тонкой
// криптографии, писать её самим значило бы нарушить требование ТЗ.
// Сами здесь написаны только склейка и CRC16 для TON, которого в этих
// библиотеках нет.
//
// Результат detectFamily:
//   { family: null }                       — формат не опознан;
//   { family, status, networks }           — опознан, где status:
//     'valid'        — контрольная сумма сошлась;
//     'no-checksum'  — формат верный, но контрольной суммы в адресе нет,
//                      опечатку по нему не поймать (Solana всегда, EVM —
//                      когда адрес записан целиком строчными или заглавными);
//     'bad-checksum' — по виду адрес этого семейства, но контрольная сумма
//                      не сошлась: скорее всего, опечатка.
//   Для 'bad-checksum' сетей не указываем: адреса как такового нет.

// Библиотеки — копиями из vendor/, а не из node_modules: так их код лежит
// в репозитории открыто и его можно прочитать. Откуда и каких версий —
// vendor/README.md.
import { keccak_256 } from '../vendor/noble-hashes/sha3.js';
import { sha256 } from '../vendor/noble-hashes/sha2.js';
import { base58, createBase58check, bech32, bech32m } from '../vendor/scure-base/index.js';

const base58check = createBase58check(sha256);

// Списки сетей — из таблицы в TZ.md, раздел 3.
const EVM_NETWORKS = ['Ethereum', 'BNB Smart Chain', 'Polygon', 'Arbitrum', 'Optimism', 'Base', 'Avalanche C-Chain'];

// Устаревший формат Bitcoin Cash совпадает с форматом Bitcoin (TZ.md, раздел 5),
// поэтому для адресов 1… и 3… честно называем обе сети. Адресов bc1… у Bitcoin Cash нет.
const BITCOIN_LEGACY_NETWORKS = ['Bitcoin', 'Bitcoin Cash (устаревший формат адреса)'];
const BITCOIN_SEGWIT_NETWORKS = ['Bitcoin'];

// Префикс bech32 входит в контрольную сумму, так что адрес одной сети
// с приписанным чужим префиксом проверку не пройдёт. Незнакомые префиксы
// не угадываем: лучше «не опознано», чем неверное название сети.
const COSMOS_PREFIXES = {
  cosmos: 'Cosmos Hub',
  osmo: 'Osmosis',
  bnb: 'BNB Beacon Chain (BEP-2)',
};

export function detectFamily(input) {
  // Пробелы и перевод строки по краям — обычный спутник копирования.
  const s = String(input).trim();
  return detectEvm(s) || detectBech32(s) || detectTon(s) || detectBase58(s) || { family: null };
}

// EIP-55: регистр каждой буквы адреса задаётся хешем keccak-256
// от адреса в нижнем регистре. Адрес целиком в одном регистре —
// законная запись без контрольной суммы, её принимают кошельки.
function detectEvm(s) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(s)) return null;
  const hex = s.slice(2);
  const lower = hex.toLowerCase();
  if (hex === lower || hex === hex.toUpperCase()) {
    return { family: 'evm', status: 'no-checksum', networks: EVM_NETWORKS };
  }
  const hash = keccak_256(new TextEncoder().encode(lower));
  for (let i = 0; i < 40; i++) {
    const nibble = (hash[i >> 1] >> (i % 2 ? 0 : 4)) & 0xf;
    const expected = nibble >= 8 ? lower[i].toUpperCase() : lower[i];
    if (hex[i] !== expected) return { family: 'evm', status: 'bad-checksum' };
  }
  return { family: 'evm', status: 'valid', networks: EVM_NETWORKS };
}

// bech32 (BIP-173) и bech32m (BIP-350): Bitcoin bc1… и Cosmos-семейство.
function detectBech32(s) {
  const sep = s.lastIndexOf('1');
  if (sep < 1) return null;
  const prefix = s.slice(0, sep).toLowerCase();
  let family;
  if (prefix === 'bc') family = 'bitcoin';
  else if (prefix in COSMOS_PREFIXES) family = 'cosmos';
  else return null;

  const bad = { family, status: 'bad-checksum' };
  // Две кодировки различаются только константой в контрольной сумме,
  // поэтому строка проходит не больше чем одну из них.
  const plain = bech32.decodeUnsafe(s);
  const m = plain ? undefined : bech32m.decodeUnsafe(s);
  if (!plain && !m) return bad;

  if (family === 'cosmos') {
    // Cosmos использует только bech32; 20 байт — обычный счёт, 32 — контракт.
    const len = plain && bech32.fromWordsUnsafe(plain.words)?.length;
    if (len !== 20 && len !== 32) return bad;
    // `prefix` — машиночитаемый ключ для дерева исходов (src/outcome.js),
    // отдельно от `networks`: тот несёт название для человека и может
    // измениться от правки редактора, а логика должна опираться на что-то
    // устойчивое.
    return { family, status: 'valid', networks: [COSMOS_PREFIXES[prefix]], prefix };
  }

  // Сегвит: первое слово — версия. Версия 0 кодируется bech32 и несёт
  // 20 или 32 байта (BIP-173, адреса bc1q…), версии 1–16 — bech32m и от 2
  // до 40 байт (BIP-350, адреса bc1p…). Формат адреса задают именно эти два
  // стандарта; BIP-141 описывает сегвит как механику, а не формат адреса.
  // Сверено владельцем проекта 28 сентября 2026:
  // github.com/bitcoin/bips/blob/master/bip-0173.mediawiki
  // bips.dev/350/
  const [version, ...rest] = (plain || m).words;
  const program = bech32.fromWordsUnsafe(rest);
  if (version > 16 || !program) return bad;
  const ok = version === 0
    ? plain && (program.length === 20 || program.length === 32)
    : m && program.length >= 2 && program.length <= 40;
  // `variant` — тем же способом и по той же причине, что `prefix` у Cosmos
  // выше: опасный случай Bitcoin/Bitcoin Cash в src/outcome.js различает
  // устаревший формат и сегвит, а не текст названия сети.
  return ok ? { family, status: 'valid', networks: BITCOIN_SEGWIT_NETWORKS, variant: 'segwit' } : bad;
}

// TON: 48 знаков base64 или base64url, внутри 36 байт — флаги, номер
// цепочки, 32 байта адреса и 2 байта CRC16-XMODEM от первых 34.
// Флаги 0x11 (EQ…, bounceable) и 0x51 (UQ…, non-bounceable) — основная сеть;
// бит +0x80 в флаге — признак тестовой сети (тогда первые буквы получаются
// не EQ/UQ, а другие — regex ниже их и так не пропускает, тестовую сеть
// не опознаём). Сверено владельцем проекта по официальной документации
// TON, 28 сентября 2026:
// docs.ton.org/v3/documentation/smart-contracts/addresses/address-formats
function detectTon(s) {
  if (!/^[EU]Q[A-Za-z0-9+/_-]{46}$/.test(s)) return null;
  const bytes = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
  const crc = crc16xmodem(bytes.subarray(0, 34));
  if (crc !== ((bytes[34] << 8) | bytes[35])) return { family: 'ton', status: 'bad-checksum' };
  return { family: 'ton', status: 'valid', networks: ['TON'] };
}

function crc16xmodem(bytes) {
  let crc = 0;
  for (const b of bytes) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}

// Base58: Tron, Bitcoin 1…/3… и Solana.
// Tron и Bitcoin — Base58Check: версия + 20 байт + 4 байта двойного SHA-256,
// всего 25 байт. Версия 0x41 — Tron (отсюда буква T), 0x00 и 0x05 — Bitcoin.
// Байт версии для Tron сверен владельцем проекта по официальной
// документации TRON, 28 сентября 2026: developers.tron.network/docs/account
// Solana — просто 32 байта открытого ключа, контрольной суммы в формате нет.
function detectBase58(s) {
  let raw;
  try { raw = base58.decode(s); } catch { return null; }

  if (raw.length === 25) {
    let payload;
    try { payload = base58check.decode(s); } catch { /* контрольная сумма не сошлась */ }
    const version = raw[0];
    if (version === 0x41) {
      return payload ? { family: 'tron', status: 'valid', networks: ['Tron'] } : { family: 'tron', status: 'bad-checksum' };
    }
    if (version === 0x00 || version === 0x05) {
      // `variant: 'legacy'` — см. комментарий у 'segwit' выше, тот же смысл.
      return payload
        ? { family: 'bitcoin', status: 'valid', networks: BITCOIN_LEGACY_NETWORKS, variant: 'legacy' }
        : { family: 'bitcoin', status: 'bad-checksum' };
    }
    return null;
  }

  if (raw.length === 32) return { family: 'solana', status: 'no-checksum', networks: ['Solana'] };
  return null;
}
