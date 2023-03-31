## How to use the script

### Environment
Node.js v18

```bash
$ yarn
$ cp .env.example .env
$ # Update WALLET_PRIVATE_KEY in your .env
```

### Generate order payload

Update `baseMaker` in `main.ts` with the data you need.

Use different function `testMakerAsk` or `testMakerBid` based on your need.

Use this command to run the script and get the order data generated.

```bash
$ yarn dev
```

Grab order payload from `orders/single.json` or `orders/tree.json`, and send an API request with that payload.
