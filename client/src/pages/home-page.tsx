import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import NavBar from "@/components/nav-bar";
import LandingHero from "@/components/landing-hero";
import { Footer } from "@/components/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
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
          <h2 className="text-3xl font-bold text-center mb-12">Industry Certifications</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
            {/* Placeholder certification images */}
            <div className="bg-card p-6 rounded-lg w-full max-w-[200px] aspect-square flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8.5 2H4a2 2 0 0 0-2 2v4.5" />
                    <path d="M2 15.5V20a2 2 0 0 0 2 2h4.5" />
                    <path d="M15.5 22H20a2 2 0 0 0 2-2v-4.5" />
                    <path d="M22 8.5V4a2 2 0 0 0-2-2h-4.5" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <div className="font-semibold">ISO 9001:2015</div>
                <div className="text-sm text-muted-foreground">Quality Management</div>
              </div>
            </div>
            <div className="bg-card p-6 rounded-lg w-full max-w-[200px] aspect-square flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div className="font-semibold">ISO 27001</div>
                <div className="text-sm text-muted-foreground">Information Security</div>
              </div>
            </div>
            <div className="bg-card p-6 rounded-lg w-full max-w-[200px] aspect-square flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="font-semibold">CHAS</div>
                <div className="text-sm text-muted-foreground">Health & Safety</div>
              </div>
            </div>
            <div className="bg-card p-6 rounded-lg w-full max-w-[200px] aspect-square flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div className="font-semibold">CSCS</div>
                <div className="text-sm text-muted-foreground">Construction Skills</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-card py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Get Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-background p-6 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-4">For Clients</h3>
              <p className="mb-6">Access our pool of skilled professionals and managed services</p>
              <Link href="/auth">
                <Button className="w-full">Client Portal</Button>
              </Link>
            </div>
            <div className="bg-background p-6 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-4">For Candidates</h3>
              <p className="mb-6">Join our network of professional contractors</p>
              <Link href="/auth">
                <Button className="w-full">Candidate Portal</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}