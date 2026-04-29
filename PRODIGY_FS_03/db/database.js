const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const dbPath = path.join(__dirname, 'store.sqlite');
const database = new sqlite3.Database(dbPath);
function run(sql, params=[]) { return new Promise((resolve,reject)=>{ database.run(sql, params, function(err){ if(err) reject(err); else resolve({id:this.lastID, changes:this.changes}); }); }); }
function get(sql, params=[]) { return new Promise((resolve,reject)=>{ database.get(sql, params, (err,row)=> err?reject(err):resolve(row)); }); }
function all(sql, params=[]) { return new Promise((resolve,reject)=>{ database.all(sql, params, (err,rows)=> err?reject(err):resolve(rows)); }); }
async function init(){
 await run(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL)`);
 await run(`CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL, price REAL NOT NULL, image TEXT NOT NULL)`);
 await run(`CREATE TABLE IF NOT EXISTS reviews(id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, user_id INTEGER, rating INTEGER, comment TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
 await run(`CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT, order_number TEXT UNIQUE, user_id INTEGER, total REAL, address TEXT, phone TEXT, status TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
 await run(`CREATE TABLE IF NOT EXISTS order_items(id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, product_id INTEGER, quantity INTEGER, price REAL)`);
 await run(`CREATE TABLE IF NOT EXISTS support_messages(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, message TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
 const productCount = await get('SELECT COUNT(*) as count FROM products');
 if(productCount.count === 0){
  const products = [
   ['Fresh Apples','Fruits','Fresh and juicy red apples, best for healthy snacks.',120,'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=800&q=80'],
   ['Organic Bananas','Fruits','Naturally ripened bananas full of energy and taste.',60,'https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=800&q=80'],
   ['Whole Wheat Bread','Bakery','Soft whole wheat bread baked fresh every morning.',45,'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80'],
   ['Milk 1 Litre','Dairy','Pure and fresh milk delivered from trusted farms.',58,'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=800&q=80'],
   ['Paneer 500g','Dairy','Soft paneer perfect for curries, snacks and starters.',180,'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80'],
   ['Basmati Rice 5kg','Grocery','Long-grain basmati rice with rich aroma and great taste.',520,'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80'],
   ['Sunflower Oil 1L','Grocery','Light cooking oil suitable for daily cooking.',145,'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80'],
   ['Chocolate Cookies','Bakery','Crunchy chocolate cookies for tea-time happiness.',90,'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=800&q=80'],
   ['Tomatoes 1kg','Vegetables','Farm-fresh tomatoes for salads, curries and sauces.',35,'https://images.unsplash.com/photo-1546470427-e26264be0b0d?auto=format&fit=crop&w=800&q=80'],
   ['Potatoes 1kg','Vegetables','Clean and fresh potatoes for daily cooking.',40,'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80'],
   ['Green Tea Pack','Beverages','Refreshing green tea for a healthy lifestyle.',160,'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=800&q=80'],
   ['Cold Coffee Bottle','Beverages','Ready-to-drink cold coffee with rich creamy taste.',75,'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=800&q=80']
  ];
  for(const p of products) await run('INSERT INTO products(name,category,description,price,image) VALUES(?,?,?,?,?)', p);
 }
 const userCount = await get('SELECT COUNT(*) as count FROM users');
 if(userCount.count === 0){
  await run('INSERT INTO users(name,email,password) VALUES(?,?,?)', ['Demo User','demo@gmail.com', bcrypt.hashSync('1234', 10)]);
 }
}
init();
module.exports = { run, get, all };
