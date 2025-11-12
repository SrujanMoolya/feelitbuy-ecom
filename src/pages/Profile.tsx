import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, Download, LogOut, User as UserIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import jsPDF from "jspdf";

interface Profile {
  full_name: string | null;
  phone: string | null;
}

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  payment_status: string;
  tracking_number: string | null;
  shipping_address: any;
  order_items: Array<{
    product_name: string;
    quantity: number;
    product_price: number;
    subtotal: number;
  }>;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<Profile>({ full_name: "", phone: "" });
  const [isEditing, setIsEditing] = useState(false);

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            product_name,
            quantity,
            product_price,
            subtotal
          )
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Order[];
    },
    enabled: !!session?.user?.id,
  });

  useEffect(() => {
    if (!sessionLoading && !session) {
      navigate("/auth");
    }
  }, [session, sessionLoading, navigate]);

  useEffect(() => {
    if (profileData) {
      setProfile({
        full_name: profileData.full_name || "",
        phone: profileData.phone || "",
      });
    }
  }, [profileData]);

  // Set up real-time subscription for orders
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["orders"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, queryClient]);

  const updateProfileMutation = useMutation({
    mutationFn: async (updatedProfile: Profile) => {
      if (!session?.user?.id) throw new Error("No user");
      
      const { error } = await supabase
        .from("profiles")
        .update(updatedProfile)
        .eq("id", session.user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Profile updated successfully" });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const downloadInvoice = (order: Order) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text("Feel It Buy", 20, 20);
    doc.setFontSize(12);
    doc.text("Experience It Before You Own It", 20, 28);
    
    // Invoice details
    doc.setFontSize(16);
    doc.text("INVOICE", 20, 45);
    doc.setFontSize(10);
    doc.text(`Order ID: ${order.id.substring(0, 8).toUpperCase()}`, 20, 55);
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 20, 62);
    doc.text(`Status: ${order.status.toUpperCase()}`, 20, 69);
    
    // Shipping address
    doc.setFontSize(12);
    doc.text("Shipping Address:", 20, 82);
    doc.setFontSize(10);
    const address = order.shipping_address;
    doc.text(address.fullName || "", 20, 89);
    doc.text(address.address || "", 20, 96);
    doc.text(`${address.city || ""}, ${address.state || ""} ${address.pincode || ""}`, 20, 103);
    doc.text(address.phone || "", 20, 110);
    
    // Items table header
    doc.setFontSize(10);
    doc.text("Item", 20, 125);
    doc.text("Qty", 120, 125);
    doc.text("Price", 145, 125);
    doc.text("Total", 170, 125);
    doc.line(20, 127, 190, 127);
    
    // Items
    let yPos = 135;
    order.order_items.forEach((item) => {
      doc.text(item.product_name, 20, yPos);
      doc.text(item.quantity.toString(), 120, yPos);
      doc.text(`₹${item.product_price.toFixed(2)}`, 145, yPos);
      doc.text(`₹${item.subtotal.toFixed(2)}`, 170, yPos);
      yPos += 7;
    });
    
    // Total
    doc.line(20, yPos, 190, yPos);
    yPos += 7;
    doc.setFontSize(12);
    doc.text("Total Amount:", 120, yPos);
    doc.text(`₹${order.total_amount.toFixed(2)}`, 170, yPos);
    
    // Footer
    doc.setFontSize(8);
    doc.text("Thank you for shopping with Feel It Buy!", 20, 280);
    
    doc.save(`invoice-${order.id.substring(0, 8)}.pdf`);
    
    toast({ title: "Invoice downloaded successfully" });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500",
      processing: "bg-blue-500",
      shipped: "bg-purple-500",
      delivered: "bg-green-500",
      cancelled: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  if (sessionLoading || profileLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">My Account</h1>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList>
              <TabsTrigger value="profile">
                <UserIcon className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="orders">
                <Package className="h-4 w-4 mr-2" />
                Orders
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>
                    Manage your account information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={session?.user?.email || ""} disabled />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={profile.full_name || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, full_name: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profile.phone || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, phone: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          onClick={() => updateProfileMutation.mutate(profile)}
                          disabled={updateProfileMutation.isPending}
                        >
                          {updateProfileMutation.isPending && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          Save Changes
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false);
                            setProfile({
                              full_name: profileData?.full_name || "",
                              phone: profileData?.phone || "",
                            });
                          }}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => setIsEditing(true)}>
                        Edit Profile
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders">
              <div className="space-y-4">
                {ordersLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : orders && orders.length > 0 ? (
                  orders.map((order) => (
                    <Card key={order.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              Order #{order.id.substring(0, 8).toUpperCase()}
                            </CardTitle>
                            <CardDescription>
                              Placed on {new Date(order.created_at).toLocaleDateString()}
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadInvoice(order)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Invoice
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {order.tracking_number && (
                          <div className="bg-muted p-4 rounded-lg">
                            <p className="text-sm font-medium">Tracking Number</p>
                            <p className="text-lg font-mono">{order.tracking_number}</p>
                          </div>
                        )}

                        <div>
                          <h4 className="font-medium mb-2">Items</h4>
                          <div className="space-y-2">
                            {order.order_items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span>
                                  {item.product_name} x {item.quantity}
                                </span>
                                <span className="font-medium">
                                  ₹{item.subtotal.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Separator />

                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Amount</p>
                            <p className="text-2xl font-bold">
                              ₹{order.total_amount.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Payment Status</p>
                            <Badge variant={order.payment_status === "paid" ? "default" : "secondary"}>
                              {order.payment_status}
                            </Badge>
                          </div>
                        </div>

                        <div className="bg-muted p-4 rounded-lg">
                          <p className="text-sm font-medium mb-2">Shipping Address</p>
                          <p className="text-sm">
                            {order.shipping_address.fullName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.shipping_address.address}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.pincode}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.shipping_address.phone}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center h-64">
                      <Package className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-medium">No orders yet</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Start shopping to see your orders here
                      </p>
                      <Button onClick={() => navigate("/")}>
                        Browse Products
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Profile;
