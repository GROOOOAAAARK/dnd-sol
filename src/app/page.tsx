import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex flex-col">
      <section className="relative h-[500px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-black/60 z-10" />
        <Image
          src="/images/bg_home.jpeg"
          alt="Fantasy landscape"
          fill
          className="object-cover"
        />
        <div className="container relative z-20 flex h-full flex-col items-center justify-center text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="block text-primary">DnD Sol</span>
            <span className="block mt-2">Your Destiny Awaits</span>
          </h1>
          <p className="mt-6 max-w-lg text-xl text-muted-foreground">
            Embark on epic adventures in a world of magic and monsters. Your choices shape your destiny in this onchain
            fantasy realm.
          </p>
          <div className="mt-10 flex gap-4">
            <Button asChild size="lg">
              <Link href="/create-character">Create Character</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/adventures">Start Adventure</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-accent bg-card p-6">
            <h3 className="text-xl font-bold">Create Your Hero</h3>
            <p className="mt-2 text-muted-foreground">
              Customize your character with unique stats, race, and class to face the challenges ahead.
            </p>
          </div>
          <div className="rounded-lg border border-accent bg-card p-6">
            <h3 className="text-xl font-bold">Choose Your Path</h3>
            <p className="mt-2 text-muted-foreground">
              Every decision matters. Your choices will shape the story and determine your fate.
            </p>
          </div>
          <div className="rounded-lg border border-accent bg-card p-6">
            <h3 className="text-xl font-bold">Onchain Adventures</h3>
            <p className="mt-2 text-muted-foreground">
              Your journey is recorded on the blockchain, making your achievements truly yours.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
