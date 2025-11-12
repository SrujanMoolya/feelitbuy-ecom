import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";

const ads = [
  {
    title: "Mega Electronics Sale!",
    description: "Up to 50% off on top electronics brands. Limited time only!",
    image: "/ads/electronics-sale.jpg",
    cta: { label: "Shop Electronics", link: "/categories/electronics" },
    badge: "50% OFF",
    gradient: "from-blue-50 to-cyan-50"
  },
  {
    title: "Furnish Your Dream Home",
    description: "Modern furniture at unbeatable prices. Free delivery on all orders!",
    image: "/ads/furniture-offer.jpg",
    cta: { label: "Shop Furniture", link: "/categories/furniture" },
    badge: "FREE DELIVERY",
    gradient: "from-amber-50 to-orange-50"
  },
  {
    title: "Lightning Fast Delivery",
    description: "Get your products delivered in 24 hours in select cities.",
    image: "/ads/fast-delivery.jpg",
    cta: { label: "See Details", link: "/about/delivery" },
    badge: "24 HOURS",
    gradient: "from-green-50 to-emerald-50"
  },
];

export const Hero = () => {
  const plugin = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  );

  return (
    <section className="relative py-4 md:py-8 mb-4 md:mb-8">
      <div className="container mx-auto px-4 md:px-6">
        <Carousel 
          className="w-full max-w-7xl mx-auto"
          plugins={[plugin.current]}
          opts={{
            loop: true,
          }}
        >
          <CarouselContent>
            {ads.map((ad, idx) => (
              <CarouselItem key={idx}>
                <Card className={`group relative flex flex-col md:flex-row items-center justify-between bg-gradient-to-br ${ad.gradient} border-2 border-black overflow-hidden min-h-[450px] md:min-h-[550px] transition-all duration-300 hover:shadow-2xl hover:scale-[1.01]`}>
                  {/* Decorative elements */}
                  <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10">
                    <Badge className="bg-black text-white border-0 px-3 py-1.5 text-xs md:text-sm font-bold animate-pulse">
                      <Sparkles className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                      {ad.badge}
                    </Badge>
                  </div>

                  {/* Text Side */}
                  <CardContent className="flex-1 flex flex-col items-start justify-center p-6 md:p-12 space-y-4 md:space-y-6 z-10">
                    <div className="space-y-3 md:space-y-4">
                      <h2 className="text-3xl md:text-6xl lg:text-7xl font-extrabold text-black leading-tight tracking-tight animate-fade-in">
                        {ad.title}
                      </h2>
                      <p className="text-base md:text-xl lg:text-2xl text-neutral-800 max-w-lg leading-relaxed">
                        {ad.description}
                      </p>
                    </div>
                    <Link to={ad.cta.link} className="mt-4">
                      <Button 
                        size="lg" 
                        className="group/btn border-2 border-black bg-black text-white hover:bg-white hover:text-black transition-all duration-300 text-base md:text-lg px-6 md:px-8 py-5 md:py-6 shadow-lg hover:shadow-xl transform hover:translate-y-[-2px]"
                      >
                        {ad.cta.label}
                        <ArrowRight className="ml-2 h-5 w-5 md:h-6 md:w-6 transition-transform group-hover/btn:translate-x-1" />
                      </Button>
                    </Link>
                  </CardContent>

                  {/* Image Side */}
                  <div className="flex-1 flex items-center justify-center w-full md:w-1/2 p-4 md:p-8 relative">
                    <div className="relative w-full h-full flex items-center justify-center">
                      {/* Animated background glow */}
                      <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent rounded-2xl blur-2xl animate-pulse"></div>
                      <img 
                        src={ad.image} 
                        alt={ad.title} 
                        className="relative rounded-2xl border-2 border-black max-h-64 md:max-h-[400px] w-auto object-contain bg-white shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:rotate-1" 
                      />
                    </div>
                  </div>

                  {/* Decorative corner pattern */}
                  <div className="absolute bottom-0 left-0 w-24 h-24 md:w-32 md:h-32 border-l-4 border-b-4 border-black opacity-20"></div>
                  <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 border-r-4 border-t-4 border-black opacity-20"></div>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2 md:left-4 border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-all duration-300 h-10 w-10 md:h-12 md:w-12" />
          <CarouselNext className="right-2 md:right-4 border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-all duration-300 h-10 w-10 md:h-12 md:w-12" />
        </Carousel>
      </div>
    </section>
  );
};
