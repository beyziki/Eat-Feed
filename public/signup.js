async function signUp() {
    const name = document.getElementById("name").value.trim();
    const surname = document.getElementById("surname").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const userType = document.getElementById("userType").value;
  
    if (!name || !surname || !email || !phone || !password || !confirmPassword || !userType) {
      alert("Lütfen tüm alanları doldurun.");
      return;
    }
  
    if (password !== confirmPassword) {
      alert("Şifreler eşleşmiyor.");
      return;
    }
  
    try {
      const response = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          surname,
          email,
          phone,
          password,
          userType
        })
      });
  
      const result = await response.json();
  
      if (response.ok) {
        alert(result.message || "Kayıt başarılı!");
        window.location.href = userType === "staff" ? "staff-login.html" : "user-login.html";
      } else {
        alert(result.message || "Kayıt sırasında bir hata oluştu");
      }
    } catch (error) {
      console.error("Kayıt hatası:", error);
      alert("Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  }
  
  function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const eyeIcon = document.getElementById("eyeIcon" + inputId.charAt(0).toUpperCase() + inputId.slice(1));
  
    if (input.type === "password") {
      input.type = "text";
      eyeIcon.classList.remove("fa-eye");
      eyeIcon.classList.add("fa-eye-slash");
    } else {
      input.type = "password";
      eyeIcon.classList.add("fa-eye");
      eyeIcon.classList.remove("fa-eye-slash");
    }
  }
  