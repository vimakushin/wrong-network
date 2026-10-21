# Wrong network

A page for people who sent crypto on the wrong network. It explains what happened and what can and cannot be done about it.

You paste the address you sent to, choose the network you sent on, and say who owns the address: your own wallet, someone else's wallet, or an exchange deposit address. The page gives an outcome, from "the send could not have happened" to "most likely lost", with the steps that apply. It does not promise that anything comes back. For some cases the answer is that it depends on the exchange, or that there is probably nothing to be done.

**Open it:** https://vimakushin.github.io/wrong-network/ (the page itself is in Russian only)

[Русская версия этого файла](README.ru.md)

![The page's answer for a sample address, in a browser window the width of a phone: the headline "Поправимо своими силами" ("fixable by you") and a sentence under it, then a framed warning that no real person will ask for a seed phrase or private key, then the first numbered steps.](docs/answer.png)

The screenshot is cut off after the first steps. It was made with the sample address from the EIP-55 standard, which the standard gives for examples.

**Status: work in progress.** The first version is published. It has not been tried on real users yet, and several parts are open (see "What is open").

## Why this problem

Address checkers answer one question: is the format valid? They say "valid" and stop. A person who has just sent funds to the wrong network is asking something else: is my money gone?

The answer does not depend on the network. It depends on who holds the key on the other side.

- Many networks (Ethereum, BNB Smart Chain, Polygon and others) share one address format, and one private key controls that address on every network of that kind. If the coins went to your own wallet on such a network, they are usually still yours: you add that network to the wallet and, with a little of its native coin for the fee, move them.
- If they went to an exchange deposit address, the exchange holds the key, and what happens next is its decision.
- If they went to a contract address that has no key behind it, they are most likely lost.

The same mistake can be easy to fix, or it can be a loss that cannot be undone. The page is there to say which of the two it looks like.

## What it does not do

- **It does not promise a refund.** The wording is written so that it does not read as "we will get it back". Where the outcome is uncertain, the page says so ("depends on the exchange, no guarantees"). Where the money is most likely lost, it says that too.
- **It does not ask for a seed phrase or a private key.** There is no field for either. If something that looks like a seed phrase (twelve or more words) is pasted into the address field, the page clears the field at once and says the phrase was not accepted and not sent anywhere. A private key is a string of hexadecimal digits, and the page does not try to recognise one.
- **It warns about scammers in every answer, whatever the outcome.** Scammers target people who have lost crypto: "send me your seed phrase and I will return it", "pay a fee to unlock it". The warning says that no real person will ask for a seed phrase or a private key, and that paying in advance for a "return" does not work. It is the same text in every answer, on purpose: if it varied by outcome, one version could be left softer or out of date.
- **It does not send you to recovery firms.** There are no links to firms that promise to get money back. The one outside tool it names is BNB Chain's own open-source recovery tool, in the case of the discontinued BNB Beacon Chain. It is named as plain text, not as a clickable link.
- **It does not look at the blockchain.** It does not check balances, find transactions or connect wallets.

## Design: no colour carries meaning

The page is one dark theme, and no colour on it means anything. There is no green for "fixable" and no red for "lost". The outcome is told in words.

The reason is who reads it. A red frame around "cannot be recovered" is hard to take for someone who has just lost money, and it explains nothing. A green frame around "can be recovered" is a promise the page cannot keep. So the parts of an answer (headline, note, warning) are told apart by size, font weight, a rule and position on the page. Every colour in the stylesheet is a background, a grey, or the colour of the text itself. The reasoning is in a comment at the top of [`style.css`](style.css).

## Design: nothing is sent anywhere

Everything is computed in your browser. The page has no server of its own that receives what you type. The address is not sent, not stored, and not looked up in any service. (The files are hosted on GitHub Pages, as for any static site.)

This matters for more than privacy. People who have just lost money have good reason to distrust anything that asks for their address.

- The page makes no network requests while it works. A Content-Security-Policy in [`index.html`](index.html) tells the browser to refuse them: scripts and styles from the same site only, every other kind of connection blocked.
- The page uses system fonts, because a web font would be a request to someone else's server.
- The address check relies on two libraries (`@noble/hashes`, `@scure/base`). Their files are copied into [`vendor/`](vendor/) unmodified and not merged into one file, so that they can be read in full. Versions and checksums are in [`vendor/README.md`](vendor/README.md). Loading them from a CDN would be a network request, which the page promises not to make.

## What is in the first version

- The address family is worked out from the format: EVM (`0x…`), Tron, Solana, Bitcoin, TON, and the Cosmos family (`cosmos1…`, `osmo1…`, `bnb1…`). You can choose from 16 sending networks.
- Outcomes:
  - the mistake could not have happened (the network does not accept that kind of address);
  - fixable by you (own wallet, another network sharing the address format);
  - fixable, but only by the other person (someone else's wallet);
  - depends on the exchange;
  - most likely lost;
  - the discontinued BNB Beacon Chain, where recovery may be possible through BNB Chain's tool, with no guarantee.
- Three more answers: no network mistake (address and network match, and there is nothing to fix); the address is not recognised; the address looks like it has a typo.
- Steps for the fixable cases and, for exchanges, what to write in the support request.
- Separate explanations for known dangerous cases: legacy Bitcoin and Bitcoin Cash addresses share one format, BNB Beacon Chain (BEP-2) against BNB Smart Chain (BEP-20), and Avalanche's separate chains.
- Laid out for phone widths. Last checked on 8 October 2026 in a desktop browser at 320, 360 and 390 px, with no horizontal scroll.
- There are automated tests; run them with `npm test`.

## What is open

- **Not tried on real users.** It is not yet known whether the wording helps someone who has just made this mistake. That can only be found out with real people.
- **Not checked on a real phone.** The checks so far were in a desktop browser at phone widths. Firefox and Android have not been checked.
- **Sending to a contract address is detected only for a short list.** The page has three token contract addresses on a list. For any other address it says nothing about contracts, and an address missing from the list does not mean it is a wallet.
- **The wording for "fixable" is conditional.** The explanation says "if the money went to another network of the same family" (networks that share one address format), because the page does not know which network the person meant to use.
- **There is no English version of the page yet.**
- **No rules for individual exchanges.** For deposit addresses the page can only say that the outcome depends on the exchange.
- **Statements about networks and exchanges need re-checking.** The address of BNB Chain's recovery tool was last checked by the author on 22 October 2026: the repository is live, not archived, and its description matches. The network names and the BNB Beacon Chain shutdown date were checked by the author on 28 September 2026 and not since. The tool belongs to someone else, so it has to be checked again before each publication.

## Running it

```
npm test
```

To open the page locally, serve the folder with any static file server. `index.html` is generated by `node scripts/build-page.js` from [`src/page.template.html`](src/page.template.html), [`src/texts.js`](src/texts.js) and the network list; edit those, not the generated file.

## License

[MIT](LICENSE)
