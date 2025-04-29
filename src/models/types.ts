// TODO: Split in different files

// Character types
export interface CharacterStats {
  strength: number
  dexterity: number
  constitution: number
  intelligence: number
  wisdom: number
  charisma: number
}

export interface Character {
  id: string
  name: string
  character_class: string
  race: string
  stats: CharacterStats
}

// Adventure types
export interface Adventure {
  id: string
  title: string
  description: string
  image?: string
  level: number
}

// Game types
export interface GameAction {
  id: string
  title: string
  description: string
  requirements?: {
    stats?: Partial<CharacterStats>
    items?: string[]
  }
}

export interface AdventureStep {
  id: string
  adventureId: string
  title: string
  description: string
  image?: string
  actions: GameAction[]
}
