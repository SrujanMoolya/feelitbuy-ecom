import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Heart, ShoppingCart, Star, Loader2, Package, Shield, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";

const ProductDetail = () => {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const [selectedImage, setSelectedImage] = useState(0);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name, slug)")
        .eq("slug", slug)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!product?.id,
  });

  const { data: isInWishlist } = useQuery({
    queryKey: ["wishlist", product?.id, session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id || !product?.id) return false;
      const { data } = await supabase
        .from("wishlist_items")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("product_id", product.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!session?.user?.id && !!product?.id,
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Link to="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const avgRating = reviews?.length
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 4;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Home</Link>
          {" / "}
          <Link to="/categories" className="hover:text-primary">Categories</Link>
          {product.categories && (
            <>
              {" / "}
              <Link to={`/categories/${product.categories.slug}`} className="hover:text-primary">
                {product.categories.name}
              </Link>
            </>
          )}
          {" / "}
          <span className="text-foreground">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-xl bg-muted">
              <img
                src={product.images[selectedImage] || "/placeholder.svg"}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((image: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square overflow-hidden rounded-lg border-2 transition-colors ${
                    selectedImage === index
                      ? "border-primary"
                      : "border-transparent hover:border-muted"
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{product.brand}</Badge>
                {product.stock === 0 && (
                  <Badge variant="destructive">Out of Stock</Badge>
                )}
              </div>
              
              <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.floor(avgRating)
                          ? "fill-secondary text-secondary"
                          : "text-muted"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  ({avgRating.toFixed(1)}) • {reviews?.length || 0} reviews
                </span>
              </div>

              <div className="flex items-baseline gap-3 mb-6">
                <span className="text-4xl font-bold text-primary">
                  ${product.price.toFixed(2)}
                </span>
                {product.original_price && (
                  <>
                    <span className="text-xl text-muted-foreground line-through">
                      ${product.original_price.toFixed(2)}
                    </span>
                    <Badge className="bg-secondary text-secondary-foreground">
                      {discount}% OFF
                    </Badge>
                  </>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold">Description</h3>
              <p className="text-muted-foreground">{product.description}</p>
            </div>

            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold">Specifications</h3>
                  <dl className="space-y-2">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-2 border-b">
                        <dt className="text-muted-foreground capitalize">
                          {key.replace(/_/g, " ")}
                        </dt>
                        <dd className="font-medium">{value as string}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </>
            )}

            <Separator />

            <div className="flex gap-4">
              <Button
                size="lg"
                className="flex-1 bg-primary hover:bg-primary-hover"
                onClick={() => addToCartMutation.mutate()}
                disabled={product.stock === 0}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Add to Cart
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                onClick={() => toggleWishlistMutation.mutate()}
              >
                <Heart
                  className={`h-5 w-5 ${
                    isInWishlist ? "fill-secondary text-secondary" : ""
                  }`}
                />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-6">
              <div className="text-center">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">Fast Delivery</p>
              </div>
              
              <div className="text-center">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">Secure Payment</p>
              </div>
              
              <div className="text-center">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">Easy Returns</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>
          {reviews && reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold">Customer</p>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating
                                  ? "fill-secondary text-secondary"
                                  : "text-muted"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-muted-foreground">{review.comment}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
