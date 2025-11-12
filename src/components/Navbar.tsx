import { Link } from "react-router-dom";
import { ShoppingCart, Heart, User, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: cartCount } = useQuery({
    queryKey: ["cartCount", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return 0;
      const { count } = await supabase
        .from("cart_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id);
      return count || 0;
    },
    enabled: !!session?.user?.id,
  });

  const { data: wishlistCount } = useQuery({
    queryKey: ["wishlistCount", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return 0;
      const { count } = await supabase
        .from("wishlist_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id);
      return count || 0;
    },
    enabled: !!session?.user?.id,
  });

  const { data: isAdmin } = useQuery({
    queryKey: ["isAdmin", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return false;
      const { data } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      return !!data;
    },
    enabled: !!session?.user?.id,
  });

  return (
    <>
      {/* Top Navbar (desktop & mobile) */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <img src="/fib-logo.png" alt="FeelItBuy Logo" className="h-14 w-auto object-contain" />
            </Link>
            {/* Search Bar - Hidden on mobile */}
            <div className="hidden md:flex flex-1 max-w-xl mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  className="w-full pl-10 bg-muted/50"
                />
              </div>
            </div>
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <Link to="/categories">
                <Button variant="ghost">Categories</Button>
              </Link>
              {session?.user ? (
                <>
                  <Link to="/wishlist" className="relative">
                    <Button variant="ghost" size="icon">
                      <Heart className="h-5 w-5" />
                      {wishlistCount! > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-secondary text-xs font-medium text-secondary-foreground flex items-center justify-center">
                          {wishlistCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                  <Link to="/cart" className="relative">
                    <Button variant="ghost" size="icon">
                      <ShoppingCart className="h-5 w-5" />
                      {cartCount! > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-secondary text-xs font-medium text-secondary-foreground flex items-center justify-center">
                          {cartCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                  <Link to="/profile">
                    <Button variant="ghost" size="icon">
                      <User className="h-5 w-5" />
                    </Button>
                  </Link>
                  {isAdmin && (
                    <Link to="/admin">
                      <Button variant="outline">Admin</Button>
                    </Link>
                  )}
                </>
              ) : (
                <Link to="/auth">
                  <Button>Sign In</Button>
                </Link>
              )}
            </div>
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          {/* Mobile Menu (dropdown) */}
          {isMenuOpen && (
            <div className="md:hidden pb-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  className="w-full pl-10 bg-muted/50"
                />
              </div>
              <div className="flex flex-col space-y-2">
                <Link to="/categories">
                  <Button variant="ghost" className="w-full justify-start">
                    Categories
                  </Button>
                </Link>
                {session?.user ? (
                  <>
                    <Link to="/wishlist">
                      <Button variant="ghost" className="w-full justify-start">
                        <Heart className="h-5 w-5 mr-2" />
                        Wishlist {wishlistCount! > 0 && `(${wishlistCount})`}
                      </Button>
                    </Link>
                    <Link to="/cart">
                      <Button variant="ghost" className="w-full justify-start">
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Cart {cartCount! > 0 && `(${cartCount})`}
                      </Button>
                    </Link>
                    <Link to="/profile">
                      <Button variant="ghost" className="w-full justify-start">
                        <User className="h-5 w-5 mr-2" />
                        Profile
                      </Button>
                    </Link>
                    {isAdmin && (
                      <Link to="/admin">
                        <Button variant="outline" className="w-full justify-start">
                          Admin Dashboard
                        </Button>
                      </Link>
                    )}
                  </>
                ) : (
                  <Link to="/auth">
                    <Button className="w-full">Sign In</Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Bottom Navbar (mobile only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow md:hidden flex justify-around items-center h-16">
        <Link to="/" className="flex flex-col items-center text-xs">
          <img src="/fib-logo.png" alt="Logo" className="h-7 w-7 object-contain mb-1" />
          Home
        </Link>
        <Link to="/categories" className="flex flex-col items-center text-xs">
          <Menu className="h-7 w-7 mb-1" />
          Categories
        </Link>
        <Link to="/wishlist" className="flex flex-col items-center text-xs relative">
          <Heart className="h-7 w-7 mb-1" />
          Wishlist
          {wishlistCount! > 0 && (
            <span className="absolute top-0 right-2 h-4 w-4 rounded-full bg-secondary text-xs font-medium text-secondary-foreground flex items-center justify-center">
              {wishlistCount}
            </span>
          )}
        </Link>
        <Link to="/cart" className="flex flex-col items-center text-xs relative">
          <ShoppingCart className="h-7 w-7 mb-1" />
          Cart
          {cartCount! > 0 && (
            <span className="absolute top-0 right-2 h-4 w-4 rounded-full bg-secondary text-xs font-medium text-secondary-foreground flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </Link>
        <Link to={session?.user ? "/profile" : "/auth"} className="flex flex-col items-center text-xs">
          <User className="h-7 w-7 mb-1" />
          {session?.user ? "Profile" : "Sign In"}
        </Link>
      </nav>

    </>
  );
};
