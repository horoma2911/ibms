-- categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(191) NOT NULL,
  slug varchar(191) UNIQUE,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- products
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku varchar(100) UNIQUE,
  name varchar(191) NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  cost numeric(14,2) DEFAULT 0,
  price numeric(14,2) DEFAULT 0,
  stock integer DEFAULT 0,
  unit varchar(50),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);
