-- AKSARA · skema PostgreSQL (akses data hanya lewat query berparameter / ORM)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TYPE user_role AS ENUM ('USER','ADMIN');
CREATE TYPE order_status AS ENUM ('PENDING','PAID','SHIPPED','COMPLETED','CANCELLED');
CREATE TYPE pay_method AS ENUM ('VIRTUAL_ACCOUNT','EWALLET','QRIS');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(60) NOT NULL,
  email varchar(254) NOT NULL,
  password_hash text NOT NULL,                 -- bcrypt, cost >= 12
  role user_role NOT NULL DEFAULT 'USER',
  store_credit numeric(12,2) NOT NULL DEFAULT 0 CHECK (store_credit >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_uq ON users (lower(email));

CREATE TABLE categories (
  id serial PRIMARY KEY,
  slug varchar(40) UNIQUE NOT NULL,            -- fti, feb, umum-akademik, custom, buku, kuliner
  name varchar(60) NOT NULL
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id int NOT NULL REFERENCES categories(id),
  sku varchar(40) UNIQUE NOT NULL,
  name varchar(120) NOT NULL,
  description text,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  stock int NOT NULL DEFAULT 0 CHECK (stock >= 0),
  faculty varchar(3) CHECK (faculty IN ('FTI','FEB')),
  major varchar(60),
  min_semester smallint NOT NULL DEFAULT 1,
  max_semester smallint NOT NULL DEFAULT 8,
  images jsonb NOT NULL DEFAULT '[]',
  specs jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX products_search_idx ON products USING gin (to_tsvector('indonesian', name));
CREATE INDEX products_kit_idx ON products (faculty, major, min_semester, max_semester);

CREATE TABLE bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  faculty varchar(3) NOT NULL CHECK (faculty IN ('FTI','FEB')),
  major varchar(60) NOT NULL,
  semester smallint NOT NULL CHECK (semester BETWEEN 1 AND 8),
  discount_pct numeric(5,2) NOT NULL DEFAULT 15
);
CREATE TABLE bundle_items (
  bundle_id uuid REFERENCES bundles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  qty int NOT NULL DEFAULT 1 CHECK (qty > 0),
  PRIMARY KEY (bundle_id, product_id)
);

CREATE TABLE customizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  product_id uuid NOT NULL REFERENCES products(id),
  engraved_name varchar(24) NOT NULL,
  paper_type varchar(10) NOT NULL CHECK (paper_type IN ('GRID','DOTTED','LINED','BLANK')),
  cover_style varchar(30) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  status order_status NOT NULL DEFAULT 'PENDING',
  payment_method pay_method NOT NULL,
  subtotal numeric(12,2) NOT NULL,
  tax numeric(12,2) NOT NULL,
  shipping_fee numeric(12,2) NOT NULL,
  credit_used numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL,
  shipping_address jsonb NOT NULL,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_user_idx ON orders (user_id, created_at DESC);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  bundle_id uuid REFERENCES bundles(id),
  customization_id uuid REFERENCES customizations(id),
  qty int NOT NULL CHECK (qty > 0),
  unit_price numeric(12,2) NOT NULL
);

CREATE TABLE book_swap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  isbn varchar(17) NOT NULL,
  title varchar(160) NOT NULL,
  condition varchar(12) NOT NULL CHECK (condition IN ('SANGAT_BAIK','BAIK','CUKUP')),
  estimated_value numeric(12,2) NOT NULL,
  credit_awarded numeric(12,2) NOT NULL DEFAULT 0,
  status varchar(12) NOT NULL DEFAULT 'SUBMITTED',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE culinary_items (
  product_id uuid PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  weight_g int,
  halal_cert varchar(40),
  expiry_days int,
  allergens text[] NOT NULL DEFAULT '{}'
);

-- Rekomendasi paket per semester ($1 fakultas, $2 jurusan, $3 semester):
-- SELECT * FROM products
--  WHERE is_active AND stock > 0 AND faculty = $1
--    AND (major IS NULL OR major = $2) AND $3 BETWEEN min_semester AND max_semester;
