document.addEventListener('DOMContentLoaded', () => {
  const svg = document.getElementById('floorPlan');
  let selectedRect = null;

  const staticItems = [
    { name: 'Kapı', x: 10, y: 490, width: 40, height: 80, color: '#FF7518' },
    { name: 'Kasa', x: 750, y: 500, width: 35, height: 30, color: '#FF7518' },
    { name: 'Cam Kenarı', x: 10, y: 10, width: 500, height: 40, color: '#FF7518' },
    { name: 'Tuvalet', x: 800, y: 10, width: 50, height: 50, color: '#FF7518' },
    { name: 'Mutfak', x: 800, y: 235, width: 50, height: 300, color: '#FF7518' }
  ];

  staticItems.forEach(item => {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", item.x);
    rect.setAttribute("y", item.y);
    rect.setAttribute("width", item.width);
    rect.setAttribute("height", item.height);
    rect.setAttribute("rx", 10);
    rect.setAttribute("fill", item.color);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", item.x + 5);
    text.setAttribute("y", item.y + item.height / 2 + 5); // dikey ortalama
    text.setAttribute("fill", "white");
    text.setAttribute("font-size", "12px");
    text.textContent = item.name;

    svg.appendChild(rect);
    svg.appendChild(text);
  });

  fetch('/tables')
    .then(res => res.json())
    .then(tables => {
      tables.forEach(table => {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", table.x_coord);
        rect.setAttribute("y", table.y_coord);
        rect.setAttribute("width", 80);
        rect.setAttribute("height", 80);
        rect.setAttribute("rx", 10);
        rect.setAttribute("class", table.is_reserved ? "reserved" : "available");

        if (!table.is_reserved) {
          rect.addEventListener("click", () => {
            if (selectedRect) {
              selectedRect.setAttribute("class", "available"); // Önceki masayı yeşil yap
            }
      
            rect.setAttribute("class", "selected");
            selectedRect = rect;
      
            document.getElementById("selectedTableId").value = table.id;
          });
        }

        if (table.is_reserved) {
          rect.addEventListener("click", () => {
            if (confirm("Bu rezervasyonu iptal etmek istiyor musunuz?")) {
              cancelReservation(table.id);
            }
          });
        }

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", table.x_coord + 15);
        text.setAttribute("y", table.y_coord + 45);
        text.setAttribute("fill", "white");
        text.setAttribute("font-size", "14px");
        text.textContent = table.name;

        svg.appendChild(rect);
        svg.appendChild(text);
      });
    });

  function cancelReservation(tableId) {
    fetch('/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tableId })
    })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      if (data.success) {
        // Masa durumu iptal edildikten sonra güncelleme yapılır
        const table = document.querySelector(`rect[class="reserved"]`);
        if (table) {
          table.classList.remove("reserved");
          table.classList.add("available");
        }
        window.location.reload(); // Sayfayı yenileyerek güncel durumu göster
      }
    });
  }

  function reserveTable(tableId) {
    fetch('/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tableId })
    })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      if (data.success) {
        // Masa rezervasyonu yapıldıktan sonra sayfayı güncelle
        const table = document.querySelector(`rect[id="${tableId}"]`);
        if (table) {
          table.classList.remove("available");
          table.classList.add("reserved");
        }
        window.location.reload(); // Sayfayı yenileyerek güncel durumu göster
      }
    });
  }

  document.getElementById("reservationForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const id = document.getElementById("selectedTableId").value;
    const name = document.getElementById("name").value;
    const guest_count = document.getElementById("guest_count").value;
    const datetime = document.getElementById("datetime").value;

    fetch('/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, reserved_by: name, reservation_time: datetime, guest_count: guest_count })
    })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      if (data.success) window.location.reload();
    });
  });

});
