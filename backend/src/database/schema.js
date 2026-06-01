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
const SEED_CATEGORIES = [
  { id: 'cat-decorator', name: 'Function Decorator', description: 'Event decoration services including floral, lighting, and theme setup', icon: '🎨' },
  { id: 'cat-caterer', name: 'Catering', description: 'Food and beverage services for events', icon: '🍽️' },
  { id: 'cat-function-hall', name: 'Function Hall', description: 'Venues and halls for events, weddings, and parties', icon: '🏛️' },
  { id: 'cat-photography', name: 'Photography', description: 'Professional photography and videography services', icon: '📸' },
  { id: 'cat-music', name: 'Music & DJ', description: 'Live bands, DJs, and music entertainment', icon: '🎵' },
  { id: 'cat-planner', name: 'Event Planner', description: 'Full-service event planning and coordination', icon: '📋' },
  { id: 'cat-transport', name: 'Transport', description: 'Event transportation and logistics', icon: '🚗' },
  { id: 'cat-rental', name: 'Equipment Rental', description: 'Tables, chairs, tents, and equipment rental', icon: '🪑' }
];

module.exports = { SCHEMA_STATEMENTS, SEED_CATEGORIES };
