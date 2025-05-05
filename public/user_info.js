document.addEventListener("DOMContentLoaded", async () => {
    let userId = new URLSearchParams(window.location.search).get("userId");

    // Eğer kullanıcı ID'si URL'den gelmemişse, veritabanından kullanıcı ID'lerini çek
    if (!userId) {
        try {
            const response = await fetch('/api/userIds');
            const data = await response.json();
            
            if (!data.success || data.userIds.length === 0) {
                alert("Hiçbir kullanıcı bulunamadı.");
                return;
            }
            
            // Burada, varsayılan olarak ilk kullanıcıyı seçiyoruz
            userId = data.userIds[0];  // İlk kullanıcı ID'sini seçiyoruz, isterseniz burada farklı bir mantık kurabilirsiniz.
        } catch (error) {
            console.error("Kullanıcı ID'leri alınırken hata oluştu:", error);
            alert("Kullanıcı ID'leri alınırken bir hata oluştu.");
            return;
        }
    }

    // Kullanıcı ID'si alındıktan sonra, bilgileri çekmeye devam et
    try {
        const response = await fetch(`/api/userinfo/${userId}`);
        const data = await response.json();

        if (!data.success) {
            alert(data.message || "Kullanıcı bilgileri alınamadı.");
            return;
        }

        const user = data.user;

        // Ekrana kullanıcı bilgilerini yerleştir
        document.getElementById("nameDisplay").textContent = `${user.name} ${user.surname}`;
        document.getElementById("emailDisplay").textContent = user.email;
        document.getElementById("usernameDisplay").textContent = user.email.split('@')[0];
        document.getElementById("phoneDisplay").textContent = user.phone || 'Belirtilmemiş';
        document.getElementById("birthdateDisplay").textContent = user.birthdate || 'Belirtilmemiş';

        // Formdaki input alanlarını doldur
        document.getElementById("nameInput").value = `${user.name} ${user.surname}`;
        document.getElementById("emailInput").value = user.email;
        document.getElementById("usernameInput").value = user.email.split('@')[0];
        document.getElementById("phoneInput").value = user.phone || '';
        document.getElementById("birthdateInput").value = user.birthdate || '';
    } catch (error) {
        console.error("Bilgi alma hatası:", error);
        alert("Sunucu hatası");
    }

    // Kullanıcı bilgilerini güncelleme
    document.getElementById("updateForm").addEventListener("submit", async (event) => {
        event.preventDefault();

        const updatedName = document.getElementById("nameInput").value;
        const updatedPhone = document.getElementById("phoneInput").value;
        const updatedBirthdate = document.getElementById("birthdateInput").value;

        try {
            // Kullanıcı bilgilerini güncellemek için API'ye PUT isteği gönder
            const response = await fetch(`/api/userinfo/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: updatedName,
                    surname: updatedName.split(" ")[1] || '',  // Ad-Soyad'dan soyadı almak
                    phone: updatedPhone,
                    birthdate: updatedBirthdate
                })
            });

            const data = await response.json();

            if (data.success) {
                alert("Bilgiler başarıyla güncellendi.");
                // Güncellenen bilgileri tekrar ekrana yansıt
                document.getElementById("nameDisplay").textContent = updatedName;
                document.getElementById("phoneDisplay").textContent = updatedPhone;
                document.getElementById("birthdateDisplay").textContent = updatedBirthdate;
            } else {
                alert(data.message || "Güncelleme başarısız.");
            }
        } catch (error) {
            console.error("Güncelleme hatası:", error);
            alert("Güncelleme sırasında bir hata oluştu.");
        }
    });
});
