import type { Adventure, AdventureStep } from "@/models/types"

// Mock data for adventures
export const mockAdventures: Adventure[] = [
    {
      id: "adv1",
      title: "The Forgotten Ruins",
      description: "Explore ancient ruins filled with traps and treasures. Legend says a powerful artifact lies within.",
      level: 1,
      image: "/placeholder.svg?height=200&width=400&text=Forgotten+Ruins",
    },
    {
      id: "adv2",
      title: "The Dark Forest",
      description:
        "Venture into the mysterious forest where creatures of shadow lurk. Find the source of the corruption.",
      level: 2,
      image: "/placeholder.svg?height=200&width=400&text=Dark+Forest",
    },
    {
      id: "adv3",
      title: "Mountain of Doom",
      description: "Climb the treacherous mountain to confront an ancient dragon that has terrorized the region.",
      level: 3,
      image: "/placeholder.svg?height=200&width=400&text=Mountain+of+Doom",
    },
  ];

export const mockOngoingAdventures: Adventure[] = [];

// Mock data for game steps
export const mockGameSteps: Record<string, AdventureStep> = {
    adv1: {
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
          description: "Move slowly and carefully, keeping an eye out for traps or dangers.",
        },
        {
          id: "action2",
          title: "Search the entrance",
          description: "Look for clues, hidden mechanisms, or valuable items before proceeding.",
        },
        {
          id: "action3",
          title: "Light a torch",
          description: "Prepare a light source to better see what lies ahead in the darkness.",
        },
      ],
    },
    adv2: {
      id: "step1_adv2",
      adventureId: "adv2",
      title: "The Forest Edge",
      description:
        "The trees loom before you, their branches twisted and gnarled. The usual forest sounds are absent, replaced by an eerie silence. A narrow path winds its way between the ancient trunks, disappearing into shadow.",
      image: "/placeholder.svg?height=300&width=800&text=Forest+Edge",
      actions: [
        {
          id: "action1",
          title: "Follow the path",
          description: "Stay on the trail and venture deeper into the forest.",
        },
        {
          id: "action2",
          title: "Climb a tree",
          description: "Get a better view of the surrounding area from above.",
        },
        {
          id: "action3",
          title: "Set up camp",
          description: "Rest and prepare before entering the forest.",
        },
      ],
    },
    adv3: {
      id: "step1_adv3",
      adventureId: "adv3",
      title: "The Mountain Base",
      description:
        "The massive mountain rises before you, its peak lost in the clouds. The rocky terrain is steep and treacherous, with occasional plumes of smoke visible from the summit. A narrow trail zigzags up the mountainside.",
      image: "/placeholder.svg?height=300&width=800&text=Mountain+Base",
      actions: [
        {
          id: "action1",
          title: "Begin the climb",
          description: "Start ascending the mountain via the visible trail.",
        },
        {
          id: "action2",
          title: "Look for an alternative route",
          description: "Search for a less obvious but potentially safer path.",
        },
        {
          id: "action3",
          title: "Talk to local guides",
          description: "Seek advice from experienced mountaineers in the area.",
        },
      ],
    },
  }
  