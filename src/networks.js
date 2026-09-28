// Реестр сетей, которые можно выбрать как «сеть отправки». Только данные
// для сопоставления с семейством адреса — никакого текста для
// пользователя здесь нет и не должно быть (названия — в src/texts.js).
//
// `family` — семейство из src/address.js, которому принадлежит сеть.
// `family: null` — формат этой сети не реализован в src/address.js, поэтому
// определить пригодность адреса нельзя (Avalanche X-Chain: у неё свой
// формат с префиксом, не 0x, как у C-Chain). Отсутствие поддержки — не
// повод угадывать: дерево исходов честно отвечает «не знаем».
// `prefix` — только у сетей семейства cosmos, сверяется с полем `prefix`,
// которое возвращает detectFamily для этого семейства.
//
// Bitcoin Cash сюда включён только из-за устаревшего формата адреса,
// совпадающего с Bitcoin: на этом совпадении деньги и уходят не туда.
// Ограничение «только устаревший формат» — в src/outcome.js, рядом с
// остальной логикой особых случаев, а не здесь: реестр — просто список,
// а не место для условий.
//
// `bnb-beacon-chain` остаётся в списке, хотя сама сеть остановлена
// 19 ноября 2024 года (исход F в src/outcome.js): человек мог выбрать её из списка
// сетей отправки по старой памяти или по путанице с BNB Smart Chain, и
// такой выбор дереву исходов всё ещё нужно уметь принять и разобрать.
// Исход для адресов этой сети (bnb1…) вычисляется в src/outcome.js
// раньше обычного сопоставления и не зависит от того, что выбрано здесь.

export const NETWORKS = {
  ethereum: { family: 'evm' },
  'bnb-smart-chain': { family: 'evm' },
  polygon: { family: 'evm' },
  arbitrum: { family: 'evm' },
  optimism: { family: 'evm' },
  base: { family: 'evm' },
  'avalanche-c-chain': { family: 'evm' },

  tron: { family: 'tron' },
  solana: { family: 'solana' },
  ton: { family: 'ton' },

  bitcoin: { family: 'bitcoin' },
  'bitcoin-cash': { family: 'bitcoin' },

  'cosmos-hub': { family: 'cosmos', prefix: 'cosmos' },
  osmosis: { family: 'cosmos', prefix: 'osmo' },
  'bnb-beacon-chain': { family: 'cosmos', prefix: 'bnb' },

  'avalanche-x-chain': { family: null },
};
