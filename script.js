
// Analyze function
function analyze() {
    let symptoms = document.getElementById("symptoms").value.toLowerCase();
    let age = document.getElementById("age").value;
    let heartRate = document.getElementById("heartRate").value;
    let oxygen = document.getElementById("oxygen").value.toLowerCase();

    let resultText = document.getElementById("resultText");
    let suggestion = document.getElementById("suggestion");
    let card = document.getElementById("resultCard");

    // ✅ validation sabse upar
    if (symptoms === "") {
        alert("Please enter symptoms");
        return;
    }

    let score = 0;

    if (symptoms.includes("chest pain")) score += 5;
    if (symptoms.includes("breathing")) score += 5;
    if (symptoms.includes("fever")) score += 2;

    if (age > 60) score += 2;
    if (heartRate > 110) score += 2;
    if (oxygen.includes("low")) score += 3;

    if (score >= 7) {
        resultText.innerText = "🔴 High Risk";
        suggestion.innerText = "Emergency! Go to hospital immediately!";
        card.style.background = "#ff6b6b";
    } 
    else if (score >= 4) {
        resultText.innerText = "🟡 Medium Risk";
        suggestion.innerText = "Consult doctor soon.";
        card.style.background = "#feca57";
    } 
    else {
        resultText.innerText = "🟢 Low Risk";
        suggestion.innerText = "Take rest and monitor.";
        card.style.background = "#1dd1a1";
    }

    // ✅ AI confidence fix
    let confidence = Math.min(score * 10, 100);
    suggestion.innerText += "\n\nAI Confidence: " + confidence + "%";

    // animation
    card.style.transform = "scale(1.05)";
    setTimeout(() => {
        card.style.transform = "scale(1)";
    }, 300);
}


function startVoice() {
    let recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

    recognition.lang = "en-US";

    recognition.start();

    recognition.onresult = function(event) {
        let speech = event.results[0][0].transcript;

        document.getElementById("symptoms").value = speech;

        // 🔥 auto analyze
        analyze();
    };

    recognition.onerror = function() {
        alert("Voice not supported or mic error");
    };
}


function openCamera() {
    alert("Camera feature coming soon!");
}
document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("menu-toggle");
    const navLinks = document.getElementById("nav-links");

    toggle.addEventListener("click", () => {
        navLinks.classList.toggle("active");
    });
});
