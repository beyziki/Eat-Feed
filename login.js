// login.js

// Formu seçiyoruz
const form = document.getElementById('loginForm');

// Form gönderildiğinde bu fonksiyon çalışacak
form.addEventListener('submit', function(event) {
    event.preventDefault();  // Sayfanın yeniden yüklenmesini engeller

    // Burada girişin başarılı olduğu varsayılacak
    // Kullanıcı adı ve şifreyi almak
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Şu anda herhangi bir doğrulama yapılmayacak
    // Form verileri kontrol edilebilir, ancak bu aşamada giriş başarılı kabul ediliyor

    // Kullanıcı başarıyla giriş yaptıktan sonra ana sayfaya yönlendir
    window.location.href = 'index.html';  // Ana sayfaya yönlendirme
});
