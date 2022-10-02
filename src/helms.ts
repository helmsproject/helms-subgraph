import { ethereum, BigInt } from '@graphprotocol/graph-ts';
import { decode as decodeBase64 } from "as-base64";
import { JSON } from "assemblyscript-json";
import { lootmartHelmId, headArmorFromBag, headArmorComponentStrings, headArmorToString } from './utils';

import {
  Helms,
  Claimed,
  Minted,
  OwnershipTransferred,
  TransferBatch as TransferBatchEvent,
  TransferSingle as TransferSingleEvent,
} from "../generated/helms/helms"

import {
  Account,
  HelmTokenRegistry,
  Helm,
  Balance,
  Transfer,
  LootBag,
} from '../generated/schema';

import {
  constants,
  events,
  integers,
  transactions,
} from '@amxx/graphprotocol-utils';

import { Transfer as LootTransferEvent } from '../generated/loot/loot';

function replaceAll(input: string, search: string[], replace: string): string {
  let result = '';
  for (let i = 0; i < input.length; i++) {
    result += search.includes(input.charAt(i)) ? replace : input.charAt(i);
  }
  return result;
}

function fetchToken(registry: HelmTokenRegistry, id: BigInt): Helm {
  let token = Helm.load(id.toString());
  if (token == null) {
    token = new Helm(id.toString());
    token.maxSupply = constants.BIGINT_ZERO;
    token.totalSupply = constants.BIGINT_ZERO;
  }
  token.registry = registry.id;
  return token as Helm;
}

function fetchBalance(token: Helm, account: Account): Balance {
  let balanceid = token.id.concat('-').concat(account.id);
  let balance = Balance.load(balanceid);
  if (balance == null) {
    balance = new Balance(balanceid);
    balance.helm = token.id;
    balance.account = account.id;
    balance.value = constants.BIGINT_ZERO;
  }
  return balance as Balance;
}

function registerTransfer(
  event: ethereum.Event,
  suffix: string,
  registry: HelmTokenRegistry,
  operator: Account,
  from: Account,
  to: Account,
  id: BigInt,
  value: BigInt
): void {
  let token = fetchToken(registry, id);
  let contract = Helms.bind(event.address);
  let ev = new Transfer(events.id(event).concat(suffix));

  ev.transaction = transactions.log(event).id;
  ev.timestamp = event.block.timestamp;
  ev.helm = token.id;
  ev.operator = operator.id;
  ev.from = from.id;
  ev.to = to.id;
  ev.value = value;

  if (from.id == constants.ADDRESS_ZERO.toHex()) {
    token.totalSupply = integers.increment(token.totalSupply, value);
  } else {
    let balance = fetchBalance(token, from);
    balance.value = integers.decrement(balance.value, value);
    balance.save();
    ev.fromBalance = balance.id;
  }

  if (to.id == constants.ADDRESS_ZERO.toHex()) {
    token.totalSupply = integers.decrement(token.totalSupply, value);
  } else {
    let balance = fetchBalance(token, to);
    balance.value = integers.increment(balance.value, value);
    balance.save();
    ev.toBalance = balance.id;
  }

  let callResult = contract.try_uri(id);
  if (!callResult.reverted) {
    let decodedURI: JSON.Obj = <JSON.Obj>JSON.parse(decodeBase64((callResult.value as String).split(',')[1]))
    token.name = decodedURI.getString('name')!.valueOf()
  }

  token.save();
  ev.save();
}

export function handleTransferSingle(event: TransferSingleEvent): void {
  let registry = new HelmTokenRegistry(event.address.toHex());
  let operator = new Account(event.params.operator.toHex());
  let from = new Account(event.params.from.toHex());
  let to = new Account(event.params.to.toHex());
  registry.save();
  operator.save();
  from.save();
  to.save();

  registerTransfer(
    event,
    '',
    registry,
    operator,
    from,
    to,
    event.params.id,
    event.params.value
  );
}

export function handleTransferBatch(event: TransferBatchEvent): void {
  let registry = new HelmTokenRegistry(event.address.toHex());
  let operator = new Account(event.params.operator.toHex());
  let from = new Account(event.params.from.toHex());
  let to = new Account(event.params.to.toHex());
  registry.save();
  operator.save();
  from.save();
  to.save();

  let ids = event.params.ids;
  let values = event.params.values;
  for (let i = 0; i < ids.length; ++i) {
    registerTransfer(
      event,
      '-'.concat(i.toString()),
      registry,
      operator,
      from,
      to,
      ids[i],
      values[i]
    );
  }
}

