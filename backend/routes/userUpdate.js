document.addEventListener('DOMContentLoaded', async () => {
    const email = localStorage.getItem('userEmail');
    const status = document.getElementById('status-message');
  
    if (!email) {
      status.textContent = 'Kullanıcı oturumu bulunamadı.';
      return;
    }
  
    try {
      const res = await fetch(`/api/userinfo/byemail/${encodeURIComponent(email)}`);
      const data = await res.json();
  
      if (data.success && data.user) {
        const user = data.user;
        document.getElementById('name').value = user.name || '';
        document.getElementById('surname').value = user.surname || '';
        document.getElementById('phone').value = user.phone || '';
        document.getElementById('birthdate').value = user.birthdate ? user.birthdate.split('T')[0] : '';
      } else {
        status.textContent = 'Kullanıcı bilgileri getirilemedi.';
      }
    } catch (err) {
      console.error(err);
      status.textContent = 'Sunucu hatası.';
    }
  
    document.getElementById('updateForm').addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const updated = {
        name: document.getElementById('name').value,
        surname: document.getElementById('surname').value,
        phone: document.getElementById('phone').value,
        birthdate: document.getElementById('birthdate').value
      };
  
      try {
        const res = await fetch(`/api/userinfo/byemail/${encodeURIComponent(email)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated)
        });
  
        const result = await res.json();
  
        if (result.success) {
          status.textContent = 'Bilgiler güncellendi.';
        } else {
          status.textContent = 'Güncelleme başarısız.';
        }
      } catch (err) {
        console.error(err);
        status.textContent = 'Sunucu hatası.';
      }
    });
  });
  