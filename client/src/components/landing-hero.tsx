import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-background py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Leading Labour Provider & Managed Service Partner
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Tectanium specializes in Structured Cabling, ICT, Telecoms, and IT Services,
              delivering exceptional managed services and skilled professionals across the UK and Europe.
            </p>
            <div className="flex gap-4">
              <Link href="/auth">
                <Button size="lg">Get Started</Button>
              </Link>
              <Link href="#services">
                <Button variant="outline" size="lg">Learn More</Button>
              </Link>
            </div>
          </div>
          <div className="relative h-[400px] rounded-lg overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1552581234-26160f608093"
              alt="Professional team meeting"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
