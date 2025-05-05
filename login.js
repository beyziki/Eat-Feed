// Formu seçiyoruz
const form = document.getElementById('loginForm');

form.addEventListener('submit', async function(event) {
  event.preventDefault();  // Sayfanın yeniden yüklenmesini engeller

  const email = document.getElementById('user-email').value;
  const password = document.getElementById('user-password').value;

  try {
    const response = await fetch('/api/userlogin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();
    
    const jwt = require('jsonwebtoken');

    // Kullanıcı giriş işlemi sonrası token oluşturma
    function generateToken(user) {
        const token = jwt.sign({ email: user.email, id: user.id }, 'your_secret_key', { expiresIn: '1h' });
        return token;
    }
    

    if (response.ok && result.success) {
      // Başarılı giriş sonrası token ve kullanıcı bilgilerini kaydediyoruz
localStorage.setItem('userToken', result.token);
localStorage.setItem('currentUser', JSON.stringify(result.user));


      // 👤 Role göre yönlendirme
      if (result.role === 'user') {
        window.location.href = 'indexUser.html';
      } else if (result.role === 'admin') {
        window.location.href = 'stafflogin.html';
      } else {
        alert('Bilinmeyen rol: ' + result.role);
      }
    } else {
      alert(result.message || 'Giriş başarısız');
    }
  } catch (error) {
    console.error('Giriş hatası:', error);
    alert('Sunucu hatası.');
  }
});
