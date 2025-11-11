-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  brand TEXT,
  stock INTEGER DEFAULT 0,
  images TEXT[] DEFAULT '{}',
  specifications JSONB DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage products"
  ON public.products FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create cart_items table
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cart"
  ON public.cart_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cart"
  ON public.cart_items FOR ALL
  USING (auth.uid() = user_id);

-- Create wishlist_items table
CREATE TABLE public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wishlist"
  ON public.wishlist_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own wishlist"
  ON public.wishlist_items FOR ALL
  USING (auth.uid() = user_id);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status order_status DEFAULT 'pending',
  total_amount DECIMAL(10, 2) NOT NULL,
  shipping_address JSONB NOT NULL,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  tracking_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  subtotal DECIMAL(10, 2) NOT NULL
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items of own orders"
  ON public.order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all order items"
  ON public.order_items FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- Create banners table
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banners"
  ON public.banners FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage banners"
  ON public.banners FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert demo categories
INSERT INTO public.categories (name, slug, description) VALUES
  ('Laptops', 'laptops', 'High-performance laptops for work and gaming'),
  ('Mobiles', 'mobiles', 'Latest smartphones with cutting-edge technology'),
  ('Sofas', 'sofas', 'Comfortable and stylish sofas for your living room'),
  ('Chairs', 'chairs', 'Ergonomic chairs for office and home'),
  ('Tables', 'tables', 'Modern tables for dining and work spaces');

-- Insert demo products
INSERT INTO public.products (name, slug, description, price, original_price, category_id, brand, stock, images, specifications, is_featured) VALUES
  (
    'MacBook Pro 16" M3 Max',
    'macbook-pro-16-m3-max',
    'The most powerful MacBook Pro ever with M3 Max chip, stunning Liquid Retina XDR display, and up to 22 hours of battery life.',
    2499.00,
    2799.00,
    (SELECT id FROM public.categories WHERE slug = 'laptops'),
    'Apple',
    15,
    ARRAY['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800'],
    '{"processor": "Apple M3 Max", "ram": "32GB", "storage": "1TB SSD", "display": "16-inch Liquid Retina XDR", "graphics": "40-core GPU"}'::jsonb,
    true
  ),
  (
    'iPhone 15 Pro Max',
    'iphone-15-pro-max',
    'Forged in titanium with A17 Pro chip, action button, and advanced camera system with 5x optical zoom.',
    1199.00,
    1299.00,
    (SELECT id FROM public.categories WHERE slug = 'mobiles'),
    'Apple',
    30,
    ARRAY['https://images.unsplash.com/photo-1592286927505-5c51e8f2e0b2?w=800', 'https://images.unsplash.com/photo-1591337676887-a217a6970a8a?w=800'],
    '{"display": "6.7-inch Super Retina XDR", "processor": "A17 Pro", "camera": "48MP Main + 12MP Ultra Wide + 12MP Telephoto", "storage": "256GB"}'::jsonb,
    true
  ),
  (
    'Modern L-Shape Sofa',
    'modern-l-shape-sofa',
    'Luxurious L-shaped sofa with premium fabric, deep seating, and contemporary design perfect for any living room.',
    899.00,
    1099.00,
    (SELECT id FROM public.categories WHERE slug = 'sofas'),
    'HomeComfort',
    8,
    ARRAY['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800', 'https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=800'],
    '{"material": "Premium Fabric", "color": "Grey", "seating": "5-6 persons", "dimensions": "280cm x 180cm"}'::jsonb,
    true
  ),
  (
    'Ergonomic Office Chair Pro',
    'ergonomic-office-chair-pro',
    'Professional ergonomic chair with lumbar support, adjustable armrests, and breathable mesh back for all-day comfort.',
    349.00,
    449.00,
    (SELECT id FROM public.categories WHERE slug = 'chairs'),
    'ErgoMax',
    25,
    ARRAY['https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=800', 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=800'],
    '{"material": "Mesh & Leather", "weight_capacity": "150kg", "adjustments": "Height, Armrest, Lumbar", "warranty": "5 years"}'::jsonb,
    false
  ),
  (
    'Dell XPS 15',
    'dell-xps-15',
    'Premium laptop with InfinityEdge display, powerful Intel Core i7 processor, and sleek aluminum design.',
    1599.00,
    1799.00,
    (SELECT id FROM public.categories WHERE slug = 'laptops'),
    'Dell',
    12,
    ARRAY['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800'],
    '{"processor": "Intel Core i7-13700H", "ram": "16GB", "storage": "512GB SSD", "display": "15.6-inch FHD+"}'::jsonb,
    false
  ),
  (
    'Samsung Galaxy S24 Ultra',
    'samsung-galaxy-s24-ultra',
    'Ultimate Samsung flagship with S Pen, 200MP camera, Snapdragon 8 Gen 3, and AI-powered features.',
    1299.00,
    1399.00,
    (SELECT id FROM public.categories WHERE slug = 'mobiles'),
    'Samsung',
    20,
    ARRAY['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800'],
    '{"display": "6.8-inch Dynamic AMOLED 2X", "processor": "Snapdragon 8 Gen 3", "camera": "200MP + 50MP + 12MP + 10MP", "battery": "5000mAh"}'::jsonb,
    false
  ),
  (
    'Modern Dining Table Set',
    'modern-dining-table-set',
    'Elegant 6-seater dining table with solid wood construction and contemporary design.',
    649.00,
    799.00,
    (SELECT id FROM public.categories WHERE slug = 'tables'),
    'HomeStyle',
    10,
    ARRAY['https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800'],
    '{"material": "Solid Oak Wood", "seating": "6 persons", "dimensions": "180cm x 90cm", "finish": "Natural Wood"}'::jsonb,
    false
  ),
  (
    'Velvet Accent Chair',
    'velvet-accent-chair',
    'Stylish accent chair with soft velvet upholstery and gold metal legs, perfect for bedrooms or living rooms.',
    229.00,
    279.00,
    (SELECT id FROM public.categories WHERE slug = 'chairs'),
    'LuxeHome',
    18,
    ARRAY['https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800'],
    '{"material": "Velvet & Metal", "color": "Navy Blue", "weight_capacity": "120kg", "style": "Contemporary"}'::jsonb,
    false
  );