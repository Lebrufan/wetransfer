/*
  # Schema Inicial do Sistema de Transfer

  1. Tabelas Criadas
    - `users` - Extensão da tabela auth.users para informações adicionais
      - `id` (uuid, referência para auth.users)
      - `full_name` (text)
      - `phone` (text)
      - `role` (text, default 'user')
      - `created_at` (timestamptz)
      
    - `routes` - Rotas de transfer
      - `id` (uuid, primary key)
      - `origin` (text)
      - `destination` (text)
      - `distance_km` (numeric)
      - `duration_minutes` (integer)
      - `active` (boolean)
      - `is_return_route` (boolean)
      - `transfer_type` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `vehicle_types` - Tipos de veículos
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `capacity` (integer)
      - `base_price` (numeric)
      - `price_per_km` (numeric)
      - `image_url` (text)
      - `active` (boolean)
      - `created_at` (timestamptz)
      
    - `additional_items` - Itens adicionais
      - `id` (uuid, primary key)
      - `name` (text)
      - `price` (numeric)
      - `active` (boolean)
      - `created_at` (timestamptz)
      
    - `pricing_rules` - Regras de preço
      - `id` (uuid, primary key)
      - `route_id` (uuid, referência routes)
      - `vehicle_type_id` (uuid, referência vehicle_types)
      - `price_adjustment` (numeric)
      - `active` (boolean)
      - `created_at` (timestamptz)
      
    - `frequent_locations` - Localizações frequentes
      - `id` (uuid, primary key)
      - `name` (text)
      - `address` (text)
      - `latitude` (numeric)
      - `longitude` (numeric)
      - `active` (boolean)
      - `created_at` (timestamptz)
      
    - `bookings` - Reservas
      - `id` (uuid, primary key)
      - `user_id` (uuid, referência users)
      - `route_id` (uuid, referência routes)
      - `vehicle_type_id` (uuid, referência vehicle_types)
      - `pickup_location` (text)
      - `dropoff_location` (text)
      - `pickup_date` (date)
      - `pickup_time` (time)
      - `passengers` (integer)
      - `total_price` (numeric)
      - `status` (text, default 'pending')
      - `payment_status` (text, default 'pending')
      - `customer_name` (text)
      - `customer_email` (text)
      - `customer_phone` (text)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `quote_requests` - Solicitações de cotação
      - `id` (uuid, primary key)
      - `customer_name` (text)
      - `customer_email` (text)
      - `customer_phone` (text)
      - `origin` (text)
      - `destination` (text)
      - `transfer_type` (text)
      - `pickup_date` (date)
      - `passengers` (integer)
      - `notes` (text)
      - `status` (text, default 'pending')
      - `created_at` (timestamptz)
      
    - `app_config` - Configurações do aplicativo
      - `id` (uuid, primary key)
      - `key` (text, unique)
      - `value` (text)
      - `updated_at` (timestamptz)

  2. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas para leitura pública de dados ativos
    - Políticas para admin gerenciar tudo
    - Políticas para usuários gerenciarem suas reservas
*/

-- Criar extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários (extensão)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  role text DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver próprio perfil"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins podem ver todos usuários"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Tabela de rotas
CREATE TABLE IF NOT EXISTS routes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  origin text NOT NULL,
  destination text NOT NULL,
  distance_km numeric,
  duration_minutes integer,
  active boolean DEFAULT true,
  is_return_route boolean DEFAULT false,
  transfer_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rotas ativas são públicas"
  ON routes FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Admins podem gerenciar rotas"
  ON routes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Tabela de tipos de veículos
CREATE TABLE IF NOT EXISTS vehicle_types (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  capacity integer NOT NULL,
  base_price numeric NOT NULL DEFAULT 0,
  price_per_km numeric NOT NULL DEFAULT 0,
  image_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vehicle_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tipos de veículos ativos são públicos"
  ON vehicle_types FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Admins podem gerenciar tipos de veículos"
  ON vehicle_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Tabela de itens adicionais
CREATE TABLE IF NOT EXISTS additional_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE additional_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Itens adicionais ativos são públicos"
  ON additional_items FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Admins podem gerenciar itens adicionais"
  ON additional_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Tabela de regras de preço
CREATE TABLE IF NOT EXISTS pricing_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id uuid REFERENCES routes(id) ON DELETE CASCADE,
  vehicle_type_id uuid REFERENCES vehicle_types(id) ON DELETE CASCADE,
  price_adjustment numeric NOT NULL DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Regras de preço ativas são públicas"
  ON pricing_rules FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Admins podem gerenciar regras de preço"
  ON pricing_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Tabela de localizações frequentes
CREATE TABLE IF NOT EXISTS frequent_locations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  address text NOT NULL,
  latitude numeric,
  longitude numeric,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE frequent_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Localizações frequentes ativas são públicas"
  ON frequent_locations FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Admins podem gerenciar localizações frequentes"
  ON frequent_locations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Tabela de reservas
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  route_id uuid REFERENCES routes(id) ON DELETE SET NULL,
  vehicle_type_id uuid REFERENCES vehicle_types(id) ON DELETE SET NULL,
  pickup_location text NOT NULL,
  dropoff_location text NOT NULL,
  pickup_date date NOT NULL,
  pickup_time time NOT NULL,
  passengers integer NOT NULL,
  total_price numeric NOT NULL,
  status text DEFAULT 'pending',
  payment_status text DEFAULT 'pending',
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver próprias reservas"
  ON bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar reservas"
  ON bookings FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins podem gerenciar todas reservas"
  ON bookings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Tabela de solicitações de cotação
CREATE TABLE IF NOT EXISTS quote_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  origin text NOT NULL,
  destination text NOT NULL,
  transfer_type text NOT NULL,
  pickup_date date,
  passengers integer,
  notes text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer pessoa pode criar cotação"
  ON quote_requests FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins podem gerenciar cotações"
  ON quote_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Tabela de configurações
CREATE TABLE IF NOT EXISTS app_config (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Configurações são públicas para leitura"
  ON app_config FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins podem gerenciar configurações"
  ON app_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_config_updated_at BEFORE UPDATE ON app_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
