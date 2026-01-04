if (!localStorage.getItem("token")) {
    location.href = "login.html";
}

const logoutBtn = document.querySelector(".logout-btn"),
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
        let selected =
            (id === 0 && code === "en") ||
            (id === 1 && code === "hi")
                ? "selected"
                : "";
        tag.insertAdjacentHTML(
            "beforeend",
            `<option ${selected} value="${code}">${countries[code]}</option>`
        );
    }
});

// ------------------------
// Swap Text
exchageIcon.addEventListener("click", () => {
    [fromText.value, toText.value] = [toText.value, fromText.value];
    [selectTag[0].value, selectTag[1].value] = [selectTag[1].value, selectTag[0].value];
});

// ------------------------
// Chunk Helper
function chunkText(text, size = 2000) {
    const chunks = [];
    for (let i = 0; i < text.length; i += size) {
        chunks.push(text.slice(i, i + size));
    }
    return chunks;
}

// ------------------------
// Translate
async function translateLargeText(text, fromLang, toLang) {
    let result = "";
    for (let chunk of chunkText(text)) {
        const res = await fetch(
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(chunk)}`
        );
        const data = await res.json();
        result += data[0].map(i => i[0]).join("");
    }
    return result;
}

// ------------------------
// 🔊 FIXED HINDI SPEECH (ALL DEVICES)
function speakHindi(text) {
    if (!text || !text.trim()) return;

    const synth = window.speechSynthesis;
    synth.cancel();
    synth.resume();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "hi-IN"; // 🔒 ALWAYS HINDI

    synth.speak(utterance);
}

// ------------------------
// SAVE HISTORY
function saveTranslationToDB(fromTextVal, toTextVal, fromLang, toLang) {
    fetch("https://translator-backend-k6xr.onrender.com/api/save", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({
            fromText: fromTextVal,
            toText: toTextVal,
            fromLang,
            toLang
        })
    });
}

// ------------------------
// Translate Button
translateBtn.addEventListener("click", async () => {
    if (!fromText.value.trim()) return alert("Please enter text");

    toText.value = "Translating...";
    const translatedText = await translateLargeText(
        fromText.value,
        selectTag[0].value,
        selectTag[1].value
    );

    toText.value = translatedText;
    saveTranslationToDB(fromText.value, translatedText, selectTag[0].value, selectTag[1].value);
});

// ------------------------
// Copy + Speak
icons.forEach(icon => {
    icon.addEventListener("click", ({ target }) => {
        const isFrom = target.id === "from";
        const text = isFrom ? fromText.value : toText.value;

        if (target.classList.contains("fa-copy")) {
            navigator.clipboard.writeText(text);
        } else if (target.classList.contains("fa-volume-up")) {
            speakHindi(text); // 🔥 ALWAYS HINDI
        }
    });
});

// ------------------------
// 🎤 Speech to Text
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.interimResults = true;

    micBtn.addEventListener("click", () => {
        recognition.lang = selectTag[0].value;
        recognition.start();
        fromText.value = "Listening...";
    });

    recognition.onresult = e => {
        fromText.value = Array.from(e.results)
            .map(r => r[0].transcript)
            .join("");
    };

    recognition.onend = () => translateBtn.click();
}

// ------------------------
// HISTORY
historyBtn.addEventListener("click", async () => {
    historyBox.style.display =
        historyBox.style.display === "block" ? "none" : "block";

    const res = await fetch(
        "https://translator-backend-k6xr.onrender.com/api/history",
        {
            headers: {
                Authorization: "Bearer " + localStorage.getItem("token")
            }
        }
    );

    const history = await res.json();
    historyBox.innerHTML = history
        .map(
            h => `<p><b>${h.fromLang}</b> ➜ <b>${h.toLang}</b><br>${h.fromText}<br><span style="color:green">${h.toText}</span></p>`
        )
        .join("");
});

// ------------------------
// LOGOUT
logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    location.href = "login.html";
});
