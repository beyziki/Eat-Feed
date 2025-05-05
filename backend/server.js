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
      SELECT menu.id, menu.name, menu.category, menu.price, 
             GROUP_CONCAT(ingredients.ingredient_name) AS ingredients
      FROM menu
      LEFT JOIN ingredients ON menu.id = ingredients.menu_id
      GROUP BY menu.id
    `);
    res.json(results);
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

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email ve şifre gereklidir." });
    }

    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?', 
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: "Kullanıcı bulunamadı." });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: "Hatalı şifre." });
    }

    res.json({
      success: true,
      message: "Giriş başarılı",
      role: user.role
    });

  } catch (err) {
    console.error('Giriş hatası:', err);
    res.status(500).json({ success: false, message: 'Sunucu hatası.' });
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
    const { name, surname, phone, birthdate } = req.body;

    if (!name || !surname || !phone || !birthdate) {
      return res.status(400).json({ success: false, message: "Tüm alanlar doldurulmalıdır!" });
    }

    const [result] = await pool.execute(
      `UPDATE users 
       SET name = ?, surname = ?, phone = ?, birthdate = ? 
       WHERE id = ?`,
      [name, surname, phone, birthdate, userId]
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
