import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price: number | null;
  images: string[];
  brand: string;
  stock: number;
}

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const queryClient = useQueryClient();
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: isInWishlist } = useQuery({
    queryKey: ["wishlist", product.id, session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return false;
      const { data } = await supabase
        .from("wishlist_items")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("product_id", product.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!session?.user?.id,
  });

  const toggleWishlistMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) {
        throw new Error("Please sign in to add items to wishlist");
      }

      if (isInWishlist) {
        await supabase
          .from("wishlist_items")
          .delete()
          .eq("user_id", session.user.id)
          .eq("product_id", product.id);
      } else {
        await supabase
          .from("wishlist_items")
          .insert({ user_id: session.user.id, product_id: product.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["wishlistCount"] });
      toast.success(isInWishlist ? "Removed from wishlist" : "Added to wishlist");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) {
        throw new Error("Please sign in to add items to cart");
      }

      const { data: existing } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", session.user.id)
        .eq("product_id", product.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + 1 })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("cart_items")
          .insert({ user_id: session.user.id, product_id: product.id, quantity: 1 });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["cartCount"] });
      toast.success("Added to cart");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  return (
    <Card className="group overflow-hidden transition-smooth hover:shadow-custom-lg">
      <div className="relative overflow-hidden aspect-square bg-muted">
        <Link to={`/product/${product.slug}`}>
          <img
            src={product.images[0] || "/placeholder.svg"}
            alt={product.name}
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-110 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
          />
        </Link>
        
        {discount > 0 && (
          <Badge className="absolute top-2 left-2 bg-secondary text-secondary-foreground">
            {discount}% OFF
          </Badge>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 bg-background/80 hover:bg-background transition-smooth"
          onClick={() => toggleWishlistMutation.mutate()}
        >
          <Heart
            className={`h-5 w-5 ${
              isInWishlist ? "fill-secondary text-secondary" : "text-foreground"
            }`}
          />
        </Button>

        {product.stock === 0 && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Badge variant="destructive">Out of Stock</Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="mb-1">
          <span className="text-xs text-muted-foreground">{product.brand}</span>
        </div>
        
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${
                i < 4 ? "fill-secondary text-secondary" : "text-muted"
              }`}
            />
          ))}
          <span className="text-sm text-muted-foreground ml-1">(4.0)</span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-primary">
            ₹{product.price.toFixed(2)}
          </span>
          {product.original_price && (
            <span className="text-sm text-muted-foreground line-through">
              ₹{product.original_price.toFixed(2)}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full bg-primary hover:bg-primary-hover transition-smooth"
          onClick={() => addToCartMutation.mutate()}
          disabled={product.stock === 0}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
};
