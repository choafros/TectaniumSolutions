import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/nav-bar";
import LandingHero from "@/components/landing-hero";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <LandingHero />
      
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">Why Choose Tectanium?</h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-2">
                <span className="font-semibold">15+ Years Experience:</span>
                Industry-leading expertise in labour provision and managed services
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">Specialized Services:</span>
                Expert solutions in Structured Cabling, ICT, Telecoms, and IT
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">Global Reach:</span>
                Engineering resources across UK and Europe
              </li>
            </ul>
          </div>
          <div className="relative h-64">
            <img
              src="https://images.unsplash.com/photo-1519389950473-47ba0277781c"
              alt="Modern office space"
              className="absolute inset-0 w-full h-full object-cover rounded-lg"
            />
          </div>
        </div>
      </section>

      <section className="bg-muted py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Get Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-card p-6 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-4">For Clients</h3>
              <p className="mb-6">Access our pool of skilled professionals and managed services</p>
              <Link href="/auth">
                <Button className="w-full">Client Portal</Button>
              </Link>
            </div>
            <div className="bg-card p-6 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-4">For Candidates</h3>
              <p className="mb-6">Join our network of professional contractors</p>
              <Link href="/auth">
                <Button className="w-full">Candidate Portal</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
