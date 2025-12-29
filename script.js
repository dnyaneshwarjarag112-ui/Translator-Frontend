if (!localStorage.getItem("token")) {
    location.href = "login.html";
}

const logoutBtn = document.querySelector(".logout-btn");
      fromText = document.querySelector(".from-text"),
      toText = document.querySelector(".to-text"),
      exchageIcon = document.querySelector(".exchange"),
      selectTag = document.querySelectorAll("select"),
      icons = document.querySelectorAll(".row i"),
      translateBtn = document.querySelector(".translate-btn"),
      micBtn = document.getElementById("mic"),
      historyBtn = document.querySelector(".history-btn"),
      historyBox = document.querySelector(".history-box");

// ------------------------
// Dropdown Fill
selectTag.forEach((tag, id) => {
    for (let code in countries) {
        let selected = (id === 0 && code === "en") || (id === 1 && code === "hi") ? "selected" : "";
        tag.insertAdjacentHTML("beforeend", `<option ${selected} value="${code}">${countries[code]}</option>`);
    }
});

// ------------------------
// Text Swap
exchageIcon.addEventListener("click", () => {
    [fromText.value, toText.value] = [toText.value, fromText.value];
    [selectTag[0].value, selectTag[1].value] = [selectTag[1].value, selectTag[0].value];
});

// ------------------------
// Chunking Function
function chunkText(text, size = 2000) {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        chunks.push(text.slice(start, start + size));
        start += size;
    }
    return chunks;
}

// ------------------------
// Translation Function
async function translateLargeText(text, fromLang, toLang) {
    const chunks = chunkText(text);
    let result = "";

    for (let chunk of chunks) {
        const url =
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(chunk)}`;

        const res = await fetch(url);
        const data = await res.json();

        result += data[0].map(item => item[0]).join("");
    }
    return result;
}

// ------------------------
// Google TTS
function speakText(text, lang) {
    if (!text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    speechSynthesis.cancel(); // stop previous
    speechSynthesis.speak(utterance);
}

// ------------------------
// 🔥 SAVE TO BACKEND
function saveTranslationToDB(fromTextVal, toTextVal, fromLang, toLang) {
    fetch("http://localhost:5000/api/save", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
             "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({
            fromText: fromTextVal,
            toText: toTextVal,
            fromLang,
            toLang
        })
    })
    .then(res => res.json())
    .then(data => console.log("Saved:", data.message))
    .catch(err => console.error("Save error:", err));
}

// ------------------------
// Translate Button
translateBtn.addEventListener("click", async () => {
    const text = fromText.value.trim();
    const translateFrom = selectTag[0].value;
    const translateTo = selectTag[1].value;

    if (!text) return alert("Please enter text");

    toText.value = "Translating...";

    try {
        const translatedText = await translateLargeText(text, translateFrom, translateTo);
        toText.value = translatedText;

        // ✅ SAVE AFTER TRANSLATION
        saveTranslationToDB(text, translatedText, translateFrom, translateTo);

    } catch (err) {
        toText.value = "Error: Could not translate";
    }
});

// ------------------------
// Copy + Speak Buttons
icons.forEach(icon => {
    icon.addEventListener("click", ({ target }) => {
        const isFrom = target.id === "from";
        const text = isFrom ? fromText.value : toText.value;
        const lang = isFrom ? selectTag[0].value : selectTag[1].value;

        if (target.classList.contains("fa-copy")) {
            navigator.clipboard.writeText(text);
        }
        else if (target.classList.contains("fa-volume-up")) {
            speakText(text, lang);
        }
    });
});

// ------------------------
// Speech-to-Text (Mic)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.interimResults = true;

    micBtn.addEventListener("click", () => {
        recognition.lang = selectTag[0].value;
        recognition.start();

        fromText.value = "Listening...";
        toText.value = "";
    });

    recognition.addEventListener("result", (e) => {
        const transcript = Array.from(e.results)
            .map(result => result[0].transcript)
            .join("");
        fromText.value = transcript;
    });

    recognition.addEventListener("end", async () => {
        const text = fromText.value.trim();
        if (!text) return;

        const translateFrom = selectTag[0].value;
        const translateTo = selectTag[1].value;

        toText.value = "Translating...";

        try {
            const translatedText = await translateLargeText(text, translateFrom, translateTo);
            toText.value = translatedText;

            // ✅ SAVE MIC TRANSLATION ALSO
            saveTranslationToDB(text, translatedText, translateFrom, translateTo);

        } catch (err) {
            toText.value = "Error: Could not translate";
        }
    });

} else {
    micBtn.style.display = "none";
    console.warn("Speech Recognition not supported.");
}

// ------------------------
// 🔹 HISTORY BUTTON LOGIC
historyBtn.addEventListener("click", async () => {

    if (historyBox.style.display === "block") {
        historyBox.style.display = "none";
        historyBox.innerHTML = "";
        return;
    }

    historyBox.innerHTML = "Loading history...";

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
            historyBox.style.display = "block";
            return;
        }

        history.forEach(item => {
            const div = document.createElement("div");
            div.style.borderBottom = "1px solid #ccc";
            div.style.padding = "6px 0";

            div.innerHTML = `
                <p><b>${item.fromLang}</b> ➜ <b>${item.toLang}</b>
                <small>(${item.date} ${item.time})</small></p>
                <p>${item.fromText}</p>
                <p style="color:green;">${item.toText}</p>
            `;

            historyBox.appendChild(div);
        });

        historyBox.style.display = "block";

    } catch (err) {
        historyBox.innerHTML = "<p>Error loading history</p>";
        historyBox.style.display = "block";
    }
});
// ------------------------
// 🔴 LOGOUT LOGIC
logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");   // token delete
    alert("Logged out successfully");
    window.location.href = "login.html";
});

