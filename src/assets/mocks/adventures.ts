import type { Adventure, AdventureStep } from "@/models/types";

// Mock data for adventures
export const mockAdventures: Adventure[] = [
  {
    id: "adv1",
    title: "The Forgotten Ruins",
    description:
      "Explore ancient ruins filled with traps and treasures. Legend says a powerful artifact lies within.",
    level: 1,
    image: "/images/forgotten-ruins.png",
    first_step_id: "step1_adv1",
  },
  {
    id: "adv4",
    title: "The Shadow Keep",
    description:
      "A foreboding dungeon carved into the hillside. Dark rumors speak of treasures guarded by unspeakable horrors within its depths.",
    level: 1,
    image: "/images/shadow-keep.png",
    first_step_id: "step1_adv4",
  },
];

export const mockOngoingAdventures: Adventure[] = [];

// Mock data for game steps
export const mockGameSteps: Record<string, AdventureStep> = {
  step1_adv1: {
    id: "step1_adv1",
    adventureId: "adv1",
    title: "The Entrance",
    description:
      "You stand before the crumbling entrance to the ancient ruins. Moss covers the stone archway, and a cool breeze emanates from within. The path ahead is dark, but you can make out faint glimmers of light deeper inside.",
    image: "/placeholder.svg?height=300&width=800&text=Ruins+Entrance",
    actions: [
      {
        id: "action1",
        title: "Enter cautiously",
        description:
          "Move slowly and carefully, keeping an eye out for traps or dangers.",
        success_next_step_id: "stepEnteredCautiouslySuccess",
      },
      {
        id: "action2",
        title: "Search the entrance",
        description:
          "Look for clues, hidden mechanisms, or valuable items before proceeding.",
        success_next_step_id: "stepSearchEntranceOngoing",
      },
    ],
  },
  stepEnteredCautiouslySuccess: {
    id: "stepEnteredCautiouslySuccess",
    adventureId: "adv1",
    title: "The Patio",
    description:
      "You successfully entered the dungeon, welcome !",
    actions: [],
  },
  stepSearchEntranceOngoing: {
    id: "stepSearchEntranceOngoing",
    adventureId: "adv1",
    title: "The Entrance",
    description:
      "You managed to search the entrance, but you need to find another way to enter the dungeon.",
    actions: [
      {
        id: "action1",
        title: "Get back to the door",
        description:
          "Get back from where you come from, in front of the dungeon's entrance.",
        success_next_step_id: "step1_adv1",
      },
    ],
  },

  // ===== ADVENTURE 4: THE SHADOW KEEP =====
  // Initial Step
  step1_adv4: {
    id: "step1_adv4",
    adventureId: "adv4",
    title: "The Dungeon Entrance",
    description:
      "You approach the ancient entrance to the Shadow Keep. Heavy iron doors stand before you, weathered by centuries but still imposing. A rusted bell hangs beside the entrance, and torch sconces flicker weakly on either side. The stonework is covered in moss and strange runes that seem to writhe in the dim light.",
    image: "/placeholder.svg?height=300&width=800&text=Dungeon+Entrance",
    actions: [
      {
        id: "action_adv4_bell",
        title: "Ring the bell",
        description:
          "Pull the rope and ring the ancient bell to announce your presence.",
        success_next_step_id: "step_adv4_bell_success",
        default_next_step_id: "step_adv4_bell_nothing",
        failure_next_step_id: "step_adv4_bell_failure",
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 10,
        },
      },
      {
        id: "action_adv4_enter",
        title: "Enter smoothly",
        description:
          "Attempt to slip through the doors quietly and undetected.",
        success_next_step_id: "step_adv4_enter_success",
        failure_next_step_id: "step_adv4_enter_failure",
        requirements: {
          stats: { dexterity: 5 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 12,
        },
      },
      {
        id: "action_adv4_around",
        title: "Find another way around",
        description:
          "Search the perimeter for an alternative entrance or weakness in the walls.",
        success_next_step_id: "step_adv4_around_success",
        requirements: {
          stats: { wisdom: 13, intelligence: 11 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 11,
        },
      },
    ],
  },

  // ===== RING THE BELL - SUCCESS PATH =====
  step_adv4_bell_success: {
    id: "step_adv4_bell_success",
    adventureId: "adv4",
    title: "The Watchful Guardian",
    description:
      "The bell's deep toll echoes through the keep. After a moment, a small viewing slot in the door slides open, revealing a pair of glowing eyes. 'State your business, traveler,' a gravelly voice demands. The guardian seems willing to parley, though suspicious.",
    image: "/placeholder.svg?height=300&width=800&text=Guardian+Answers",
    actions: [
      {
        id: "action_bell_negotiate",
        title: "Negotiate entry",
        description:
          "Use your wit and charm to convince the guardian to grant you passage.",
        requirements: {
          stats: { charisma: 15 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 14,
        },
      },
      {
        id: "action_bell_bribe",
        title: "Offer a bribe",
        description:
          "Slide some gold coins through the slot to persuade the guardian.",
        requirements: {
          items: ["gold_coins"],
          stats: { charisma: 10 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 8,
        },
      },
      {
        id: "action_bell_deceive",
        title: "Claim official business",
        description:
          "Pretend to be on an important mission or bearing urgent news.",
        requirements: {
          stats: { charisma: 14, intelligence: 12 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 13,
        },
      },
    ],
  },

  // ===== RING THE BELL - FAILURE PATH =====
  step_adv4_bell_failure: {
    id: "step_adv4_bell_failure",
    adventureId: "adv4",
    title: "Hostile Reception",
    description:
      "The bell's toll is answered by angry shouts from within. The viewing slot snaps open and arrows suddenly pierce through gaps in the door! 'Begone, fool!' a voice roars. You hear the sound of multiple guards mobilizing inside. The situation has turned hostile.",
    image: "/placeholder.svg?height=300&width=800&text=Hostile+Response",
    actions: [
      {
        id: "action_bell_fight",
        title: "Prepare for combat",
        description: "Draw your weapon and ready yourself to fight the guards.",
        dice_roll_params: {
          sides: 20,
          rolls: 2,
          success_floor: 15,
        },
        success_next_step_id: "step_adv4_bell_success_fight",
        failure_next_step_id: "step_adv4_bell_failure_fight",
      },
      {
        id: "action_bell_flee",
        title: "Retreat to safety",
        description: "Fall back and seek cover before the guards emerge.",
        requirements: {
          stats: { dexterity: 13 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 10,
        },
      },
      {
        id: "action_bell_apologize",
        title: "Shout an apology",
        description:
          "Quickly apologize and try to defuse the situation with words.",
        requirements: {
          stats: { charisma: 16 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 16,
        },
      },
    ],
  },

  // ===== RING THE BELL - NO RESPONSE PATH =====
  step_adv4_bell_nothing: {
    id: "step_adv4_bell_nothing",
    adventureId: "adv4",
    title: "Echoing Silence",
    description:
      "The bell rings out, its sound reverberating through the keep and fading into the depths. You wait, but no response comes. Either no one is home, or they choose not to answer. The doors remain firmly shut, and an unsettling silence hangs in the air. You might try something else.",
    image: "/placeholder.svg?height=300&width=800&text=No+Response",
    actions: [
      {
        id: "action_bell_wait",
        title: "Ring again and wait",
        description:
          "Perhaps they didn't hear. Ring the bell once more and be patient.",
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 15,
        },
      },
      {
        id: "action_bell_force",
        title: "Force the door",
        description:
          "Since no one answers, try to break through the heavy doors.",
        requirements: {
          stats: { strength: 16 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 14,
        },
      },
      {
        id: "action_bell_examine",
        title: "Examine the door mechanism",
        description:
          "Study the door closely for locks, hinges, or weak points.",
        requirements: {
          stats: { intelligence: 13 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 11,
        },
      },
    ],
  },

  // ===== ENTER SMOOTHLY - SUCCESS PATH =====
  step_adv4_enter_success: {
    id: "step_adv4_enter_success",
    adventureId: "adv4",
    title: "Silent Entry",
    description:
      "With practiced grace, you slip through a gap in the heavy doors. The hinges barely creak as you enter the torch-lit corridor beyond. Shadows dance on the walls, but you've made it inside undetected. The hallway splits in three directions: left toward flickering light, straight into darkness, and right where you hear the distant sound of water dripping.",
    image: "/placeholder.svg?height=300&width=800&text=Inside+Undetected",
    actions: [
      {
        id: "action_enter_left",
        title: "Head toward the light",
        description:
          "Follow the left passage toward the source of the flickering light.",
        requirements: {
          stats: { wisdom: 11 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 8,
        },
      },
      {
        id: "action_enter_straight",
        title: "Venture into darkness",
        description:
          "Continue straight ahead into the dark passage, relying on your senses.",
        requirements: {
          stats: { wisdom: 14, dexterity: 12 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 12,
        },
      },
      {
        id: "action_enter_right",
        title: "Follow the water sounds",
        description:
          "Take the right passage toward the sound of dripping water.",
        requirements: {
          stats: { intelligence: 12 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 10,
        },
      },
    ],
  },

  // ===== ENTER SMOOTHLY - FAILURE PATH =====
  step_adv4_enter_failure: {
    id: "step_adv4_enter_failure",
    adventureId: "adv4",
    title: "Alarm Raised!",
    description:
      "As you attempt to slip through the doors, your foot catches on a hidden tripwire! Bells begin clanging loudly throughout the keep. Torches suddenly flare to life along the corridor, and you hear the stomping of armored boots rushing toward your position. Guards' voices echo: 'Intruder! Seal the exits!'",
    image: "/placeholder.svg?height=300&width=800&text=Alarm+Triggered",
    actions: [
      {
        id: "action_enter_hide",
        title: "Find a hiding spot",
        description:
          "Quickly duck into shadows or behind debris before the guards arrive.",
        requirements: {
          stats: { dexterity: 8 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 15,
        },
      },
      {
        id: "action_enter_rush",
        title: "Rush deeper inside",
        description:
          "Sprint down the corridor before the guards can surround you.",
        requirements: {
          stats: { dexterity: 14, constitution: 12 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 13,
        },
      },
      {
        id: "action_enter_confront",
        title: "Stand and fight",
        description:
          "Draw your weapon and prepare to battle the incoming guards.",
        requirements: {
          stats: { strength: 15, constitution: 13 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 2,
          success_floor: 14,
        },
      },
    ],
  },

  // ===== BELL FIGHT - FAILURE PATH =====
  step_adv4_bell_failure_fight: {
    id: "step_adv4_bell_failure_fight",
    adventureId: "adv4",
    title: "Woundful defeat",
    description:
      "While trying to pull your sword out of your back, 2 guards come from nowhere and stab you to death.",
    actions: [],
    is_death_step: true,
  },
  // ===== BELL FIGHT - SUCCESS PATH =====
  step_adv4_bell_success_fight: {
    id: "step_adv4_bell_success_fight",
    adventureId: "adv4",
    title: "You have won",
    description:
      "You have defeated the guards. You are victorious.",
    actions: [],
    is_win_step: true,
  },

  // ===== ENTER SMOOTHLY - DOOR LOCKED PATH =====
  step_adv4_enter_locked: {
    id: "step_adv4_enter_locked",
    adventureId: "adv4",
    title: "Sealed Shut",
    description:
      "You approach the doors confidently, but they don't budge. Upon closer inspection, you realize they're locked from the inside with heavy iron bars. The locks are intricate and well-maintained despite the keep's aged appearance. You'll need a different approach or special skills to breach this entrance.",
    image: "/placeholder.svg?height=300&width=800&text=Locked+Door",
    actions: [
      {
        id: "action_locked_pick",
        title: "Pick the lock",
        description:
          "Use your lockpicking tools to attempt to open the mechanism.",
        requirements: {
          stats: { dexterity: 15 },
          items: ["lockpicks"],
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 14,
        },
      },
      {
        id: "action_locked_magic",
        title: "Use magic to unlock",
        description: "Cast a spell to manipulate the locks or hinges.",
        requirements: {
          stats: { intelligence: 14 },
          items: ["spell_component"],
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 13,
        },
      },
      {
        id: "action_locked_bash",
        title: "Break down the door",
        description:
          "Use brute force to smash through the door, consequences be damned.",
        requirements: {
          stats: { strength: 17 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 2,
          success_floor: 16,
        },
      },
    ],
  },

  // ===== FIND ANOTHER WAY - SUCCESS PATH =====
  step_adv4_around_success: {
    id: "step_adv4_around_success",
    adventureId: "adv4",
    title: "Hidden Passage Discovered",
    description:
      "Your careful investigation pays off! Behind a tangle of ivy on the eastern wall, you discover a small servant's entrance, half-collapsed but still accessible. The passage is narrow and dark, but appears to lead into the lower levels of the keep. You can see faint footprints in the dust - someone has used this route recently.",
    image: "/placeholder.svg?height=300&width=800&text=Secret+Entrance",
    actions: [
      {
        id: "action_around_crawl",
        title: "Crawl through carefully",
        description:
          "Move slowly through the passage, checking for traps or hazards.",
        requirements: {
          stats: { dexterity: 12, wisdom: 11 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 10,
        },
      },
      {
        id: "action_around_widen",
        title: "Clear debris to widen the path",
        description:
          "Take time to remove rubble and make the passage easier to traverse.",
        requirements: {
          stats: { strength: 13 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 9,
        },
      },
      {
        id: "action_around_investigate",
        title: "Examine the footprints",
        description:
          "Study the tracks to learn more about who's been using this entrance.",
        requirements: {
          stats: { wisdom: 14, intelligence: 12 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 11,
        },
      },
    ],
  },

  // ===== FIND ANOTHER WAY - FAILURE PATH =====
  step_adv4_around_failure: {
    id: "step_adv4_around_failure",
    adventureId: "adv4",
    title: "Deadly Snare",
    description:
      "As you round the corner of the keep, you spot what appears to be a ventilation grate. Eagerly approaching, you fail to notice the pressure plate beneath the leaves! A concealed net trap springs up, entangling you and triggering a set of poisoned darts that shoot from the wall. You're caught and wounded!",
    image: "/placeholder.svg?height=300&width=800&text=Trap+Triggered",
    actions: [
      {
        id: "action_trap_escape",
        title: "Cut free from the net",
        description: "Use your blade to quickly slice through the net's ropes.",
        requirements: {
          stats: { strength: 13, dexterity: 14 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 12,
        },
      },
      {
        id: "action_trap_treat",
        title: "Treat the poison",
        description:
          "Use your healing knowledge to counteract the dart's poison.",
        requirements: {
          stats: { wisdom: 15, intelligence: 13 },
          items: ["healing_herbs"],
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 14,
        },
      },
      {
        id: "action_trap_call",
        title: "Call for help",
        description: "Shout loudly, hoping someone friendly might be nearby.",
        requirements: {
          stats: { charisma: 12 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 16,
        },
      },
    ],
  },

  // ===== FIND ANOTHER WAY - STILL SEARCHING PATH =====
  step_adv4_around_searching: {
    id: "step_adv4_around_searching",
    adventureId: "adv4",
    title: "The Search Continues",
    description:
      "You circle the perimeter of the keep, studying its walls and foundations. The stonework is solid, and no obvious alternative entrances present themselves immediately. However, you notice several interesting features: a drainage culvert leading under the wall, a damaged section of wall higher up, and what might be ventilation holes near ground level. More investigation is needed.",
    image: "/placeholder.svg?height=300&width=800&text=Searching+Perimeter",
    actions: [
      {
        id: "action_search_culvert",
        title: "Investigate the drainage culvert",
        description:
          "Examine the culvert to see if it's large enough to crawl through.",
        requirements: {
          stats: { wisdom: 13 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 12,
        },
      },
      {
        id: "action_search_climb",
        title: "Climb to the damaged wall",
        description: "Scale the wall to reach the damaged section higher up.",
        requirements: {
          stats: { strength: 14, dexterity: 13 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 13,
        },
      },
      {
        id: "action_search_ventilation",
        title: "Check the ventilation holes",
        description:
          "See if the ventilation system could provide a way inside.",
        requirements: {
          stats: { intelligence: 14, dexterity: 12 },
        },
        dice_roll_params: {
          sides: 20,
          rolls: 1,
          success_floor: 11,
        },
      },
    ],
  },
};
