const crypto = require('crypto');
const { getDatabase } = require('./init');

// Simple password hashing using Node.js built-in crypto
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Seeds the database with sample categories, products, and an admin user
async function seedDatabase() {
  const db = getDatabase();

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check if data already exists to avoid duplicate seeding
      db.get('SELECT COUNT(*) as count FROM categories', [], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        if (row.count > 0) {
          console.log('Database already seeded, skipping...');
          resolve();
          return;
        }

        // Seed categories
        const categories = [
          ['Electronics', 'Smartphones, laptops, tablets and more', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400'],
          ['Clothing', 'Men and women fashion apparel', 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400'],
          ['Home & Kitchen', 'Furniture, decor and kitchen essentials', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400'],
          ['Books', 'Fiction, non-fiction, and educational books', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400'],
          ['Sports & Outdoors', 'Equipment and gear for sports and outdoor activities', 'https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=400'],
          ['Beauty & Health', 'Skincare, makeup and wellness products', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400']
        ];

        const categoryStmt = db.prepare('INSERT INTO categories (name, description, image_url) VALUES (?, ?, ?)');
        categories.forEach(cat => categoryStmt.run(cat));
        categoryStmt.finalize();

        // Seed products across all categories
        const products = [
          // Electronics (category_id = 1)
          ['Wireless Bluetooth Headphones', 'Premium noise-cancelling over-ear headphones with 30-hour battery life and Hi-Res audio.', 79.99, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', 1, 150, 1],
          ['Smartphone Pro Max', '6.7-inch OLED display, 128GB storage, 48MP triple camera system with night mode.', 999.99, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', 1, 75, 1],
          ['Laptop UltraBook 15"', 'Intel i7, 16GB RAM, 512GB SSD, lightweight aluminum body with all-day battery.', 1299.99, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400', 1, 40, 0],
          ['Wireless Charging Pad', 'Fast wireless charger compatible with all Qi-enabled devices, sleek minimalist design.', 29.99, 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400', 1, 200, 0],
          ['Smart Watch Series 5', 'Fitness tracking, heart rate monitor, GPS, and smartphone notifications on your wrist.', 249.99, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', 1, 90, 1],
          ['Portable Bluetooth Speaker', 'Waterproof speaker with 360-degree sound, 12-hour battery, and built-in microphone.', 49.99, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400', 1, 120, 0],

          // Clothing (category_id = 2)
          ['Classic Denim Jacket', 'Timeless medium-wash denim jacket with brass buttons and adjustable cuffs.', 89.99, 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400', 2, 60, 1],
          ['Cotton Crew T-Shirt', '100% organic cotton crew neck t-shirt, available in multiple colors.', 24.99, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 2, 300, 0],
          ['Running Sneakers', 'Lightweight mesh running shoes with responsive cushioning and breathable design.', 119.99, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', 2, 85, 1],
          ['Wool Winter Scarf', 'Soft merino wool scarf in classic plaid pattern, perfect for cold weather.', 34.99, 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=400', 2, 150, 0],

          // Home & Kitchen (category_id = 3)
          ['Stainless Steel Cookware Set', '10-piece professional grade cookware set with tempered glass lids.', 199.99, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400', 3, 30, 1],
          ['Memory Foam Pillow', 'Ergonomic contour pillow with cooling gel layer for comfortable sleep.', 39.99, 'https://images.unsplash.com/photo-1592789705501-f9ae4278a9c9?w=400', 3, 100, 0],
          ['LED Desk Lamp', 'Adjustable LED desk lamp with 5 brightness levels and USB charging port.', 44.99, 'https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=400', 3, 80, 0],
          ['Coffee Maker Deluxe', '12-cup programmable drip coffee maker with thermal carafe and built-in grinder.', 149.99, 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=400', 3, 45, 1],

          // Books (category_id = 4)
          ['The Art of Programming', 'Comprehensive guide to software engineering best practices and design patterns.', 49.99, 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400', 4, 200, 1],
          ['Cooking Masterclass', 'Over 500 recipes from world-renowned chefs with step-by-step instructions.', 34.99, 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=400', 4, 150, 0],
          ['Mindful Living Guide', 'Practical tips for incorporating mindfulness into your daily routine.', 19.99, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400', 4, 250, 0],

          // Sports & Outdoors (category_id = 5)
          ['Yoga Mat Premium', 'Extra thick non-slip yoga mat with carrying strap, eco-friendly material.', 39.99, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400', 5, 100, 1],
          ['Camping Tent 4-Person', 'Waterproof dome tent with easy setup, includes rainfly and storage pockets.', 129.99, 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400', 5, 35, 0],
          ['Adjustable Dumbbells Set', 'Space-saving adjustable dumbbells, 5-52.5 lbs per hand with quick-change mechanism.', 299.99, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400', 5, 25, 1],

          // Beauty & Health (category_id = 6)
          ['Vitamin C Serum', 'Brightening face serum with hyaluronic acid and vitamin E for radiant skin.', 29.99, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400', 6, 180, 1],
          ['Essential Oil Diffuser', 'Ultrasonic aroma diffuser with color-changing LED lights and auto shut-off.', 34.99, 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=400', 6, 70, 0],
          ['Hair Care Gift Set', 'Complete set with shampoo, conditioner, hair mask, and argan oil treatment.', 54.99, 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400', 6, 60, 0]
        ];

        const productStmt = db.prepare(
          'INSERT INTO products (name, description, price, image_url, category_id, stock_quantity, featured) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        products.forEach(prod => productStmt.run(prod));
        productStmt.finalize();

        // Create a default admin user (password: admin123)
        const adminPassword = hashPassword('admin123');
        db.run(
          'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
          ['Admin User', 'admin@shop.com', adminPassword, 'admin']
        );

        // Create a demo customer (password: demo123)
        const demoPassword = hashPassword('demo123');
        db.run(
          'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
          ['Demo Customer', 'demo@shop.com', demoPassword, 'customer']
        );

        console.log('Database seeded with sample ecommerce data');
        resolve();
      });
    });
  });
}

module.exports = { seedDatabase, hashPassword };
