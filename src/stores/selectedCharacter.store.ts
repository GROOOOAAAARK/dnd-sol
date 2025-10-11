import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Character } from '@/models/types'
// import type {} from '@redux-devtools/extension' // required for devtools typing

interface BearState {
  selectedCharacter: Character | null
  setCharacter: (character: Character) => void
}

const useCharacterStore = create<BearState>()(
  devtools(
    persist(
      (set) => ({
        selectedCharacter: null,
        setCharacter: (character) => set(() => ({ selectedCharacter: character })),
      }),
      {
        name: 'character-storage',
      },
    ),
  ),
)

export { useCharacterStore };