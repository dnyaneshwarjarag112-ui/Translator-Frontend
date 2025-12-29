if (!localStorage.getItem("token")) {
    location.href = "login.html";
}

const historyBox = document.getElementById("historyBox");

async function loadHistory() {
  try {
    const res = await fetch("http://localhost:5000/api/history", {
  headers: {
    "Authorization": "Bearer " + localStorage.getItem("token")
  }
});

    const history = await res.json();

    historyBox.innerHTML = "";

    if (!history.length) {
      historyBox.innerHTML = "<p>No history found</p>";
      return;
    }

    history.forEach(item => {
      const div = document.createElement("div");
      div.style.borderBottom = "1px solid #ccc";
      div.style.padding = "8px 0";

      div.innerHTML = `
        <p>
          <b>${item.fromLang}</b> ➜ <b>${item.toLang}</b>
          <small>(${item.date} ${item.time})</small>
        </p>
        <p>${item.fromText}</p>
        <p style="color:green;">${item.toText}</p>
      `;

      historyBox.appendChild(div);
    });

  } catch (err) {
    historyBox.innerHTML = "<p>Error loading history</p>";
  }
}

loadHistory();
