import {
  describe,
} from "matchstick-as/assembly/index"

import {
  headArmorFromBag,
  headArmorToString,
  lootmartHelmId
} from '../src/utils'

import { log } from '@graphprotocol/graph-ts'

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  let bag = 3;
  log.info('Helm: {} {}', [bag.toString(), headArmorToString(headArmorFromBag(2))]);
  log.info('Helm ID {}',[lootmartHelmId(bag)])
});
