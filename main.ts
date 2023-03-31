import {
  CollectionType,
  CreateMakerInput,
  LooksRare,
  Maker,
  StrategyType,
  SupportedChainId,
} from "@looksrare/sdk-v2";
import { BigNumber, ethers } from "ethers";
import { parseEther } from "ethers/lib/utils";
import fs from "fs";

require("dotenv").config();

// const provider = new ethers.providers.StaticJsonRpcProvider('https://rpc.ankr.com/eth', SupportedChainId.MAINNET)
const provider = new ethers.providers.StaticJsonRpcProvider(
  "https://rpc.ankr.com/eth_goerli",
  SupportedChainId.GOERLI
);

const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY!;
const signerWallet = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const baseMaker: CreateMakerInput = {
  collectionType: CollectionType.ERC721,
  collection: "0x77566D540d1E207dFf8DA205ed78750F9a1e7c55",
  currency: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
  subsetNonce: 0,
  orderNonce: 0,
  strategyId: StrategyType.standard,
  price: parseEther("0.21"),
  startTime: Math.floor(Date.now() / 1000),
  endTime: Math.floor(Date.now() / 1000) + 3600 * 24,
  itemIds: [117],
  amounts: [1],
};

async function testMakerAsk(sdk: LooksRare, makerInput: CreateMakerInput) {
  const output = await sdk.createMakerAsk(makerInput);

  if (!output.isCollectionApproved) {
    console.warn("Collection not approved yet, approving...");
    await sdk.approveAllCollectionItems(output.maker.collection, true);

    console.warn("Done\n");
  }

  if (!output.isTransferManagerApproved) {
    console.warn("Signer not approved transfer manager, approving...");

    if (!output.isCollectionApproved) {
      // Wait enough until the prev approve call finishes
      await sleep(1000);
    }
    await sdk.grantTransferManagerApproval().call();

    console.warn("Done\n");
  }

  return output;
}

async function testMakerBid(
  sdk: LooksRare,
  makerInput: CreateMakerInput,
  collectionOffer?: boolean
) {
  const output = collectionOffer
    ? await sdk.createMakerCollectionOffer(makerInput)
    : await sdk.createMakerBid(baseMaker);

  if (!output.isCurrencyApproved) {
    console.warn("Not enough ERC20 allowance, allowing more ...");
    await sdk.approveErc20(
      output.maker.currency,
      BigNumber.from(output.maker.price)
    );

    console.warn("Done\n");
  }
  return output;
}

function convertMakerString(maker: Maker) {
  return {
    ...maker,
    price: maker.price.toString(),
    subsetNonce: maker.subsetNonce.toString(),
    orderNonce: maker.orderNonce.toString(),
    globalNonce: maker.globalNonce.toString(),
  };
}

async function main() {
  const sdk = new LooksRare(SupportedChainId.GOERLI, provider, signerWallet);

  // // Single order (ask)
  // const { maker } = await testMakerAsk(sdk, baseMaker);
  // const signature = await sdk.signMakerOrder(maker);

  // fs.writeFileSync(
  //   "./orders/single.json",
  //   JSON.stringify(
  //     {
  //       ...convertMakerString(maker),
  //       signature,
  //     },
  //     null,
  //     2
  //   )
  // );

  // // Merkle tree order
  const { maker: maker1 } = await testMakerAsk(sdk, baseMaker);
  const { maker: maker2 } = await testMakerBid(
    sdk,
    {
      ...baseMaker,
      price: parseEther("0.25"),
    },
    true
  );

  const {
    signature,
    merkleTreeProofs,
    tree: { makerOrders },
  } = await sdk.signMultipleMakerOrders([maker1, maker2]);

  fs.writeFileSync(
    "./orders/tree.json",
    JSON.stringify(
      {
        signature,
        merkleTreeProofs,
        makerOrders: makerOrders.map((v) => convertMakerString(v)),
      },
      null,
      2
    )
  );
}

main();
