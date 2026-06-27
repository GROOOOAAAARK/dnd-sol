"use client";

import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, RotateCcw } from "lucide-react";
import { useAdventureService } from "@/services/adventure.service";
import type { Adventure } from "@/models/types";
import { useCharacterStore } from "@/stores/selectedCharacter.store";

export default function AdventuresPage() {
  const [ongoingAdventures, setOngoingAdventures] = useState<Adventure[]>([]);
  const [newAdventures, setNewAdventures] = useState<Adventure[]>([]);
  const [loading, setLoading] = useState(true);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const adventureService = useAdventureService();
  const adventureServiceRef = useRef(adventureService);
  const { publicKey } = useWallet();
  const character = useCharacterStore((state) => state.selectedCharacter);

  useEffect(() => {
    const fetchAdventures = async () => {
      try {
        const ongoing =
          publicKey && character?.id
            ? await adventureServiceRef.current.getOngoingAdventures({
                wallet_pubkey: publicKey.toBase58(),
                character_id: character.id,
              })
            : [];
        const available =
          await adventureServiceRef.current.getAvailableAdventures();

        setOngoingAdventures(ongoing);
        setNewAdventures(available);
      } catch (error) {
        console.error("Failed to fetch adventures:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdventures();
  }, [character?.id, publicKey]);

  const handleReset = async (adventureId: string) => {
    if (!publicKey || !character?.id) return;

    setResettingId(adventureId);
    try {
      const success = await adventureServiceRef.current.resetAdventureCheckpoint(
        adventureId,
        {
          wallet_pubkey: publicKey.toBase58(),
          character_id: character.id,
        }
      );

      if (success) {
        setOngoingAdventures((prev) =>
          prev.filter((a) => a.id !== adventureId)
        );
      }
    } catch (error) {
      console.error("Failed to reset adventure:", error);
    } finally {
      setResettingId(null);
    }
  };

  if (loading) {
    return (
      <div className="container flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-12">
      <h1 className="text-3xl font-bold tracking-tight mb-12">Adventures</h1>

      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">Ongoing Adventures</h2>

        {ongoingAdventures.length === 0 ? (
          <div className="rounded-lg border border-accent bg-card p-8 text-center">
            <h3 className="text-xl font-semibold mb-2">
              No Ongoing Adventures
            </h3>
            <p className="text-muted-foreground">
              You haven&apos;t started any adventures yet. Choose one from the
              available adventures below.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ongoingAdventures.map((adventure) => (
              <Card key={adventure.id} className="overflow-hidden">
                <div className="relative h-48 w-full">
                  <Image
                    src={
                      adventure.image || "/placeholder.svg?height=200&width=400"
                    }
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
                <CardFooter className="flex gap-2">
                  <Button asChild className="flex-1">
                    <Link href={`/game/${adventure.id}`}>Continue</Link>
                  </Button>
                  <Button
                    disabled={resettingId === adventure.id}
                    onClick={() => handleReset(adventure.id)}
                    size="icon"
                    title="Reset adventure progress"
                    variant="outline"
                  >
                    {resettingId === adventure.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
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
                  src={
                    adventure.image || "/placeholder.svg?height=200&width=400"
                  }
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
  );
}
