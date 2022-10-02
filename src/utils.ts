import { BigInt } from "as-bigint"
import { crypto } from '@graphprotocol/graph-ts'
import { ByteArray } from '@graphprotocol/graph-ts'
import { encode as encodeHex } from 'as-hex';

export function lootmartHelmId(bagId: u32): string {
    const HEAD = 0x2;
    var components = headArmorFromBag(bagId)
    var id = BigInt.from(HEAD);
    id = id.add(encodeComponent(components.type - 1, 1));
    id = id.add(encodeComponent(components.suffix, 2));
    id = id.add(encodeComponent(components.namePrefix, 3));
    id = id.add(encodeComponent(components.nameSuffix, 4));
    id = id.add(encodeComponent(components.aug, 5));
    return id.toString();
  }
  
  export function encodeComponent(component: u32, idx: u32): BigInt {
    const SHIFT = 16;
    return BigInt.from(component).bitwiseAnd(0xff).leftShift(SHIFT * idx) //(component & 0xff) << (SHIFT * idx);
  }
  
  class LootComponents {
    type: u32; 
    suffix: u32; 
    namePrefix: u32;
    nameSuffix: u32; 
    aug: u32
  };

  class LootComponentStrings {
    type: string; 
    suffix: string; 
    namePrefix: string;
    nameSuffix: string; 
    aug: string
  };
  
  export function headArmorFromBag(bagId: u32): LootComponents {
    const rand = BigInt.from(crypto.keccak256(ByteArray.fromHexString(encodeHex('HEAD' + bagId.toString()))).toHexString());
  
    let type = rand.mod(headArmor.length).toUInt32() + 1;
    let suffix = 0;
    let namePrefix = 0;
    let nameSuffix = 0;
    let aug = 0;
    let greatness = rand.mod(21).toUInt32();
    if (greatness > 14) {
      suffix = rand.mod(suffixes.length).toUInt32() + 1;
    }
    if (greatness >= 19) {
      namePrefix = rand.mod(namePrefixes.length).toUInt32() + 1;
      nameSuffix = rand.mod(nameSuffixes.length).toUInt32() + 1;
      if (greatness == 19) {
        // ...
      } else {
        aug = 1;
      }
    }
    return { type, suffix, namePrefix, nameSuffix, aug };
  }

  export function headArmorComponentStrings(lootComponents: LootComponents): LootComponentStrings {
    let type = headArmor[lootComponents.type - 1];
    let suffix = (lootComponents.suffix > 0) ? suffixes[lootComponents.suffix - 1] : "";
    let namePrefix = (lootComponents.namePrefix > 0) ? namePrefixes[lootComponents.namePrefix - 1] : "";
    let nameSuffix = (lootComponents.nameSuffix > 0) ? nameSuffixes[lootComponents.nameSuffix - 1] : "";
    let aug = lootComponents.aug ? "+1" : "";

    return { type, suffix, namePrefix, nameSuffix, aug };
  }
  
  export function headArmorToString(lootComponents: LootComponents): string {
    let result = headArmor[lootComponents.type - 1];
    
    if (lootComponents.suffix > 0) {
      result += ' ' + suffixes[lootComponents.suffix - 1];
    }
    if (lootComponents.namePrefix > 0) {
      result = '"' + namePrefixes[lootComponents.namePrefix - 1] + ' ' + nameSuffixes[lootComponents.nameSuffix - 1] + '" ' + result;
    }
    if (lootComponents.aug) {
      result += ' +1';
    }
    return result;
  }
  
  export const headArmor = [
    "Ancient Helm",
    "Ornate Helm",
    "Great Helm",
    "Full Helm",
    "Helm",
    "Demon Crown",
    "Dragon's Crown",
    "War Cap",
    "Leather Cap",
    "Cap",
    "Crown",
    "Divine Hood",
    "Silk Hood",
    "Linen Hood",
    "Hood"
  ];
  
  const suffixes = [
    'of Power',
    'of Giants',
    'of Titans',
    'of Skill',
    'of Perfection',
    'of Brilliance',
    'of Enlightenment',
    'of Protection',
    'of Anger',
    'of Rage',
    'of Fury',
    'of Vitriol',
    'of the Fox',
    'of Detection',
    'of Reflection',
    'of the Twins',
  ];
  
  const namePrefixes = [
    'Agony',
    'Apocalypse',
    'Armageddon',
    'Beast',
    'Behemoth',
    'Blight',
    'Blood',
    'Bramble',
    'Brimstone',
    'Brood',
    'Carrion',
    'Cataclysm',
    'Chimeric',
    'Corpse',
    'Corruption',
    'Damnation',
    'Death',
    'Demon',
    'Dire',
    'Dragon',
    'Dread',
    'Doom',
    'Dusk',
    'Eagle',
    'Empyrean',
    'Fate',
    'Foe',
    'Gale',
    'Ghoul',
    'Gloom',
    'Glyph',
    'Golem',
    'Grim',
    'Hate',
    'Havoc',
    'Honour',
    'Horror',
    'Hypnotic',
    'Kraken',
    'Loath',
    'Maelstrom',
    'Mind',
    'Miracle',
    'Morbid',
    'Oblivion',
    'Onslaught',
    'Pain',
    'Pandemonium',
    'Phoenix',
    'Plague',
    'Rage',
    'Rapture',
    'Rune',
    'Skull',
    'Sol',
    'Soul',
    'Sorrow',
    'Spirit',
    'Storm',
    'Tempest',
    'Torment',
    'Vengeance',
    'Victory',
    'Viper',
    'Vortex',
    'Woe',
    'Wrath',
    "Light's",
    'Shimmering',
  ];
  
  const nameSuffixes = [
    'Bane',
    'Root',
    'Bite',
    'Song',
    'Roar',
    'Grasp',
    'Instrument',
    'Glow',
    'Bender',
    'Shadow',
    'Whisper',
    'Shout',
    'Growl',
    'Tear',
    'Peak',
    'Form',
    'Sun',
    'Moon',
  ];