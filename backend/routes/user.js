document.addEventListener('DOMContentLoaded', async () => {
  const userEmail = localStorage.getItem('userEmail');
  const userInfoContainer = document.getElementById('user-info');

  if (!userEmail) {
    userInfoContainer.innerHTML = '<p>Giriş yapmadınız. Lütfen önce giriş yapın.</p>';
    return;
  }

  try {
    const response = await fetch(`/api/userinfo/byemail/${encodeURIComponent(userEmail)}`);
    const data = await response.json();

    if (!data.success) {
      userInfoContainer.innerHTML = `<p>Kullanıcı bilgisi alınamadı: ${data.message}</p>`;
      return;
    }

    const user = data.user;

    userInfoContainer.innerHTML = `
      <h2>Hoş geldin, ${user.name} ${user.surname}</h2>
      <ul>
        <li><strong>Email:</strong> ${user.email}</li>
        <li><strong>Telefon:</strong> ${user.phone}</li>
        <li><strong>Doğum Tarihi:</strong> ${user.birthdate || 'Belirtilmemiş'}</li>
        <li><strong>Rol:</strong> ${user.role}</li>
      </ul>
    `;

  } catch (error) {
    console.error('Kullanıcı bilgisi alınırken hata:', error);
    userInfoContainer.innerHTML = '<p>Sunucu hatası. Lütfen daha sonra tekrar deneyin.</p>';
  }
});
