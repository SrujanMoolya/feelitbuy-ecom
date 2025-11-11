import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative bg-gradient-to-br from-primary via-primary-hover to-primary py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center text-primary-foreground">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
            Experience It Before You Own It
          </h1>
          <p className="text-lg md:text-xl mb-8 text-primary-foreground/90">
            Discover premium electronics and furniture with immersive shopping experience, 
            competitive prices, and lightning-fast delivery.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/categories">
              <Button 
                size="lg" 
                className="bg-secondary hover:bg-secondary-hover text-secondary-foreground shadow-lg transition-smooth w-full sm:w-auto"
              >
                Shop Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/categories">
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-background/10 border-primary-foreground/20 text-primary-foreground hover:bg-background/20 transition-smooth w-full sm:w-auto"
              >
                Browse Categories
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-secondary/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-primary-hover/20 rounded-full blur-3xl"></div>
      </div>
    </section>
  );
};
