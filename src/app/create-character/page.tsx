"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import dndSolIdl from "@/idl/dnd_sol.json";
import { characterClasses, characterRaces } from "@/constants/character";

const formSchema = z
  .object({
    name: z.string().min(2, {
      message: "Name must be at least 2 characters.",
    }),
    character_class: z.string({
      required_error: "Please select a class.",
    }),
    race: z.string({
      required_error: "Please select a race.",
    }),
    strength: z.coerce.number().min(0).max(10),
    dexterity: z.coerce.number().min(0).max(10),
    constitution: z.coerce.number().min(0).max(10),
    intelligence: z.coerce.number().min(0).max(10),
    wisdom: z.coerce.number().min(0).max(10),
    charisma: z.coerce.number().min(0).max(10),
  })
  .refine(
    (data) =>
      data.strength +
        data.dexterity +
        data.constitution +
        data.intelligence +
        data.wisdom +
        data.charisma ===
      10,
    {
      message: "Total of all stats must equal 10",
      path: ["charisma"],
    }
  );

export default function CreateCharacterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const { connection } = useConnection();

  const wallet = useAnchorWallet();

  const programId = new PublicKey(
    "4pCS5wMzpCpmVALCtiH2HMFSQ5AASYXA4VSXpXVXBvn1"
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      character_class: "",
      race: "",
      strength: 0,
      dexterity: 0,
      constitution: 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      if (!wallet) {
        throw new Error("Wallet not connected");
      }

      const provider = new AnchorProvider(
        connection,
        wallet,
        AnchorProvider.defaultOptions()
      );
      const program = new Program(dndSolIdl, provider);

      const characterKp = Keypair.generate();

      await program.methods
        .createCharacter(
          values.name,
          values.character_class,
          values.race,
          values.strength,
          values.dexterity,
          values.constitution,
          values.intelligence,
          values.wisdom,
          values.charisma
        )
        .accounts({
          player: wallet.publicKey,
          character: characterKp.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([characterKp])
        .rpc();

      router.push("/account");
    } catch (error) {
      console.error("Failed to create character:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container py-12">
      <h1 className="text-3xl font-bold tracking-tight mb-8">
        Create Your Character
      </h1>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Character Details</CardTitle>
          <CardDescription>
            Create a new character to begin your adventure in the world of DnD
            Sol.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Character Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter character name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="race"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Race</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select race" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {characterRaces.map((race) => (
                            <SelectItem key={race} value={race}>
                              {race}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="character_class"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {characterClasses.map((charClass) => (
                            <SelectItem key={charClass} value={charClass}>
                              {charClass}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Character Stats</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="strength"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Strength</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dexterity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dexterity</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="constitution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Constitution</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="intelligence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intelligence</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="wisdom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wisdom</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="charisma"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Charisma</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !wallet}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Character"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
