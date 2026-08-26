import { createCharacterFoundryCardCodecs } from '@kirika-js/adapter-character-card-external'
import { createKirikaCardCodecs } from '@kirika-js/adapter-character-card-kirika'
import { CharacterCardCodecRegistry } from '@kirika-js/core/character-card'

export const cardCodecRegistry = new CharacterCardCodecRegistry([
  ...createKirikaCardCodecs(),
  ...createCharacterFoundryCardCodecs(),
])
