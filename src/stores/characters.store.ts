import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Character } from '@/models/types'
// import type {} from '@redux-devtools/extension' // required for devtools typing

interface BearState {
  characters: Character[]
  setCharacters: (characters: Character[]) => void
  addCharacter: (character: Character) => void
}

const useCharactersStore = create<BearState>()(
  devtools(
    persist(
      (set) => ({
        characters: [],
        setCharacters: (characters) => set(() => ({ characters: characters })),
        addCharacter: (character: Character) => set((state) => ({ characters: [...state.characters, character] })),
      }),
      {
        name: 'character-storage',
      },
    ),
  ),
)

export { useCharactersStore };