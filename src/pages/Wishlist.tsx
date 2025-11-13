import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Loader2, Heart } from "lucide-react";

interface WishlistItem {
  id: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    original_price: number | null;
    images: string[];
    brand: string;
    stock: number;
  };
}

export default function Wishlist() {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchWishlistItems();
    }
  }, [user]);

  const fetchWishlistItems = async () => {
    try {
      const { data, error } = await supabase
        .from("wishlist_items")
        .select(`
          id,
          product:products (
            id,
            name,
            slug,
            price,
            original_price,
            images,
            brand,
            stock
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWishlistItems(data as WishlistItem[]);
    } catch (error: any) {
      console.error("Failed to load wishlist:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <Heart className="h-8 w-8 text-primary fill-primary" />
            <h1 className="text-3xl font-bold">My Wishlist</h1>
          </div>

          {wishlistItems.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl text-muted-foreground mb-4">Your wishlist is empty</p>
              <p className="text-muted-foreground mb-6">Start adding products you love!</p>
              <Button onClick={() => navigate("/")}>Browse Products</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {wishlistItems.map((item) => (
                <ProductCard key={item.id} product={item.product} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
