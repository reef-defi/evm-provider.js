# @reef-defi/evm-provider.js

`evm-provider.js` implements a web3 provider which can interact with the [Reef chain EVM](https://github.com/reef-defi/reef-chain).

If you only care about developing Solidity contracts on the Reef chain, `@reef-defi/evm-provider.js` is used in our [Hardhat Reef environment](https://github.com/reef-defi/hardhat-reef). The environment simplifies and abstracts all the low-level intricacies, so you can only focus on the Solidity part. See [hardhat-reef-examples repo](https://github.com/reef-defi/hardhat-reef-examples/blob/master/scripts/flipper/deploy.js) for more examples.

If you need more control, then it can also be used as a Substrate provider to query or to interact with the Reef chain using the same calls as in the [Polkadot.js](https://polkadot.js.org/docs/api).

## Installation

Install dependencies with `yarn` [see issue](https://github.com/reef-defi/evm-provider.js/issues/5#issuecomment-912389541).

### Yarn

```bash
yarn add @reef-defi/evm-provider
```

If you are planning to use the `evm-provider.js` with the `ethers` package, include the following resolutions in your `package.json` file:

```json
  "resolutions": {
    "@ethersproject/abstract-signer": "5.0.9",
    "@ethersproject/abstract-provider": "5.0.9",
    "@ethersproject/bignumber": "5.0.9",
    "@ethersproject/bytes": "5.0.9",
    "@ethersproject/logger": "5.0.9",
    "@ethersproject/properties": "5.0.9"
  }
```

to force the use of the correct dependencies for the `AbstractProvider` and `AbstractSigner`.

## Getting started

To create a `Provider` instance, use the following code:

```javascript
import {
  TestAccountSigningKey,
  Provider,
  Signer,
} from "@reef-defi/evm-provider";
import { WsProvider, Keyring } from "@polkadot/api";
import { createTestPairs } from "@polkadot/keyring/testingPairs";
import { KeyringPair } from "@polkadot/keyring/types";

const WS_URL = process.env.WS_URL || "ws://127.0.0.1:9944";
const seed = process.env.SEED;

const setup = async () => {
  const provider = new Provider({
    provider: new WsProvider(WS_URL),
  });

  await provider.api.isReady;

  let pair: KeyringPair;
  if (seed) {
    const keyring = new Keyring({ type: "sr25519" });
    pair = keyring.addFromUri(seed);
  } else {
    const testPairs = createTestPairs();
    pair = testPairs.alice;
  }

  const signingKey = new TestAccountSigningKey(provider.api.registry);
  signingKey.addKeyringPair(pair);

  const signer = new Signer(provider, pair.address, signingKey);

  // Claim default account
  if (!(await signer.isClaimed())) {
    console.log(
      "No claimed EVM account found -> claimed default EVM account: ",
      await signer.getAddress()
    );
    await signer.claimDefaultAccount();
  }

  return {
    signer,
    provider,
  };
};

export default setup;
```

with this object you can interact with the Substrate chain.

## EVM interaction

Most, but not all, of `evm-provider.js` API is compatible with `ethers.js`. If you are not familiar with `ethers.js`, you can start by looking at its [documentation](https://docs.ethers.io/v5/single-page/). See our [Reefswap example](https://github.com/reef-defi/reefswap/blob/653e6f4e77d228bba32fe233bff4a4811eae335e/src/deploy.ts) on how it uses the above `setup` script to deploy and interact with the EVM.

### Get EVM address

```js
// ethers
let accounts = await this.provider.listAccounts();
let selectedAccount = accounts[0];

// evm-provider
let selectedAccount = await this.signer.queryEvmAddress();
```

### Provider

The Provider provides an API for interacting with nodes and is an instance of `ethers.js` [AbstractProvider](https://docs.ethers.io/v5/single-page/#/v5/api/providers/-%23-providers).

### Signer

The Signer class can sign transactions and messages using a private key. When using the wallet for the first time, make sure to always claim the EVM account for the wallet you are using:

```javascript
wallet.claimDefaultAccount();
```

before performing any EVM calls otherwise it may lead to `InsufficientBalance` errors.
