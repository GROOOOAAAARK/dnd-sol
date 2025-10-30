"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useAdventureService } from "@/services/adventure.service"
import type { Adventure } from "@/models/types"

export default function AdventuresPage() {
  const [ongoingAdventures, setOngoingAdventures] = useState<Adventure[]>([])
  const [newAdventures, setNewAdventures] = useState<Adventure[]>([])
  const [loading, setLoading] = useState(true)
  const adventureService = useAdventureService()
  const adventureServiceRef = useRef(adventureService)

  useEffect(() => {
    const fetchAdventures = async () => {
      try {
        const ongoing = await adventureServiceRef.current.getOngoingAdventures()
        const available = await adventureServiceRef.current.getAvailableAdventures()

        setOngoingAdventures(ongoing)
        setNewAdventures(available)
      } catch (error) {
        console.error("Failed to fetch adventures:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAdventures()
  }, [])

  if (loading) {
    return (
      <div className="container flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container py-12">
      <h1 className="text-3xl font-bold tracking-tight mb-12">Adventures</h1>

      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">Ongoing Adventures</h2>

        {ongoingAdventures.length === 0 ? (
          <div className="rounded-lg border border-accent bg-card p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">No Ongoing Adventures</h3>
            <p className="text-muted-foreground">
              You haven&apos;t started any adventures yet. Choose one from the available adventures below.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ongoingAdventures.map((adventure) => (
              <Card key={adventure.id} className="overflow-hidden">
                <div className="relative h-48 w-full">
                  <Image
                    src={adventure.image || "/placeholder.svg?height=200&width=400"}
                    alt={adventure.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <CardHeader>
                  <CardTitle>{adventure.title}</CardTitle>
                  <CardDescription>In progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-3">{adventure.description}</p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={`/game/${adventure.id}`}>Continue</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-6">New Adventures</h2>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {newAdventures.map((adventure) => (
            <Card key={adventure.id} className="overflow-hidden">
              <div className="relative h-48 w-full">
                <Image
                  src={adventure.image || "/placeholder.svg?height=200&width=400"}
                  alt={adventure.title}
                  fill
                  className="object-cover"
                />
              </div>
              <CardHeader>
                <CardTitle>{adventure.title}</CardTitle>
                <CardDescription>Level {adventure.level}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-3">{adventure.description}</p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/game/${adventure.id}`}>Play</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
