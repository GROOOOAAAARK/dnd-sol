import type { Character } from '@/models/types';

// Mock data for characters
export const mockCharacters: Character[] = [
    {
      id: "char1",
      name: "Thorgar",
      character_class: "Warrior",
      race: "Dwarf",
      stats: {
        strength: 16,
        dexterity: 12,
        constitution: 18,
        intelligence: 8,
        wisdom: 10,
        charisma: 9,
      },
    },
    {
      id: "char2",
      name: "Elindra",
      character_class: "Mage",
      race: "Elf",
      stats: {
        strength: 8,
        dexterity: 14,
        constitution: 10,
        intelligence: 18,
        wisdom: 16,
        charisma: 14,
      },
    },
  ]
