"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useCharacterService } from "@/services/character.service"
import type { Character } from "@/models/types"
import Link from "next/link"

export default function AccountPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)
  const characterService = useCharacterService()

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const data = await characterService.getCharacters()
        setCharacters(data)
      } catch (error) {
        console.error("Failed to fetch characters:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCharacters()
  }, [characterService])

  if (loading) {
    return (
      <div className="container flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Characters</h1>
        <Button asChild>
          <Link href="/create-character">Create New Character</Link>
        </Button>
      </div>

      {characters.length === 0 ? (
        <div className="rounded-lg border border-accent bg-card p-12 text-center">
          <h2 className="text-xl font-semibold mb-2">No Characters Found</h2>
          <p className="text-muted-foreground mb-6">
            You haven&apos;t created any characters yet. Start your adventure by creating one.
          </p>
          <Button asChild>
            <Link href="/create-character">Create Character</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => (
            <Card key={character.id} className="overflow-hidden">
              <CardHeader className="bg-accent/50">
                <CardTitle>{character.name}</CardTitle>
                <CardDescription>
                  {character.race} {character.character_class}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Strength</span>
                    <span className="font-medium">{character.stats.strength}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Dexterity</span>
                    <span className="font-medium">{character.stats.dexterity}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Constitution</span>
                    <span className="font-medium">{character.stats.constitution}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Intelligence</span>
                    <span className="font-medium">{character.stats.intelligence}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Wisdom</span>
                    <span className="font-medium">{character.stats.wisdom}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Charisma</span>
                    <span className="font-medium">{character.stats.charisma}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-accent/20 border-t border-accent">
                <Button variant="secondary" className="w-full">
                  Select Character
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
