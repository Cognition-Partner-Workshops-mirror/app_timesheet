/**
 * Database initialization module for Event Services Marketplace.
 * Uses SQLite in-memory database. Creates schema tables and seeds
 * default categories + admin user on startup.
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { SCHEMA_STATEMENTS, SEED_CATEGORIES } = require('./schema');

let db = null;
let isClosing = false;
let isClosed = false;

// Returns singleton database connection
function getDatabase() {
  if (!db) {
    isClosing = false;
    isClosed = false;
    db = new sqlite3.Database(':memory:', (err) => {
      if (err) {
        console.error('Error opening database:', err);
        throw err;
      }
      console.log('Connected to SQLite in-memory database');
    });
  }
  return db;
}

// Wraps db.run in a promise for async/await usage
function runAsync(database, sql, params = []) {
  return new Promise((resolve, reject) => {
    database.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Initialize all schema tables, seed categories, and create default admin
async function initializeDatabase() {
  const database = getDatabase();

  return new Promise((resolve, reject) => {
    database.serialize(async () => {
      try {
        // Enable foreign keys
        database.run('PRAGMA foreign_keys = ON');

        // Create all schema tables
        for (const stmt of SCHEMA_STATEMENTS) {
          database.run(stmt);
        }

        // Seed default service categories
        const catStmt = database.prepare(
          'INSERT OR IGNORE INTO service_categories (id, name, description, icon) VALUES (?, ?, ?, ?)'
        );
        for (const cat of SEED_CATEGORIES) {
          catStmt.run(cat.id, cat.name, cat.description, cat.icon);
        }
        catStmt.finalize();

        // Create default admin user (admin@eventmarket.com / admin123)
        const adminId = 'admin-default';
        const adminHash = bcrypt.hashSync('admin123', 10);
        database.run(
          `INSERT OR IGNORE INTO users (id, email, password_hash, name, role, is_approved)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [adminId, 'admin@eventmarket.com', adminHash, 'Platform Admin', 'admin', 1]
        );

        // Create indexes for query performance
        database.run('CREATE INDEX IF NOT EXISTS idx_services_business ON services(business_user_id)');
        database.run('CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id)');
        database.run('CREATE INDEX IF NOT EXISTS idx_services_city ON services(city)');
        database.run('CREATE INDEX IF NOT EXISTS idx_bookings_service ON bookings(service_id)');
        database.run('CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_user_id)');
        database.run('CREATE INDEX IF NOT EXISTS idx_reviews_service ON reviews(service_id)');

        // --- Seed sample business users (approved) with phone numbers ---
        const bizHash = bcrypt.hashSync('password123', 10);
        const sampleBusinesses = [
          { id: 'biz-royal-decor', email: 'royal@eventmarket.com', name: 'Rajesh Kumar', phone: '9848012345', business_name: 'Royal Decorations', business_description: 'Premium stage decoration services with 10+ years experience' },
          { id: 'biz-tasty-bites', email: 'tasty@eventmarket.com', name: 'Priya Sharma', phone: '9848023456', business_name: 'Tasty Bites Catering', business_description: 'Multi-cuisine catering for all types of events' },
          { id: 'biz-grand-hall', email: 'grand@eventmarket.com', name: 'Suresh Patel', phone: '9848034567', business_name: 'Grand Palace Halls', business_description: 'Luxury function halls and banquet venues' },
          { id: 'biz-capture-moments', email: 'capture@eventmarket.com', name: 'Anita Reddy', phone: '9848045678', business_name: 'Capture Moments Studios', business_description: 'Professional photography and cinematic videography' },
          { id: 'biz-beat-masters', email: 'beats@eventmarket.com', name: 'DJ Vikram', phone: '9848056789', business_name: 'Beat Masters Entertainment', business_description: 'DJ services, live bands, and sound systems' },
          { id: 'biz-dream-events', email: 'dream@eventmarket.com', name: 'Meera Nair', phone: '9848067890', business_name: 'Dream Events Planning', business_description: 'End-to-end event planning and coordination' },
          { id: 'biz-sri-mandapam', email: 'srimandapam@eventmarket.com', name: 'Venkat Rao', phone: '9848078901', business_name: 'Sri Lakshmi Mandapam', business_description: 'Traditional kalyana mandapams for Hindu weddings' },
          { id: 'biz-shubh-tent', email: 'shubhtent@eventmarket.com', name: 'Ravi Teja', phone: '9848089012', business_name: 'Shubh Tent House', business_description: 'Shamiana, pandal, tent and equipment rentals' },
          { id: 'biz-bridal-glow', email: 'bridalglow@eventmarket.com', name: 'Kavitha Reddy', phone: '9848090123', business_name: 'Bridal Glow Studio', business_description: 'Bridal makeup and mehendi art services' },
          { id: 'biz-sai-transport', email: 'saitransport@eventmarket.com', name: 'Sai Kumar', phone: '9848001234', business_name: 'Sai Wedding Cars', business_description: 'Luxury wedding car rentals and guest transport' },
        ];
        const bizStmt = database.prepare(
          `INSERT OR IGNORE INTO users (id, email, password_hash, name, phone, role, is_approved, business_name, business_description)
           VALUES (?, ?, ?, ?, ?, 'business', 1, ?, ?)`
        );
        for (const b of sampleBusinesses) {
          bizStmt.run(b.id, b.email, bizHash, b.name, b.phone, b.business_name, b.business_description);
        }
        bizStmt.finalize();

        // --- Seed sample customer users ---
        const custHash = bcrypt.hashSync('password123', 10);
        const sampleCustomers = [
          { id: 'cust-rahul', email: 'rahul@example.com', name: 'Rahul Verma', phone: '9876543210' },
          { id: 'cust-sneha', email: 'sneha@example.com', name: 'Sneha Gupta', phone: '9876543211' },
          { id: 'cust-amit', email: 'amit@example.com', name: 'Amit Singh', phone: '9876543212' },
        ];
        const custStmt = database.prepare(
          `INSERT OR IGNORE INTO users (id, email, password_hash, name, phone, role, is_approved)
           VALUES (?, ?, ?, ?, ?, 'customer', 1)`
        );
        for (const c of sampleCustomers) {
          custStmt.run(c.id, c.email, custHash, c.name, c.phone);
        }
        custStmt.finalize();

        // --- Seed sample services across all categories with images ---
        // Using picsum.photos for placeholder images (free, open-source friendly)
        const sampleServices = [
          // Mandapalu (Wedding Halls)
          { id: 'svc-sri-kalyana', biz: 'biz-sri-mandapam', cat: 'cat-mandapam', name: 'Sri Lakshmi Kalyana Mandapam', desc: 'Traditional AC kalyana mandapam with pooja room, homa gundam, spacious dining hall, and parking. Ideal for Hindu weddings and religious ceremonies.', pmin: 40000, pmax: 120000, city: 'Hyderabad', location: 'Kukatpally, Hyderabad', img: 'https://picsum.photos/seed/mandapam1/600/400', cmin: 100, cmax: 500 },
          { id: 'svc-sri-convention', biz: 'biz-sri-mandapam', cat: 'cat-mandapam', name: 'Sri Lakshmi Convention Center', desc: 'Modern convention center with traditional touch. Multiple halls, VIP rooms, generator backup, and valet parking. Perfect for grand weddings.', pmin: 80000, pmax: 250000, city: 'Hyderabad', location: 'LB Nagar, Hyderabad', img: 'https://picsum.photos/seed/mandapam2/600/400', cmin: 200, cmax: 1000 },
          // Function Halls
          { id: 'svc-grand-banquet', biz: 'biz-grand-hall', cat: 'cat-function-hall', name: 'Grand Banquet Hall', desc: 'Air-conditioned banquet hall with 2000 sq ft area, built-in stage, professional lighting, sound system, parking for 100 cars, and bridal suite.', pmin: 50000, pmax: 200000, city: 'Bangalore', location: 'MG Road, Bangalore', img: 'https://picsum.photos/seed/hall1/600/400', cmin: 100, cmax: 500 },
          { id: 'svc-grand-garden', biz: 'biz-grand-hall', cat: 'cat-function-hall', name: 'Garden Venue - Open Air', desc: 'Beautiful landscaped garden venue for outdoor weddings and receptions. Includes tent setup, garden lighting, and backup indoor hall.', pmin: 30000, pmax: 120000, city: 'Bangalore', location: 'Whitefield, Bangalore', img: 'https://picsum.photos/seed/garden1/600/400', cmin: 100, cmax: 800 },
          // Stage Decorations
          { id: 'svc-royal-wedding', biz: 'biz-royal-decor', cat: 'cat-decorator', name: 'Royal Wedding Stage Decoration', desc: 'Complete wedding stage decoration with floral arrangements, mandap setup, LED backdrop, lighting, and entrance decor. Premium flowers and fabrics used.', pmin: 25000, pmax: 150000, city: 'Hyderabad', location: 'Available citywide', img: 'https://picsum.photos/seed/decor1/600/400', cmin: 50, cmax: 2000 },
          { id: 'svc-royal-birthday', biz: 'biz-royal-decor', cat: 'cat-decorator', name: 'Birthday & Reception Stage Decor', desc: 'Themed stage decoration for birthdays, receptions, and engagements. Balloon arches, photo booth, LED walls, table settings, and custom cake table.', pmin: 5000, pmax: 30000, city: 'Hyderabad', location: 'Available citywide', img: 'https://picsum.photos/seed/decor2/600/400', cmin: 10, cmax: 200 },
          // Catering
          { id: 'svc-tasty-veg', biz: 'biz-tasty-bites', cat: 'cat-caterer', name: 'Premium Vegetarian Buffet', desc: 'Lavish vegetarian buffet with 15+ dishes including starters, main course, live counters (chaat, pasta, dosa), desserts, and beverages. Per plate pricing.', pmin: 800, pmax: 1500, city: 'Mumbai', location: 'Pan-Mumbai delivery', img: 'https://picsum.photos/seed/food1/600/400', cmin: 50, cmax: 5000 },
          { id: 'svc-tasty-nonveg', biz: 'biz-tasty-bites', cat: 'cat-caterer', name: 'Royal Non-Veg Feast', desc: 'Multi-cuisine non-veg spread with biryanis, kebabs, curries, Chinese starters, live grill counter, and premium desserts. Per plate pricing.', pmin: 1000, pmax: 2000, city: 'Mumbai', location: 'Pan-Mumbai delivery', img: 'https://picsum.photos/seed/food2/600/400', cmin: 50, cmax: 3000 },
          // Photography & Video
          { id: 'svc-capture-wedding', biz: 'biz-capture-moments', cat: 'cat-photography', name: 'Complete Wedding Photography', desc: 'Full wedding coverage: pre-wedding shoot, ceremony, reception. Two photographers + one videographer. Cinematic highlight reel + photo album delivered.', pmin: 50000, pmax: 300000, city: 'Chennai', location: 'Available across Tamil Nadu', img: 'https://picsum.photos/seed/photo1/600/400', cmin: null, cmax: null },
          { id: 'svc-capture-portrait', biz: 'biz-capture-moments', cat: 'cat-photography', name: 'Event Photography Package', desc: 'Professional event photography for corporate events, birthdays, and parties. 4-hour coverage with 200+ edited photos delivered in 48 hours.', pmin: 10000, pmax: 25000, city: 'Chennai', location: 'Available across Tamil Nadu', img: 'https://picsum.photos/seed/photo2/600/400', cmin: null, cmax: null },
          // Music & DJ
          { id: 'svc-beat-wedding', biz: 'biz-beat-masters', cat: 'cat-music', name: 'Wedding DJ Package', desc: 'Complete DJ setup: premium 5000W sound system, LED dance floor, fog machine, laser lights, and professional DJ for 6 hours. Song requests welcome!', pmin: 25000, pmax: 75000, city: 'Delhi', location: 'Available across NCR', img: 'https://picsum.photos/seed/dj1/600/400', cmin: 50, cmax: 1000 },
          { id: 'svc-beat-live', biz: 'biz-beat-masters', cat: 'cat-music', name: 'Live Band Performance', desc: '5-piece live band performing Bollywood, retro, and western hits. 3-hour performance with professional sound setup included.', pmin: 40000, pmax: 100000, city: 'Delhi', location: 'Available across NCR', img: 'https://picsum.photos/seed/band1/600/400', cmin: 50, cmax: 500 },
          // Event Planners
          { id: 'svc-dream-wedding', biz: 'biz-dream-events', cat: 'cat-planner', name: 'Complete Wedding Planning', desc: 'End-to-end wedding planning: venue selection, vendor coordination, decor, catering, entertainment, guest management, and day-of coordination.', pmin: 100000, pmax: 500000, city: 'Hyderabad', location: 'Available across Telangana', img: 'https://picsum.photos/seed/planner1/600/400', cmin: 100, cmax: 2000 },
          { id: 'svc-dream-corporate', biz: 'biz-dream-events', cat: 'cat-planner', name: 'Corporate Event Management', desc: 'Professional corporate event planning: conferences, team outings, product launches, annual meets. AV setup, catering, and logistics included.', pmin: 50000, pmax: 300000, city: 'Hyderabad', location: 'Available across Telangana', img: 'https://picsum.photos/seed/corporate1/600/400', cmin: 20, cmax: 1000 },
          // Equipment & Tent Rental
          { id: 'svc-shubh-shamiana', biz: 'biz-shubh-tent', cat: 'cat-rental', name: 'Wedding Shamiana & Pandal Setup', desc: 'Complete shamiana/pandal setup with decorative cloth, lighting, fans, chairs (500+), tables, stage platform, and entrance gate. Includes setup and teardown.', pmin: 15000, pmax: 80000, city: 'Hyderabad', location: 'Available across Telangana', img: 'https://picsum.photos/seed/tent1/600/400', cmin: 100, cmax: 2000 },
          { id: 'svc-shubh-chairs', biz: 'biz-shubh-tent', cat: 'cat-rental', name: 'Chairs, Tables & Crockery Rental', desc: 'Bulk rental of chairs (cushion/plastic), round tables, crockery sets, glass sets, and serving utensils. Delivery and pickup included.', pmin: 5000, pmax: 25000, city: 'Hyderabad', location: 'Available across Telangana', img: 'https://picsum.photos/seed/chairs1/600/400', cmin: 50, cmax: 5000 },
          // Mehendi & Makeup
          { id: 'svc-bridal-makeup', biz: 'biz-bridal-glow', cat: 'cat-mehendi', name: 'Bridal Makeup Package', desc: 'Complete bridal makeup with HD/Airbrush technique, hairstyling, draping, and touch-ups. Includes engagement + wedding day makeup. Trial session included.', pmin: 15000, pmax: 50000, city: 'Hyderabad', location: 'Doorstep service available', img: 'https://picsum.photos/seed/makeup1/600/400', cmin: null, cmax: null },
          { id: 'svc-mehendi-art', biz: 'biz-bridal-glow', cat: 'cat-mehendi', name: 'Bridal Mehendi Art', desc: 'Traditional and Arabic mehendi designs for bride and family. Includes bridal full-hand design, family mehendi for 10 members, and custom designs.', pmin: 5000, pmax: 20000, city: 'Hyderabad', location: 'Doorstep service available', img: 'https://picsum.photos/seed/mehendi1/600/400', cmin: null, cmax: null },
          // Transport
          { id: 'svc-wedding-car', biz: 'biz-sai-transport', cat: 'cat-transport', name: 'Luxury Wedding Car', desc: 'Decorated luxury car (Innova Crysta / Fortuner / Mercedes) for wedding procession. Includes flower decoration, driver, and 8-hour service.', pmin: 8000, pmax: 30000, city: 'Hyderabad', location: 'Available across Telangana', img: 'https://picsum.photos/seed/car1/600/400', cmin: null, cmax: null },
          { id: 'svc-guest-transport', biz: 'biz-sai-transport', cat: 'cat-transport', name: 'Guest Transport Package', desc: 'Mini bus and tempo traveller fleet for guest pickup/drop. AC vehicles with professional drivers. Available for 50-500 guest events.', pmin: 15000, pmax: 80000, city: 'Hyderabad', location: 'Available across Telangana', img: 'https://picsum.photos/seed/bus1/600/400', cmin: 50, cmax: 500 },
        ];
        const svcStmt = database.prepare(
          `INSERT OR IGNORE INTO services (id, business_user_id, category_id, name, description, price_min, price_max, city, location, image_url, capacity_min, capacity_max)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        for (const s of sampleServices) {
          svcStmt.run(s.id, s.biz, s.cat, s.name, s.desc, s.pmin, s.pmax, s.city, s.location, s.img, s.cmin, s.cmax);
        }
        svcStmt.finalize();

        // --- Seed sample bookings with various statuses ---
        const sampleBookings = [
          { id: 'bkg-1', svc: 'svc-royal-wedding', cust: 'cust-rahul', date: '2026-07-15', type: 'Wedding', guests: 300, amount: 75000, status: 'completed' },
          { id: 'bkg-2', svc: 'svc-tasty-veg', cust: 'cust-sneha', date: '2026-07-20', type: 'Engagement', guests: 150, amount: 120000, status: 'completed' },
          { id: 'bkg-3', svc: 'svc-grand-banquet', cust: 'cust-amit', date: '2026-08-10', type: 'Wedding Reception', guests: 400, amount: 150000, status: 'confirmed' },
          { id: 'bkg-4', svc: 'svc-capture-wedding', cust: 'cust-rahul', date: '2026-08-15', type: 'Wedding', guests: 300, amount: 150000, status: 'confirmed' },
          { id: 'bkg-5', svc: 'svc-beat-wedding', cust: 'cust-sneha', date: '2026-09-01', type: 'Sangeet', guests: 200, amount: 50000, status: 'pending' },
          { id: 'bkg-6', svc: 'svc-dream-wedding', cust: 'cust-amit', date: '2026-09-20', type: 'Wedding', guests: 500, amount: 350000, status: 'pending' },
          { id: 'bkg-7', svc: 'svc-royal-birthday', cust: 'cust-sneha', date: '2026-06-25', type: 'Birthday', guests: 50, amount: 15000, status: 'completed' },
          { id: 'bkg-8', svc: 'svc-tasty-nonveg', cust: 'cust-rahul', date: '2026-07-01', type: 'Anniversary', guests: 100, amount: 150000, status: 'cancelled' },
        ];
        const bkgStmt = database.prepare(
          `INSERT OR IGNORE INTO bookings (id, service_id, customer_user_id, event_date, event_type, guest_count, total_amount, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        );
        for (const b of sampleBookings) {
          bkgStmt.run(b.id, b.svc, b.cust, b.date, b.type, b.guests, b.amount, b.status);
        }
        bkgStmt.finalize();

        // --- Seed sample reviews for completed bookings ---
        const sampleReviews = [
          { id: 'rev-1', booking: 'bkg-1', cust: 'cust-rahul', svc: 'svc-royal-wedding', rating: 5, comment: 'Absolutely stunning wedding decoration! The mandap was breathtaking and the floral arrangements were beyond our expectations. Highly recommend!' },
          { id: 'rev-2', booking: 'bkg-2', cust: 'cust-sneha', svc: 'svc-tasty-veg', rating: 4, comment: 'Delicious food with excellent variety. The live counters were a hit with our guests. Only minor delay in dessert service, but overall fantastic!' },
          { id: 'rev-3', booking: 'bkg-7', cust: 'cust-sneha', svc: 'svc-royal-birthday', rating: 5, comment: 'My daughter loved the unicorn theme decoration! Every detail was perfect. The photo booth was an amazing addition. Will definitely book again!' },
        ];
        const revStmt = database.prepare(
          `INSERT OR IGNORE INTO reviews (id, booking_id, customer_user_id, service_id, rating, comment)
           VALUES (?, ?, ?, ?, ?, ?)`
        );
        for (const r of sampleReviews) {
          revStmt.run(r.id, r.booking, r.cust, r.svc, r.rating, r.comment);
        }
        revStmt.finalize();

        console.log('Database tables and seed data created successfully');
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Gracefully close database connection
function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (isClosed) {
      resolve();
      return;
    }
    if (isClosing) {
      const checkClosed = setInterval(() => {
        if (isClosed) {
          clearInterval(checkClosed);
          resolve();
        }
      }, 10);
      return;
    }
    if (!db) {
      resolve();
      return;
    }

    isClosing = true;
    db.close((err) => {
      isClosed = true;
      isClosing = false;
      db = null;
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
      resolve();
    });
  });
}

module.exports = {
  getDatabase,
  initializeDatabase,
  closeDatabase
};
