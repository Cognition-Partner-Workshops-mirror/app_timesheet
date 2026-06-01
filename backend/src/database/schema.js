/**
 * Database schema for the Event Services Marketplace.
 * Defines tables for users, service categories, services, bookings, and reviews.
 * Supports role-based access: admin, business, customer.
 */

const SCHEMA_STATEMENTS = [
  // Users table - stores all platform users with role-based access
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK(role IN ('admin', 'business', 'customer')),
    is_approved INTEGER DEFAULT 0,
    avatar_url TEXT,
    business_name TEXT,
    business_description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,

  // Service categories - predefined categories like decorator, caterer, function hall
  `CREATE TABLE IF NOT EXISTS service_categories (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`,

  // Services - listings created by business users
  `CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    business_user_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price_min REAL NOT NULL,
    price_max REAL,
    location TEXT,
    city TEXT,
    image_url TEXT,
    is_active INTEGER DEFAULT 1,
    capacity_min INTEGER,
    capacity_max INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (business_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES service_categories(id)
  )`,

  // Bookings - customers booking services
  `CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL,
    customer_user_id TEXT NOT NULL,
    event_date TEXT NOT NULL,
    event_type TEXT,
    guest_count INTEGER,
    special_requests TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    total_amount REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  // Reviews - customers reviewing services after completed bookings
  `CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    booking_id TEXT UNIQUE NOT NULL,
    customer_user_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
  )`
];

// Seed default service categories for the event services marketplace
// Categories match common Indian event service types (Mandapalu, Function Halls, etc.)
const SEED_CATEGORIES = [
  { id: 'cat-mandapam', name: 'Mandapalu (Wedding Halls)', description: 'Traditional wedding mandapams and kalyana mandapams for ceremonies', icon: '🛕' },
  { id: 'cat-function-hall', name: 'Function Halls', description: 'Banquet halls, party halls, and conference venues', icon: '🏛️' },
  { id: 'cat-decorator', name: 'Stage Decorations', description: 'Stage setup, floral decoration, lighting, and themed event decor', icon: '🎨' },
  { id: 'cat-caterer', name: 'Catering', description: 'Multi-cuisine catering, food stalls, and beverage services', icon: '🍽️' },
  { id: 'cat-photography', name: 'Photography & Video', description: 'Professional photography, videography, and drone coverage', icon: '📸' },
  { id: 'cat-music', name: 'Music & DJ', description: 'Live bands, DJs, sound systems, and music entertainment', icon: '🎵' },
  { id: 'cat-planner', name: 'Event Planners', description: 'End-to-end event planning, coordination, and management', icon: '📋' },
  { id: 'cat-transport', name: 'Transport', description: 'Wedding cars, guest transport, and logistics', icon: '🚗' },
  { id: 'cat-rental', name: 'Equipment & Tent Rental', description: 'Shamiana, pandal, chairs, tables, tents, and equipment', icon: '🪑' },
  { id: 'cat-mehendi', name: 'Mehendi & Makeup', description: 'Bridal mehendi artists and professional makeup services', icon: '💅' }
];

module.exports = { SCHEMA_STATEMENTS, SEED_CATEGORIES };