export function handleClaimed(event: Claimed): void { 
  let bag = LootBag.load(event.params.lootId.toString());
  bag!.claimed = true;
  bag!.publicClaim = false;
  bag!.save()
}

export function handleMinted(event: Minted): void {
  let bag = LootBag.load(event.params.lootId.toString());
  bag!.claimed = true;
  bag!.publicClaim = true;
  bag!.save()
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void { }

export function handleLootTransfer(event: LootTransferEvent): void {
  let fromAddress = event.params.from;
  let fromId = fromAddress.toHex();
  //If mint event:
  if (fromId == constants.ADDRESS_ZERO.toHex()) {
    let tokenId = event.params.tokenId;
    let bag = LootBag.load(tokenId.toString());
    if (bag == null) {
      bag = new LootBag(tokenId.toString());
      if (tokenId.toI32()<7778){
        bag.claimed = false;
      } else {
        bag.claimed = true; // Mark owner reserved bags as claimed
      }
      bag.publicClaim = false;
      let components = headArmorFromBag(tokenId.toU32());
      if (components.type < 6) { // if bag contains a helm
        let helmId = lootmartHelmId(tokenId.toU32());
        let helm = Helm.load(helmId.toString());
        if (helm == null) {
          let componentStrings = headArmorComponentStrings(components);
          helm = new Helm(helmId.toString());
          helm.name = headArmorToString(components);
          helm.prefix = componentStrings.namePrefix;
          helm.suffix = componentStrings.nameSuffix;
          helm.order = componentStrings.suffix == "" ? "" : 
                       componentStrings.suffix == "of the Fox" ? "The Fox" : 
                       componentStrings.suffix == "of the Twins" ? "The Twins" : 
                       componentStrings.suffix.split(" ")[1];
          helm.plusOne = components.aug ? true : false;
          helm.maxSupply = BigInt.fromU32(1);
          helm.rarity = 'mythic';
          helm.totalSupply = constants.BIGINT_ZERO;
        } else {
          helm.maxSupply = integers.increment(helm.maxSupply, BigInt.fromU32(1));
          helm.rarity = helm.maxSupply.gt(BigInt.fromU32(300)) ? 'common' : helm.maxSupply.gt(BigInt.fromU32(2)) ? 'epic' : helm.maxSupply.gt(BigInt.fromU32(1)) ? 'legendary' : 'mythic';
        }
        bag.helm = helm.id;
        helm.save()
      }
      bag.save()
    }

    // Hack to also create helms for unminted bags 
    // (create bags from the opposite direction, regardless of whether bag is really minted)
    tokenId = BigInt.fromU32(8001).minus(tokenId)
    bag = LootBag.load(tokenId.toString());
    if (bag == null) {
      bag = new LootBag(tokenId.toString());
      if (tokenId.toI32()<7778){
        bag.claimed = false;
      } else {
        bag.claimed = true; // Mark owner reserved bags as claimed
      }
      bag.publicClaim = false;
      let components = headArmorFromBag(tokenId.toU32());
      if (components.type < 6) { // if bag contains a helm
        let helmId = lootmartHelmId(tokenId.toU32());
        let helm = Helm.load(helmId.toString());
        if (helm == null) {
          let componentStrings = headArmorComponentStrings(components);
          helm = new Helm(helmId.toString());
          helm.name = headArmorToString(components);
          helm.prefix = componentStrings.namePrefix;
          helm.suffix = componentStrings.nameSuffix;
          helm.order = componentStrings.suffix == "" ? "" : 
                       componentStrings.suffix == "of the Fox" ? "The Fox" : 
                       componentStrings.suffix == "of the Twins" ? "The Twins" : 
                       componentStrings.suffix.split(" ")[1];
          helm.plusOne = components.aug ? true : false;
          helm.maxSupply = BigInt.fromU32(1);
          helm.rarity = 'mythic';
          helm.totalSupply = constants.BIGINT_ZERO;
        } else {
          helm.maxSupply = integers.increment(helm.maxSupply, BigInt.fromU32(1));
          helm.rarity = helm.maxSupply.gt(BigInt.fromU32(300)) ? 'common' : helm.maxSupply.gt(BigInt.fromU32(2)) ? 'epic' : helm.maxSupply.gt(BigInt.fromU32(1)) ? 'legendary' : 'mythic';
        }
        bag.helm = helm.id;
        helm.save()
      }
      bag.save()
    }
  }
}