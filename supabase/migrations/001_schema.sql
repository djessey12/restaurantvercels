-- ============================================================
-- Restaurant POS - Schéma Supabase
-- ============================================================

-- ── Nettoyage (idempotent) ──────────────────────────────────
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS order_items  CASCADE;
DROP TABLE IF EXISTS orders       CASCADE;
DROP TABLE IF EXISTS menu_items   CASCADE;
DROP TABLE IF EXISTS categories   CASCADE;

-- ── Tables ────────────────────────────────────────────────

CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  name TEXT    NOT NULL,
  icon TEXT    NOT NULL DEFAULT '🍽️',
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE menu_items (
  id          SERIAL  PRIMARY KEY,
  name        TEXT    NOT NULL,
  emoji       TEXT    NOT NULL DEFAULT '🍽️',
  description TEXT    NOT NULL DEFAULT '',
  price       INTEGER NOT NULL CHECK (price >= 0),
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  available   BOOLEAN NOT NULL DEFAULT true,
  media_url   TEXT,
  media_type  TEXT    CHECK (media_type IN ('image', 'video', NULL)),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
  id          TEXT PRIMARY KEY,
  table_name  TEXT NOT NULL DEFAULT '',
  client_name TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending_validation'
                   CHECK (status IN (
                     'pending_validation','pending','acknowledged',
                     'preparing','ready','served','cancelled'
                   )),
  total       INTEGER NOT NULL DEFAULT 0,
  rating      INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  id          SERIAL  PRIMARY KEY,
  order_id    TEXT    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_index  INTEGER NOT NULL,
  name        TEXT    NOT NULL,
  emoji       TEXT    NOT NULL DEFAULT '🍽️',
  price       INTEGER NOT NULL,
  qty         INTEGER NOT NULL DEFAULT 1 CHECK (qty > 0),
  done        BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (order_id, item_index)
);

CREATE TABLE transactions (
  id         SERIAL  PRIMARY KEY,
  order_id   TEXT    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action     TEXT    NOT NULL,
  actor      TEXT    NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Index pour les requêtes fréquentes ────────────────────

CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_orders_created    ON orders(created_at DESC);
CREATE INDEX idx_orders_updated    ON orders(updated_at DESC);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_transactions_order ON transactions(order_id);
CREATE INDEX idx_menu_available    ON menu_items(available);

-- ── Row Level Security ─────────────────────────────────────
-- Toutes les données passent par nos routes API (service role).
-- La clé anon ne peut rien lire/écrire directement.

ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Aucune politique = aucun accès pour anon/authenticated
-- Le service role (utilisé côté serveur) contourne le RLS automatiquement.

-- ── Données initiales ─────────────────────────────────────

INSERT INTO categories (name, icon, sort) VALUES
  ('Entrees',  '🥗',  1),
  ('Plats',    '🍽️', 2),
  ('Desserts', '🍮',  3),
  ('Boissons', '🥤',  4);

INSERT INTO menu_items (name, emoji, description, price, category_id) VALUES
  ('Salade Cesar',       '🥗', 'Laitue romaine, parmesan, croutons, sauce cesar maison',     4500, 1),
  ('Soupe a l''oignon',  '🧅', 'Soupe traditionnelle gratinee au fromage',                   3500, 1),
  ('Bruschetta',         '🍅', 'Pain grille, tomates fraiches, basilic, huile d''olive',     3000, 1),
  ('Accras de morue',    '🐟', 'Beignets de morue epices, sauce chien',                      4000, 1),
  ('Entrecote 300g',     '🥩', 'Entrecote grillee, sauce au poivre, frites maison',          14000, 2),
  ('Poulet braise',      '🍗', 'Poulet marine aux epices, braise au charbon',                8500, 2),
  ('Poisson grille',     '🐠', 'Poisson du jour grille, legumes vapeur',                     11000, 2),
  ('Riz sauce arachide', '🍚', 'Riz parfume, sauce arachide onctueuse, viande',              6500, 2),
  ('Spaghetti Bolognaise','🍝','Pates fraiches, sauce tomate, viande hachee',                7000, 2),
  ('Attieke poisson',    '🍛', 'Attieke frais, poisson braise, piment',                      7500, 2),
  ('Burger Classic',     '🍔', 'Boeuf, cheddar, salade, tomate, sauce maison',               8000, 2),
  ('Tiramisu',           '🍰', 'Tiramisu classique au cafe et mascarpone',                   4500, 3),
  ('Creme brulee',       '🍮', 'Creme vanille, caramel croustillant',                        4000, 3),
  ('Fondant chocolat',   '🍫', 'Coeur coulant au chocolat noir',                             5000, 3),
  ('Jus de fruits frais','🧃', 'Jus presse du jour (mangue, ananas, passion)',               2500, 4),
  ('Bissap',             '🌺', 'Infusion d''hibiscus glacee, menthe',                        2000, 4),
  ('Gingembre',          '🫚', 'Jus de gingembre frais, citron, miel',                       2000, 4);

-- ── Bucket Supabase Storage ──────────────────────────────
-- À créer manuellement dans le dashboard Supabase :
--   Storage → New bucket → "menu-media" → Public: true
-- Ou via la CLI : supabase storage create menu-media --public
