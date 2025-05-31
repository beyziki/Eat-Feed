require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const db = require('./config/db');  // If db.js is in the backend/config folder
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');

const app = express();

// --- Middleware'ler ---
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- MySQL bağlantı pool ---
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'qwiq10_',
  database: process.env.DB_NAME || 'eatFeed',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// --- Bağlantı testi ---
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL veritabanına bağlandı');
    connection.release();
  } catch (err) {
    console.error('❌ MySQL bağlantı hatası:', err);
    process.exit(1);
  }
}
testConnection();


// Kullanıcı bilgilerini almak için API
app.get('/api/user', async (req, res) => {
  try {
    // Burada kullanıcıyı doğrulamak için JWT token veya session kullanılabilir
    const userId = req.session.userId; // veya JWT'den kullanıcıyı alabilirsiniz
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı doğrulaması başarısız',
      });
    }

    const [user] = await pool.execute('SELECT id, name, surname, email, balance FROM users WHERE id = ?', [userId]);

    if (user.length > 0) {
      return res.json({
        success: true,
        user: user[0], // Kullanıcıyı döndürüyoruz
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }
  } catch (error) {
    console.error('API hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
    });
  }
});
app.get('/api/reviews', async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT 
        rating, 
        comment, 
        created_at, 
        username, 
        product_name, 
        order_id
      FROM ratings
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.json(results);
  } catch (err) {
    console.error('Veritabanı hatası:', err);
    res.status(500).json({ error: 'Veritabanı hatası' });
  }
});
app.post('/submitRating', (req, res) => {
  const {
    user_id,
    username,
    product_name,
    rating,
    comment,
    order_id
  } = req.body;

  console.log("Gelen veri:", {
    user_id,
    username,
    product_name,
    rating,
    comment,
    order_id
  });

  // Eksik alan kontrolü
  if (!user_id || !username || !product_name || !rating || !comment || !order_id) {
    console.error("Eksik bilgi var.");
    return res.status(400).json({ success: false, message: "Eksik bilgi var." });
  }

  const sql = `
    INSERT INTO ratings (user_id, username, product_name, rating, comment, order_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [user_id, username, product_name, rating, comment, order_id], (err, result) => {
    if (err) {
      console.error("MySQL hata:", err);
      return res.status(500).json({ success: false, message: "Veritabanı hatası." });
    }

    console.log("Değerlendirme başarıyla kaydedildi.");
    // Yanıtı dönerken net bir mesaj verelim
    return res.status(200).json({ success: true, message: "Değerlendirme başarıyla kaydedildi." });
  });
});

app.post('/markAsDelivered', (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ success: false, message: "Eksik bilgi: orderId" });
  }

  const sql = `UPDATE orders SET status = 'completed' WHERE id = ?`;

  db.query(sql, [orderId], (err, result) => {
    if (err) {
      console.error("MySQL hata:", err);
      return res.status(500).json({ success: false, message: "Veritabanı hatası." });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Sipariş bulunamadı." });
    }

    console.log(`Sipariş ${orderId} teslim edildi olarak işaretlendi.`);
    res.json({ success: true, message: "Sipariş teslim edildi olarak işaretlendi." });
  });
});
// Bakiye bilgisini almak için API
app.get('/api/user/balance', async (req, res) => {
  try {
    const userId = req.query.userId;  // Parametre olarak gelen kullanıcı ID'si
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID\'si gereklidir',
      });
    }

    const [user] = await pool.execute('SELECT balance FROM users WHERE id = ?', [userId]);

    if (user.length > 0) {
      return res.json({
        success: true,
        balance: user[0].balance, // Kullanıcının bakiyesini döndür
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }
  } catch (error) {
    console.error('API hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası',
    });
  }
});
// Örnek Express.js endpoint
app.post('/api/wallet-payment', async (req, res) => {
  const { userId, amount } = req.body;

  if (!userId || !amount) {
    return res.status(400).json({ success: false, message: "Eksik bilgi" });
  }

  try {
    // Mevcut bakiye kontrolü
    const [rows] = await db.query('SELECT balance FROM user_cards WHERE user_id = ?', [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Cüzdan bulunamadı" });
    }

    const currentBalance = rows[0].balance;

    // Yetersiz bakiye kontrolü
    if (currentBalance < amount) {
      return res.status(400).json({ success: false, message: "Yetersiz bakiye" });
    }

    // Bakiyeden düş
    const newBalance = currentBalance - amount;
    await db.query('UPDATE user_cards SET balance = ? WHERE user_id = ?', [newBalance, userId]);

    res.json({ success: true, message: "Ödeme başarılı", newBalance });
  } catch (err) {
    console.error("Cüzdan ödeme hatası:", err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

app.post('/api/payment', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { userId, amount, orderDetails } = req.body;

    await connection.beginTransaction();

    // 1. Kullanıcının mevcut bakiyesini al
    const [rows] = await connection.query('SELECT balance FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    const currentBalance = parseFloat(rows[0].balance);
    if (currentBalance < amount) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Yetersiz bakiye' });
    }

    // 2. Sipariş işlemlerini yap (örneğin, orderDetails ile siparişi ekle)
    // ... sipariş ekleme kodları burada olacak

    // 3. Bakiye düşür
    const newBalance = currentBalance - amount;
    await connection.query('UPDATE users SET balance = ? WHERE id = ?', [newBalance, userId]);

    await connection.commit();

    res.json({ success: true, newBalance });
  } catch (error) {
    await connection.rollback();
    console.error('Ödeme hatası:', error);
    res.status(500).json({ success: false, message: 'Ödeme sırasında hata oluştu' });
  } finally {
    connection.release();
  }
});

app.post('/api/get-balance', async (req, res) => {
  const { userId } = req.body;
  try {
    // user_cards tablosundan bu kullanıcıya ait kart bakiyesini al
    const [rows] = await pool.query('SELECT balance FROM user_cards WHERE user_id = ? ORDER BY id DESC LIMIT 1', [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Kullanıcıya ait kart bulunamadı' });
    }

    res.json({ balance: rows[0].balance });
  } catch (error) {
    console.error('Veritabanı hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});


// Express route (Node.js backend)
app.post('/api/get-wallet-info', async (req, res) => {
  const { userId } = req.body;
  try {
    const [rows] = await db.execute(
      'SELECT card_number, card_name, expiry_date, balance FROM user_cards WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Wallet bilgisi bulunamadı' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Kart bilgilerini kaydetmek için API
app.post('/api/save-card', async (req, res) => {
  try {
    const { userId, cardNumber, cardName, expiryDate, cvv, amount } = req.body;

    console.log("save-card API çağrıldı, userId:", userId);

    if (!userId || !cardNumber || !cardName || !expiryDate || !cvv || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Tüm kart bilgileri gereklidir.',
      });
    }
    const numericUserId = parseInt(userId, 10);
    const numericAmount = parseFloat(amount);

    if (isNaN(numericUserId) || isNaN(numericAmount)) {
      return res.status(400).json({ error: "Geçersiz kullanıcı ID veya tutar." });
    }

    // Burada kart bilgilerini kaydedeceğiz
    // Örneğin, veritabanına kartı kaydedebiliriz
    await pool.execute(
      'INSERT INTO user_cards (user_id, card_number, card_name, expiry_date, cvv, balance) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, cardNumber, cardName, expiryDate, cvv, amount]
    );

    // Aynı zamanda kullanıcının balance'ını da güncelle (isteğe bağlı)
    await pool.execute(
      'UPDATE users SET balance = balance + ? WHERE id = ?',
      [amount, userId]
    );

    return res.json({
      success: true,
      message: 'Kart kaydedildi ve bakiye güncellendi!',
    });
  } catch (error) {
    console.error('API hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kart kaydedilirken hata oluştu',
    });
  }
});
app.post('/api/wallet/topup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // token doğrulaması sayesinde kim olduğu belli
    const {cardNumber, cardName, expiry_date, cvv, amount } = req.body;

   if (!amount || !cardNumber || !cardName) {
  return res.status(400).json({ success: false, message: "Tüm alanlar gereklidir." });
}


    // Veritabanına kayıt
    await pool.execute(
  `INSERT INTO wallet_transactions (user_id, amount, card_number, card_holder_name)
   VALUES (?, ?, ?, ?)`,
  [userId, amount, cardNumber, cardName]
);


    res.json({ success: true, message: "Para başarıyla yüklendi." });

  } catch (err) {
    console.error("Wallet top-up hatası:", err);
    res.status(500).json({ success: false, message: "Sunucu hatası." });
  }
});
app.post('/submitReview', async (req, res) => {
  try {
    const { orderId, userId, rating, comment } = req.body;

    if (!orderId || !userId || !rating) {
      return res.status(400).json({ message: "Eksik veri gönderildi." });
    }

    // Veritabanında review tablosuna ekleme yapıyoruz
    // review tablosu şu kolonlara sahip olmalı: id (auto), order_id, user_id, rating, comment, created_at

    const sql = `
      INSERT INTO reviews (order_id, user_id, rating, comment, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `;

    await pool.query(sql, [orderId, userId, rating, comment]);

    res.json({ message: "Değerlendirme başarıyla kaydedildi." });
  } catch (error) {
    console.error("Değerlendirme kaydetme hatası:", error);
    res.status(500).json({ message: "Değerlendirme kaydedilemedi." });
  }
});


app.get('/getAllOrders', async (req, res) => {
  try {
    // 1. Siparişleri kullanıcı bilgileriyle birlikte al
    const [orders] = await db.promise().query(`
  SELECT o.id, o.city, o.district, o.order_date, o.status, o.user_id,
         u.name AS user_name, u.email
  FROM orders o
  JOIN users u ON o.user_id = u.id
  ORDER BY o.order_date DESC
`);


    // 2. Her siparişin ürünlerini al
    const ordersWithItems = await Promise.all(
      orders.rows.map(async order => {
        const items = await db.query(`
          SELECT product_name, quantity, price
          FROM order_items
          WHERE order_id = $1
        `, [order.id]);

        return {
          ...order,
          items: items.rows
        };
      })
    );

    res.json(ordersWithItems);
  } catch (err) {
    console.error("Tüm siparişler alınırken hata:", err);
    res.status(500).json({ error: "Siparişler alınamadı." });
  }
});






// Sepete ürün ekleme
app.post('/sepet/ekle', async (req, res) => {
  const { yemek_isim, yemek_fiyat, menu_id } = req.body;

  if (!yemek_isim || !yemek_fiyat || !menu_id) {
    return res.status(400).json({ success: false, message: 'Lütfen tüm gerekli alanları doldurun.' });
  }

  try {
    const [rows] = await pool.execute("SELECT * FROM cart WHERE menu_id = ?", [menu_id]);

    if (rows.length > 0) {
      await pool.execute("UPDATE cart SET quantity = quantity + 1 WHERE menu_id = ?", [menu_id]);
      return res.json({ success: true, message: 'Ürün miktarı artırıldı.' });
    } else {
      await pool.execute("INSERT INTO cart (item_name, item_price, menu_id) VALUES (?, ?, ?)", [yemek_isim, yemek_fiyat, menu_id]);
      return res.json({ success: true, message: 'Ürün sepete eklendi.' });
    }
  } catch (err) {
    console.error('Sepete ürün eklenirken hata oluştu:', err.message);
    return res.status(500).json({ success: false, message: 'Veritabanı hatası: ' + err.message });
  }
});


// Sipariş oluşturma (cart üzerinden)
app.post('/siparis', async (req, res) => {
  const { urunler, adres, odeme, tarih, userId } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [orderResult] = await connection.execute(
      `INSERT INTO orders (user_id, address_type, city, district, address_details, phone, card_holder, card_number, expiry_date, cvv, order_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        adres.adresTipi,
        adres.il,
        adres.ilce,
        adres.detay,
        adres.telefon,
        odeme.kartSahibi,
        odeme.kartNumarasi,
        odeme.sonKullanma,
        odeme.cvv,
        new Date(tarih)
      ]
    );

    const orderId = orderResult.insertId;

    const itemsValues = urunler.map(urun => [
      orderId,
      urun.ad,
      urun.quantity,
      urun.fiyat
    ]);

    await connection.query(
      `INSERT INTO order_items (order_id, product_name, quantity, price) VALUES ?`,
      [itemsValues]
    );

    await connection.commit();
    res.status(200).json({ message: 'Sipariş başarıyla kaydedildi.' });
  } catch (err) {
    await connection.rollback();
    console.error('Sipariş kaydedilirken hata oluştu:', err);
    res.status(500).json({ error: 'Sipariş kaydedilemedi.' });
  } finally {
    connection.release();
  }
});

