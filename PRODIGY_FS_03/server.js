const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db/database');

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: './db' }),
  secret: 'local-store-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.cart = req.session.cart || [];
  next();
});

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

function cartCount(cart) {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

app.get('/', (req, res) => res.redirect('/products'));

app.get('/products', async (req, res) => {
  const { search = '', category = '', sort = '' } = req.query;
  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];
  if (search) { sql += ' AND (name LIKE ? OR description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (sort === 'low') sql += ' ORDER BY price ASC';
  else if (sort === 'high') sql += ' ORDER BY price DESC';
  else sql += ' ORDER BY id DESC';
  const products = await db.all(sql, params);
  const categories = await db.all('SELECT DISTINCT category FROM products ORDER BY category');
  res.render('products', { products, categories, query: req.query, cartCount: cartCount(req.session.cart || []) });
});

app.get('/product/:id', async (req, res) => {
  const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!product) return res.status(404).send('Product not found');
  const reviews = await db.all('SELECT r.*, u.name FROM reviews r JOIN users u ON r.user_id = u.id WHERE product_id = ? ORDER BY r.id DESC', [req.params.id]);
  res.render('product-detail', { product, reviews, cartCount: cartCount(req.session.cart || []) });
});

app.post('/review/:id', requireLogin, async (req, res) => {
  const { rating, comment } = req.body;
  if (rating && comment) {
    await db.run('INSERT INTO reviews(product_id, user_id, rating, comment) VALUES(?, ?, ?, ?)', [req.params.id, req.session.user.id, rating, comment]);
  }
  res.redirect('/product/' + req.params.id);
});

app.post('/cart/add/:id', async (req, res) => {
  const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!product) return res.redirect('/products');
  if (!req.session.cart) req.session.cart = [];
  const found = req.session.cart.find(item => item.id === product.id);
  if (found) found.quantity += 1;
  else req.session.cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, quantity: 1 });
  res.redirect('/cart');
});

app.get('/cart', (req, res) => {
  const cart = req.session.cart || [];
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  res.render('cart', { cart, total, cartCount: cartCount(cart) });
});

app.post('/cart/update/:id', (req, res) => {
  const cart = req.session.cart || [];
  const item = cart.find(i => i.id == req.params.id);
  if (item) item.quantity = Math.max(1, parseInt(req.body.quantity || '1'));
  req.session.cart = cart;
  res.redirect('/cart');
});

app.post('/cart/remove/:id', (req, res) => {
  req.session.cart = (req.session.cart || []).filter(i => i.id != req.params.id);
  res.redirect('/cart');
});

app.get('/checkout', requireLogin, (req, res) => {
  const cart = req.session.cart || [];
  if (cart.length === 0) return res.redirect('/cart');
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  res.render('checkout', { cart, total, cartCount: cartCount(cart) });
});

app.post('/checkout', requireLogin, async (req, res) => {
  const cart = req.session.cart || [];
  if (cart.length === 0) return res.redirect('/cart');
  const { address, phone } = req.body;
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const orderNumber = 'ORD' + Date.now();
  const result = await db.run('INSERT INTO orders(order_number, user_id, total, address, phone, status) VALUES(?, ?, ?, ?, ?, ?)', [orderNumber, req.session.user.id, total, address, phone, 'Order Placed']);
  for (const item of cart) {
    await db.run('INSERT INTO order_items(order_id, product_id, quantity, price) VALUES(?, ?, ?, ?)', [result.id, item.id, item.quantity, item.price]);
  }
  req.session.cart = [];
  res.redirect('/order/' + orderNumber);
});

app.get('/orders', requireLogin, async (req, res) => {
  const orders = await db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC', [req.session.user.id]);
  res.render('orders', { orders, cartCount: cartCount(req.session.cart || []) });
});

app.get('/order/:orderNumber', requireLogin, async (req, res) => {
  const order = await db.get('SELECT * FROM orders WHERE order_number = ? AND user_id = ?', [req.params.orderNumber, req.session.user.id]);
  if (!order) return res.status(404).send('Order not found');
  const items = await db.all('SELECT oi.*, p.name, p.image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE order_id = ?', [order.id]);
  res.render('order-detail', { order, items, cartCount: cartCount(req.session.cart || []) });
});

app.get('/support', (req, res) => res.render('support', { cartCount: cartCount(req.session.cart || []), success: null }));

app.post('/support', async (req, res) => {
  const { name, email, message } = req.body;
  await db.run('INSERT INTO support_messages(name, email, message) VALUES(?, ?, ?)', [name, email, message]);
  res.render('support', { cartCount: cartCount(req.session.cart || []), success: 'Your message has been submitted successfully!' });
});

app.get('/login', (req, res) => res.render('login', { error: null, cartCount: cartCount(req.session.cart || []) }));
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.render('login', { error: 'Invalid email or password', cartCount: cartCount(req.session.cart || []) });
  }
  req.session.user = { id: user.id, name: user.name, email: user.email };
  res.redirect('/products');
});

app.get('/register', (req, res) => res.render('register', { error: null, cartCount: cartCount(req.session.cart || []) }));
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  const exists = await db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (exists) return res.render('register', { error: 'Email already registered', cartCount: cartCount(req.session.cart || []) });
  const hash = bcrypt.hashSync(password, 10);
  await db.run('INSERT INTO users(name, email, password) VALUES(?, ?, ?)', [name, email, hash]);
  res.redirect('/login');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/products'));
});

app.listen(PORT, () => console.log(`LocalStore running at http://localhost:${PORT}`));
