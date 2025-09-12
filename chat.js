const apiKey = "YOUR_GEMINI_API_KEY_HERE"; // Your Gemini 2.0 Flash API key
const chatMessages = document.getElementById("chatMessages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("sendButton");
const responseLanguageSelect = document.getElementById("responseLanguageSelect");
const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");

let uploadedImage = null;
let conversationHistory = []; // Stores chat history

function scrollToChat() {
  document.getElementById("chatSection").scrollIntoView({ behavior: "smooth" });
}

// Add message to chat
function addMessage(content, sender = "bot") {
  const msg = document.createElement("div");
  msg.className = "message " + sender;

  if (typeof content === "string") {
    msg.innerHTML = content;
  } else if (content.type === "image") {
    msg.innerHTML = `<img src="${content.src}" class="uploaded-image">`;
  }

  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Convert file to base64
async function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Show image preview above input
function showImagePreview(filename, base64Data) {
  imagePreview.innerHTML = `
    <div class="image-preview">
      <img src="${base64Data}" class="uploaded-image" alt="${filename}">
      <span>${filename}</span>
      <button class="remove-image" onclick="removeImage()">x</button>
    </div>
  `;
}

// Remove image preview
function removeImage() {
  uploadedImage = null;
  imagePreview.innerHTML = "";
}

// Handle file selection
imageInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (file) {
    uploadedImage = await toBase64(file);
    showImagePreview(file.name, uploadedImage);
  }
});

// Initialize conversation with first instruction message
function initializeConversation(language = "en") {
  conversationHistory = [
    {
      role: "user",
      parts: [{
        text: `You are a Kerala Agriculture Expert AI Assistant. 
               Answer all questions ONLY related to Kerala agriculture, crops, diseases, monsoon farming, coconut, rubber, spices, rice, and traditional Kerala farming. 
               Always respond in ${language === "en" ? "English" : language === "hi" ? "Hindi" : "Malayalam"}. 
               Politely decline to answer questions unrelated to agriculture. if user selected the language you have answer in that particular only dont use any english. `                    // train your model here with best propmts
      }]
    }
  ];
}

// When language changes, reinitialize instruction
responseLanguageSelect.addEventListener("change", () => {
  const selectedLang = responseLanguageSelect.value;
  initializeConversation(selectedLang);
});

// Call once at start
initializeConversation(responseLanguageSelect.value);

// Send message on button click or Enter key
sendButton.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  const message = userInput.value.trim();
  if (!message && !uploadedImage) return;

  const selectedLang = responseLanguageSelect.value;

  // Show user text message
  if (message) {
    addMessage(message, "user");
    conversationHistory.push({ role: "user", parts: [{ text: message }] });
  }

  // Show user image in chat
  if (uploadedImage) {
    addMessage({ type: "image", src: uploadedImage }, "user");
    conversationHistory.push({
      role: "user",
      parts: [
        { text: "Here is an image of my crop" },
        { inline_data: { mime_type: "image/png", data: uploadedImage.split(",")[1] } }
      ]
    });
    uploadedImage = null;
    imagePreview.innerHTML = "";
  }

  userInput.value = "";

  // Show loading message
  const loadingMsg = document.createElement("div");
  loadingMsg.className = "message bot";
  loadingMsg.textContent = "Answering...";
  chatMessages.appendChild(loadingMsg);

  try {
    const requestBody = {
      contents: [...conversationHistory]
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      }
    );

    const data = await response.json();
    chatMessages.removeChild(loadingMsg);

    if (data.error) {
      console.error("Gemini API error:", data);
      addMessage("Error from API: " + (data.error.message || JSON.stringify(data.error)), "bot");
      return;
    }

    if (data.candidates && data.candidates.length > 0) {
      const botReply = data.candidates[0].content.parts.map(p => p.text).join(" ");
      addMessage(botReply, "bot");

      // Save to history
      conversationHistory.push({ role: "model", parts: [{ text: botReply }] });
    } else {
      console.error("Unexpected response format:", data);
      addMessage("Sorry, I got a response but couldn’t parse it.", "bot");
    }
  } catch (err) {
    chatMessages.removeChild(loadingMsg);
    console.error("Network or fetch error:", err);
    addMessage("Network error: " + err.message, "bot");
  }
}