// Direkt sipariş ürünleri ekleme (örn. QR üzerinden)
app.post('/addOrder', async (req, res) => {
  const { sepet, city, district } = req.body;

  if (!sepet || !Array.isArray(sepet) || sepet.length === 0 || !city || !district) {
    return res.status(400).json({ message: 'Lütfen tüm gerekli alanları doldurun.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Anonim bir sipariş için orders tablosuna ekleme (user_id null olabilir)
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (address_type, city, district, order_date)
       VALUES (?, ?, ?, ?)`,
      ['QR', city, district, new Date()]
    );

    const orderId = orderResult.insertId;

    const insertPromises = sepet.map(item => {
      const { isim, fiyat, resim } = item;
      return connection.execute(
        "INSERT INTO order_products (product_name, product_price, city, town, product_picture, order_id) VALUES (?, ?, ?, ?, ?, ?)",
        [isim, fiyat, city, district, resim || "", orderId]
      );
    });

    await Promise.all(insertPromises);
    await connection.commit();

    res.status(200).json({ message: "Sipariş başarıyla eklendi." });
  } catch (err) {
    await connection.rollback();
    console.error("Sipariş eklenirken hata:", err);
    res.status(500).json({ message: "Sipariş eklenirken sunucu hatası" });
  } finally {
    connection.release();
  }
});


// Sipariş ürünlerini listeleme
app.get('/getOrders', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, product_name, product_price, city, town, product_picture FROM order_products ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("Siparişler alınırken hata:", err);
    res.status(500).json({ message: "Siparişler alınamadı" });
  }
});
// Routes
app.post('/add-menu', async (req, res) => {
  const { dish_name, dish_category, dish_price, ingredients } = req.body;

  if (!dish_name || !dish_category || !dish_price) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please fill all required fields'
    });
  }

  try {
    // First insert the menu item
    const [result] = await pool.execute(
      "INSERT INTO menu (name, category, price) VALUES (?, ?, ?)",
      [dish_name, dish_category, dish_price]
    );

    const menu_id = result.insertId;
    const ingredientsArray = Array.isArray(ingredients) ? ingredients : ingredients.split(',').map(i => i.trim());

    // Then insert each ingredient
    for (const ingredient of ingredientsArray) {
      if (ingredient) {
        await pool.execute(
          "INSERT INTO ingredients (ingredient_name, menu_id, category) VALUES (?, ?, ?)",
          [ingredient, menu_id, dish_category]
        );
      }
    }

    return res.json({ 
      success: true, 
      message: 'Meal and ingredients added successfully!' 
    });
  } catch (err) {
    console.error('Error adding meal to database:', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Database error: ' + err.message 
    });
  }
});

app.get('/menu', async (req, res) => {
  try {
    const [results] = await pool.execute(`
      SELECT menu.id, menu.name AS yemek_name, menu.category AS yemek_kategori, menu.price AS yemek_fiyat, 
             GROUP_CONCAT(ingredients.ingredient_name) AS malzemeler
      FROM menu
      LEFT JOIN ingredients ON menu.id = ingredients.menu_id
      GROUP BY menu.id
    `);

    const formatted = results.map(item => ({
      ...item,
      yemek_resim: `${item.yemek_name.toLowerCase().replace(/\s+/g, '_')}.jpg`
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching menu data:', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Database error: ' + err.message 
    });
  }
});


app.delete('/menu/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // First delete related ingredients
    await pool.execute("DELETE FROM ingredients WHERE menu_id = ?", [id]);
    
    // Then delete the menu item
    await pool.execute("DELETE FROM menu WHERE id = ?", [id]);
    
    return res.json({ 
      success: true, 
      message: 'Menu item deleted successfully!' 
    });
  } catch (err) {
    console.error('Error deleting menu item:', err.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Database error: ' + err.message 
    });
  }
});
app.get('/getRealOrders', async (req, res) => {
  console.log("Gelen userId:", req.query.userId);

  try {
    let userId = req.query.userId;

    let ordersQuery = `
      SELECT o.*, u.name AS user_name, u.email 
      FROM orders o 
      JOIN users u ON o.user_id = u.id
    `;
    const queryParams = [];

    if (userId && userId !== "null") {
      userId = parseInt(userId, 10);
      ordersQuery += " WHERE o.user_id = ?";
      queryParams.push(userId);
    }

    ordersQuery += " ORDER BY o.id DESC";

    const [orders] = await pool.query(ordersQuery, queryParams);

    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const [items1] = await pool.query(
        "SELECT product_name, quantity, price FROM order_items WHERE order_id = ?",
        [order.id]
      );
      const [items2] = await pool.query(
        "SELECT product_name, 1 as quantity, product_price as price FROM order_products WHERE order_id = ?",
        [order.id]
      );

      const allItems = [...items1, ...items2];

      return {
        id: order.id,
        user_name: order.user_name,
        email: order.email,
        city: order.city,
        district: order.district,
        date: order.order_date,
        status: order.status || "pending",
        items: allItems
      };
    }));

    res.json(ordersWithItems);
  } catch (err) {
    console.error("Siparişleri alırken hata:", err);
    res.status(500).json({ message: "Siparişler alınamadı" });
  }
});


app.post('/createOrder', async (req, res) => {
  const connection = await pool.getConnection(); // transaction için connection al
  try {
    const {
      userId,
      addressType,
      city,
      district,
      addressDetails,
      phone,
      cardHolder,
      cardNumber,
      expiryDate,
      cvv,
      sepet // frontend'den gelen ürünler listesi
    } = req.body;

    await connection.beginTransaction(); // 🌀 işlem bütünlüğü için

    // 1. Siparişi `orders` tablosuna ekle
    const [result] = await connection.query(
      `INSERT INTO orders 
      (user_id, address_type, city, district, address_details, phone, card_holder, card_number, expiry_date, cvv, order_date) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, addressType, city, district, addressDetails, phone, cardHolder, cardNumber, expiryDate, cvv]
    );

    const orderId = result.insertId;

    // 2. Ürünleri `order_items` veya `order_products` tablosuna ekle
    for (const item of sepet) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_name, quantity, price) 
         VALUES (?, ?, ?, ?)`,
        [orderId, item.isim, item.adet || 1, item.fiyat]
      );
    }

    await connection.commit(); // ✅ her şey sorunsuzsa kaydet
    res.json({ success: true, orderId });
  } catch (err) {
    await connection.rollback(); // ❌ hata varsa geri al
    console.error("Sipariş oluşturulurken hata:", err);
    res.status(500).json({ message: "Sipariş oluşturulamadı" });
  } finally {
    connection.release(); // bağlantıyı serbest bırak
  }
});

// --- Kayıt endpoint ---
app.post('/api/signup', async (req, res) => {
  try {
    const { name, surname, email, phone, password, userType } = req.body;

    if (!name || !surname || !email || !phone || !password || !userType) {
      return res.status(400).json({ success: false, message: "Tüm alanlar zorunludur." });
    }

    const [existingUser] = await pool.execute(
      'SELECT * FROM users WHERE email = ?', 
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({ success: false, message: "Bu email zaten kayıtlı." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      'INSERT INTO users (name, surname, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      [name, surname, email, phone, hashedPassword, userType]
    );

    res.json({ 
      success: true, 
      message: 'Kullanıcı başarıyla kaydedildi.',
      userId: result.insertId 
    });

  } catch (err) {
    console.error('Kayıt hatası:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatası.' });
  }
});

// --- Giriş endpoint ---
app.post('/api/userlogin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validasyon
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email ve şifre gereklidir.",
        errorCode: "VALIDATION_ERROR"
      });
    }

    // 2. Kullanıcıyı bul
    const [users] = await pool.execute(
      'SELECT id, name,surname, email, password, role, balance FROM users WHERE email = ?', 
      [email.toLowerCase().trim()] // Email küçük harf ve trim'lenmiş
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Kullanıcı bulunamadı.",
        errorCode: "USER_NOT_FOUND"
      });
    }

    const user = users[0];

    // 3. Şifre kontrolü
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: "Geçersiz kimlik bilgileri.", // Hatalı şifre yerine genel mesaj
        errorCode: "INVALID_CREDENTIALS"
      });
    }

    // 4. JWT Token oluştur
    const token = jwt.sign(
      { 
        id: user.id,
        email: user.email,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 saat
      }, 
      process.env.JWT_SECRET || 'mySuperSecureKey!2025', // .env'den al
      { algorithm: 'HS256' }
    );

    // 6. Hassas bilgileri temizle
    delete user.password;

    res.json({
      success: true,
      message: "Giriş başarılı",
      token: token, // JWT token'ı
      user: { // Kullanıcı bilgileri
        id: user.id,
        name: user.name,
        username: user.name, // buraya dikkat
        email: user.email,
        role: user.role,
        balance: user.balance
      },
      expiresIn: 3600 // Token geçerliliği (1 saat)
    });
    

  } catch (err) {
    console.error('Giriş hatası:', err);
    
    // Hata türüne göre özel mesajlar
    const errorMessage = err.code === 'ECONNREFUSED' 
      ? "Veritabanı bağlantı hatası" 
      : "Sunucu hatası";
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      errorCode: "SERVER_ERROR",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});
// Kullanıcı bilgilerini alma
app.get('/api/userinfo/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const [result] = await pool.execute(
      'SELECT id, name, surname, email, phone, birthdate FROM users WHERE id = ?', 
      [userId]
    );

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı." });
    }

    res.json({ success: true, user: result[0] });
  } catch (err) {
    console.error("Kullanıcı bilgi alma hatası:", err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

// Kullanıcı bilgilerini güncelleme
app.put('/api/userinfo/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, surname, phone, email, } = req.body;

    if (!name || !surname || !phone || !email) {
      return res.status(400).json({ success: false, message: "Tüm alanlar doldurulmalıdır!" });
    }

    const [result] = await pool.execute(
      `UPDATE users 
       SET name = ?, surname = ?, phone = ?, email =? 
       WHERE id = ?`,
      [name, surname, phone, email,  userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı veya değişiklik yapılmadı." });
    }

    res.json({ success: true, message: "Bilgiler başarıyla güncellendi." });
  } catch (err) {
    console.error("Kullanıcı güncelleme hatası:", err);
    res.status(500).json({ success: false, message: "Sunucu hatası, lütfen tekrar deneyin." });
  }
});

app.post('/api/user/change-password/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Lütfen tüm alanları doldurun." });
    }

    // Kullanıcının mevcut hashlenmiş şifresini veritabanından al
    const [rows] = await pool.execute('SELECT password FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı." });
    }

    const currentHashedPassword = rows[0].password;

    // Eski şifre doğru mu kontrol et
    const isMatch = await bcrypt.compare(oldPassword, currentHashedPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Eski şifre yanlış." });
    }

    // Yeni şifreyi hashle
    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    // Veritabanında şifreyi güncelle
    const [updateResult] = await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [newHashedPassword, userId]
    );

    if (updateResult.affectedRows === 0) {
      return res.status(500).json({ success: false, message: "Şifre güncellenemedi." });
    }

    res.json({ success: true, message: "Şifre başarıyla değiştirildi." });
  } catch (err) {
    console.error('Şifre değiştirme hatası:', err);
    res.status(500).json({ success: false, message: "Sunucu hatası, lütfen tekrar deneyin." });
  }
});

// Tüm kullanıcı ID'lerini listeleyen endpoint
app.get('/api/userIds', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id FROM users');
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Kullanıcılar bulunamadı." });
    }

    res.json({ success: true, userIds: rows.map(row => row.id) });
  } catch (err) {
    console.error("Kullanıcı ID'leri çekme hatası:", err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});

const jwt = require('jsonwebtoken');

// Token doğrulama middleware
function authenticateToken(req, res, next) {
    // Authorization header'dan token'ı al
    const token = req.header('Authorization') && req.header('Authorization').split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Token bulunamadı' });

    jwt.verify(token, 'your_secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Geçersiz token' });
        }
        req.user = user; // Kullanıcı bilgilerini req.user içine kaydediyoruz
        next(); // Bir sonraki middleware'e geç
    });
}

// Örneğin bu şekilde kullanabilirsiniz
app.get('/api/userinfo/byemail/:email', authenticateToken, async (req, res) => {
    const email = req.params.email;
    // Burada kullanıcı bilgilerini veri tabanından çekebilirsiniz
    // Örnek olarak:
    const user = await db.execute('SELECT name, surname, phone, birthdate FROM users WHERE email = ?', [email]);

    if (!user) {
        return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    res.json({ success: true, user: user });
});




// --- STAFF KAYIT ---
app.post('/api/staff/signup', async (req, res) => {
  let conn;
  try {
    const { username, password, full_name, role } = req.body;
    if (!username || !password || !full_name) {
      return res.status(400).json({ success: false, message: "Zorunlu alanlar eksik." });
    }


    conn = await pool.getConnection();
    const [existing] = await conn.execute('SELECT * FROM staff WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: "Bu kullanıcı adı zaten kayıtlı." });
    }


    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await conn.execute(
      'INSERT INTO staff (username, password, full_name, role) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, full_name, role || 'staff']
    );


    const [newStaff] = await conn.execute('SELECT * FROM staff WHERE id = ?', [result.insertId]);


    res.json({ success: true, staffId: result.insertId, staff: newStaff[0] });


  } catch (err) {
    console.error('Staff kayıt hatası:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatası.' });
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/staff/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [results] = await pool.execute('SELECT * FROM staff WHERE username = ?', [username]);

    if (results.length === 0) {
      return res.json({ success: false, message: 'Kullanıcı adı veya şifre hatalı.' });
    }

    const user = results[0];
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.json({ success: false, message: 'Kullanıcı adı veya şifre hatalı.' });
    }

    res.json({ success: true, staff: user });

  } catch (err) {
    console.error('Login hatası:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatası.' });
  }
});



// --- TÜM STAFF LİSTELE ---
app.get('/api/all-staff', async (req, res) => {
  try {
    const [staff] = await pool.execute('SELECT * FROM staff ORDER BY id DESC');
    res.json({ success: true, count: staff.length, staff });
  } catch (err) {
    console.error('Staff listeleme hatası:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatası.' });
  }
});


// --- STAFF SAYISINI GETİR ---
app.get('/api/staff-count', async (req, res) => {
  try {
    const [result] = await pool.execute('SELECT COUNT(*) as count FROM staff');
    res.json({ success: true, count: result[0].count });
  } catch (err) {
    console.error('Staff sayısı hatası:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatası.' });
  }
});


// --- TEST STAFF EKLE ---
app.post('/api/add-test-staff', async (req, res) => {
  try {
    const testStaff = [
      { username: 'admin', password: 'admin123', full_name: 'Sistem Yöneticisi', role: 'admin' },
      { username: 'manager', password: 'manager123', full_name: 'Restoran Müdürü', role: 'manager' },
      { username: 'waiter1', password: 'waiter123', full_name: 'Garson Ahmet', role: 'staff' }
    ];


    const added = [];


    for (const s of testStaff) {
      const [exist] = await pool.execute('SELECT id FROM staff WHERE username = ?', [s.username]);
      if (exist.length === 0) {
        const hashed = await bcrypt.hash(s.password, 10);
        await pool.execute(
          'INSERT INTO staff (username, password, full_name, role) VALUES (?, ?, ?, ?)',
          [s.username, hashed, s.full_name, s.role]
        );
        added.push(s.username);
      }
    }


    res.json({ success: true, message: added.length ? "Veriler eklendi" : "Zaten mevcut", added });
  } catch (err) {
    console.error('Test staff ekleme hatası:', err);
    res.status(500).json({ success: false, message: 'Hata oluştu', error: err.message });
  }
});
// --- STAFF BİLGİLERİNİ GETİR ---
app.get('/api/staff/:id', async (req, res) => {
  try {
    const staffId = req.params.id;
    const [result] = await pool.execute(
      'SELECT id, username, full_name, role, created_at FROM staff WHERE id = ?', 
      [staffId]
    );

    if (result.length === 0) {
      return res.status(404).json({ success: false, message: "Personel bulunamadı." });
    }

    res.json({ success: true, staff: result[0] });
  } catch (err) {
    console.error("Personel bilgi alma hatası:", err);
    res.status(500).json({ success: false, message: "Sunucu hatası" });
  }
});
// --- GET ALL STAFF ---
app.get('/api/all-staff', async (req, res) => {
  try {
    const [staff] = await pool.execute(
      'SELECT id, username, full_name, role, created_at FROM staff ORDER BY id DESC'
    );
    res.json({ 
      success: true, 
      count: staff.length, 
      staff 
    });
  } catch (err) {
    console.error('Staff listeleme hatası:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası.' 
    });
  }
});

// --- GET STAFF BY ID ---
app.get('/api/staff/:id', async (req, res) => {
  try {
    const staffId = req.params.id;
    const [result] = await pool.execute(
      'SELECT id, username, full_name, role, created_at FROM staff WHERE id = ?',
      [staffId]
    );

    if (result.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Personel bulunamadı." 
      });
    }

    res.json({ 
      success: true, 
      staff: result[0] 
    });
  } catch (err) {
    console.error('Staff bilgi alma hatası:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Sunucu hatası.' 
    });
  }
});
app.get('/tables', async (req, res) => {
  try {
    const [results] = await pool.execute('SELECT * FROM tables');
    res.json(results);
  } catch (err) {
    console.error('Masa listeleme hatası:', err);
    res.status(500).send(err);
  }
});


app.post('/reserve', async (req, res) => {
  const { id, reserved_by, reservation_time, guest_count } = req.body;

  const selectedDate = new Date(reservation_time);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(selectedDate) || selectedDate < today) {
    return res.status(400).json({ success: false, message: "Geçmiş veya geçersiz bir tarih girdiniz." });
  }

  try {
    const [availableTables] = await pool.execute(
      'SELECT * FROM tables WHERE id = ? AND is_reserved = 0', [id]
    );

    if (availableTables.length === 0) {
      return res.json({ success: false, message: "Bu masa zaten rezerve edilmiş." });
    }

    await pool.execute('UPDATE tables SET is_reserved = 1 WHERE id = ?', [id]);

    await pool.execute(
      'INSERT INTO reservations (table_id, reserved_by, reservation_time, guest_count) VALUES (?, ?, ?, ?)',
      [id, reserved_by, reservation_time, guest_count]
    );

    res.json({ success: true, message: "Rezervasyon başarılı!" });

  } catch (err) {
    console.error('Rezervasyon hatası:', err);
    res.status(500).send(err);
  }
});


app.get('/all-reservations', async (req, res) => {
  try {
    const [results] = await pool.execute(
      `SELECT r.id, t.name AS table_name, r.reserved_by, r.guest_count, r.reservation_time, r.created_at
       FROM reservations r
       JOIN tables t ON r.table_id = t.id
       ORDER BY r.reservation_time DESC`
    );
    res.json(results);
  } catch (err) {
    console.error('Rezervasyon listeleme hatası:', err);
    res.status(500).send(err);
  }
});


app.post('/cancel', async (req, res) => {
  const { id } = req.body;

  try {
    await pool.execute('DELETE FROM reservations WHERE table_id = ?', [id]);
    await pool.execute(
      'UPDATE tables SET is_reserved = 0, reserved_by = NULL, reservation_time = NULL, guest_count = NULL WHERE id = ?',
      [id]
    );
    res.json({ success: true, message: "Rezervasyon iptal edildi." });
  } catch (err) {
    console.error('Rezervasyon iptal hatası:', err);
    res.status(500).send(err);
  }
});

// Route handlers
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'signup.html'));
});

app.get('/stafflogin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'stafflogin.html'));
});

app.get('/staffsignup', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'staffsignup.html'));
});

app.get('/staff', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'staff.html'));
});
// --- Ana sayfa yönlendirmesi (signup.html) ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'signup.html'));
});

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).send('Sayfa bulunamadı');
});

// --- Sunucuyu başlat ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
