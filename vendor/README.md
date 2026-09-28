# Копии библиотек

Здесь лежат файлы двух библиотек, на которых держится проверка контрольных сумм адресов. Они скопированы как есть, без единой правки, и не собраны в один файл: любой может открыть их и убедиться, что код никуда не отправляет адрес.

Взяты только файлы, которые реально используются в `src/address.js`, и файлы, которые они сами подключают. Остальное из пакетов не нужно.

| Пакет | Версия | Лицензия | Откуда взято (путь внутри пакета) | Куда положено |
|---|---|---|---|---|
| `@noble/hashes` | 2.4.0 | MIT | `sha3.js`, `sha2.js`, `_md.js`, `_u64.js`, `utils.js`, `LICENSE` | `vendor/noble-hashes/` |
| `@scure/base` | 2.4.0 | MIT | `index.js`, `LICENSE` | `vendor/scure-base/` |

Скопировано 28 сентября 2026 из пакетов, установленных через npm.

Что из этого используется: `keccak_256` (из `sha3.js`) — для EIP-55, `sha256` (из `sha2.js`) — для Base58Check, `base58`, `createBase58check`, `bech32`, `bech32m` (из `index.js`). Файлы `_md.js`, `_u64.js`, `utils.js` подключают сами `sha2.js` и `sha3.js`.

## Контрольные суммы SHA-256

По ним видно, что копия осталась копией.

```
9a81e1edb24eae27b335533220167609cfb58008c5690e140ce478acdc669f32  noble-hashes/sha3.js
471746bba6ec4c6238ca41358d1d3b40b6ff31cf3363f0b4d550c649c1a8e83b  noble-hashes/sha2.js
60cf3010fda89e3e4d3f0e7ff1ce249e9c467f34b4fd41b6fd6101d9f69be763  noble-hashes/_md.js
b09da8c07fe8187c07649494cdb7cd0bcf13df90b506a9473d19e4d5f8c2e102  noble-hashes/_u64.js
037ad49adb78168b6b699598fd33f85f7877456b1d28b4d032e2a1a16807947c  noble-hashes/utils.js
4f221aee6e072336700c408c68ab3b96a3fc09f6aebe6f48f1bd99e5ef13faec  noble-hashes/LICENSE
4bd334e6606db7216143c7bffbc5c00716d2c137744a0c48b51495fa6d05444a  scure-base/index.js
3239e134eb6e6d64538ca76498c7fcb08a395249dd9d4af9927bf6d0169ee429  scure-base/LICENSE
```

## Как обновить

1. В папке проекта: `npm install --no-save @noble/hashes@НОВАЯ_ВЕРСИЯ @scure/base@НОВАЯ_ВЕРСИЯ`
2. Скопировать те же файлы из `node_modules/@noble/hashes/` и `node_modules/@scure/base/` поверх этих. Если новая версия подключает другие файлы — проверить строки `import` в скопированных файлах и добавить недостающие.
3. Обновить версии, дату и контрольные суммы в этом файле.
4. `npm test` — все тесты должны пройти.
5. Удалить папку `node_modules`: проект работает без неё.
