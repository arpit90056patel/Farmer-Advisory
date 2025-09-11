const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const sendButton = document.getElementById('sendButton');
const responseLanguageSelect = document.getElementById('responseLanguageSelect');

let uploadedImage = null;

// Language mappings for Gemini responses
const languagePrompts = {
  'en': 'Please respond in English.',
  'hi': 'कृपया हिंदी में जवाब दें।',
  'ml': 'ദയവായി മലയാളത്തിൽ മറുപടി നൽകുക।'
};

async function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Handle image upload and preview
imageInput.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    uploadedImage = file;
    showImagePreview(file);
  }
});

function showImagePreview(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    imagePreview.innerHTML = `
      <div class="image-preview">
        <img src="${e.target.result}" alt="Uploaded image" class="uploaded-image">
        <button class="remove-image" onclick="removeImage()" title="Remove image">&times;</button>
      </div>
    `;
  };
  reader.readAsDataURL(file);
}

function removeImage() {
  uploadedImage = null;
  imagePreview.innerHTML = '';
  imageInput.value = '';
}

async function sendMessage() {
  const message = userInput.value.trim();
  
  if (!message && !uploadedImage) return;

  // Get selected response language
  const responseLanguage = responseLanguageSelect.value;
  const languageInstruction = languagePrompts[responseLanguage];

  // Show user message
  if (uploadedImage) {
    addMessage(message || "Image uploaded", 'user', uploadedImage);
  } else {
    addMessage(message, 'user');
  }
  
  userInput.value = '';
  
  const loading = addMessage('Typing...', 'bot');

  try {
    let body = {};
    let finalMessage = message;
    
    // Add language instruction to the message
    if (finalMessage) {
      finalMessage = `${finalMessage}\n\n${languageInstruction}`;
    } else {
      finalMessage = `Analyze this crop image. ${languageInstruction}`;
    }

    if (uploadedImage) {
      const base64 = await toBase64(uploadedImage);
      body = {
        contents: [{ 
          role: 'user', 
          parts: [{ text: finalMessage }] 
        }],
        inlineImages: [{ 
          mimeType: uploadedImage.type, 
          data: base64.split(',')[1] 
        }]
      };
    } else {
      body = {
        contents: [{ 
          role: 'user', 
          parts: [{ text: finalMessage }] 
        }]
      };
    }

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_GEMINI_API_KEY_HERE', {     //write Gemini Api Key here
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    loading.remove();

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process your request.";
    addMessage(reply, 'bot');

  } catch(err) {
    console.error(err);
    loading.remove();
    addMessage("⚠️ Something went wrong. Please try again.", 'bot');
  }

  // Clear uploaded image after sending
  removeImage();
}

function addMessage(text, sender, imageFile = null) {
  const msg = document.createElement('div');
  msg.className = 'message ' + sender;
  
  if (imageFile && sender === 'user') {
    const reader = new FileReader();
    reader.onload = function(e) {
      msg.innerHTML = `
        <img src="${e.target.result}" alt="Uploaded image" class="uploaded-image" style="display:block; margin-bottom:5px;">
        <div>${text}</div>
      `;
    };
    reader.readAsDataURL(imageFile);
  } else {
    msg.textContent = text;
  }
  
  document.getElementById('chatMessages').appendChild(msg);
  msg.scrollIntoView({ behavior: "smooth" });
  return msg;
}

sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', e => { 
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function scrollToChat() { 
  document.getElementById("chatSection").scrollIntoView({behavior:"smooth"}); 
}
window.scrollToChat = scrollToChat;

// i18next translations with new entries
const resources = {
  en: {
    translation: {
      app_name: "AgriAssist",
      hero_title: "Smart Farming Solutions for Modern Agriculture",
      hero_subtitle: "Get expert advice, crop disease identification, and agricultural guidance powered by AI",
      get_started: "Get Started",
      features_title: "Our Services",
      crop_identification: "Crop Disease Identification",
      crop_identification_desc: "Upload crop images to identify diseases and get treatment suggestions",
      weather_advice: "Weather-based Advice",
      weather_advice_desc: "Get farming recommendations based on current weather",
      expert_consultation: "Expert Consultation",
      expert_consultation_desc: "Chat with AI expert for personalized farming advice",
      market_prices: "Market Prices",
      market_prices_desc: "Stay updated with current market prices",
      chat_title: "Your Digital Krishi Officer",
      welcome_message: "Hello! I'm your AI assistant. Ask about crops, diseases, techniques, or upload images for analysis.",
      message_placeholder: "Type your message...",
      services: "Services",
      chat: "Chat",
      contact: "Contact",
      send: "Send",
      all_rights: "All rights reserved.",
      response_language: "Response Language:",
      english: "English",
      hindi: "Hindi",
      malayalam: "Malayalam"
    }
  },
  hi: {
    translation: {
      app_name: "एग्रीअसिस्ट",
      hero_title: "आधुनिक कृषि के लिए स्मार्ट खेती समाधान",
      hero_subtitle: "एआई द्वारा संचालित विशेषज्ञ सलाह, फसल रोग पहचान और कृषि मार्गदर्शन प्राप्त करें",
      get_started: "शुरू करें",
      features_title: "हमारी सेवाएँ",
      crop_identification: "फसल रोग पहचान",
      crop_identification_desc: "फसल की तस्वीरें अपलोड करें और रोग पहचान व उपचार सुझाव पाएं",
      weather_advice: "मौसम आधारित सलाह",
      weather_advice_desc: "वर्तमान मौसम की स्थिति के आधार पर खेती की सिफारिशें प्राप्त करें",
      expert_consultation: "विशेषज्ञ परामर्श",
      expert_consultation_desc: "व्यक्तिगत कृषि सलाह के लिए एआई विशेषज्ञ से चैट करें",
      market_prices: "बाजार भाव",
      market_prices_desc: "बाजार भाव और रुझानों से अपडेट रहें",
      chat_title: "आपका डिजिटल कृषि अधिकारी",
      welcome_message: "नमस्ते! मैं आपका एआई सहायक हूँ। फसलों, बीमारियों, तकनीकों के बारे में पूछें या विश्लेषण के लिए चित्र अपलोड करें।",
      message_placeholder: "अपना संदेश लिखें...",
      services: "सेवाएँ",
      chat: "चैट",
      contact: "संपर्क",
      send: "भेजें",
      all_rights: "सर्वाधिकार सुरक्षित।",
      response_language: "उत्तर की भाषा:",
      english: "अंग्रेजी",
      hindi: "हिंदी",
      malayalam: "मलयालम"
    }
  },
  ml: {
    translation: {
      app_name: "അഗ്രി അസിസ്റ്റ്",
      hero_title: "ആധുനിക കൃഷിക്കായുള്ള സ്മാർട്ട് ഫാമിംഗ് പരിഹാരങ്ങൾ",
      hero_subtitle: "എഐ ശക്തിപ്പെടുത്തിയ വിദഗ്ധ ഉപദേശം, വിള രോഗ നിർണ്ണയം, കാർഷിക മാർഗനിർദ്ദേശം",
      get_started: "തുടങ്ങുക",
      features_title: "ഞങ്ങളുടെ സേവനങ്ങൾ",
      crop_identification: "വിള രോഗ നിർണ്ണയം",
      crop_identification_desc: "വിള ചിത്രങ്ങൾ അപ്‌ലോഡ് ചെയ്ത് രോഗം തിരിച്ചറിയുക, ചികിത്സാ നിർദ്ദേശങ്ങൾ നേടുക",
      weather_advice: "കാലാവസ്ഥ അടിസ്ഥാനമായ ഉപദേശം",
      weather_advice_desc: "നിലവിലെ കാലാവസ്ഥയെ അടിസ്ഥാനമാക്കി കൃഷി നിർദ്ദേശങ്ങൾ നേടുക",
      expert_consultation: "വിദഗ്ധ ഉപദേശം",
      expert_consultation_desc: "വ്യക്തിഗത കാർഷിക ഉപദേശങ്ങൾക്കായി എഐ വിദഗ്ധനോട് ചാറ്റുചെയ്യുക",
      market_prices: "മാർക്കറ്റ് വിലകൾ",
      market_prices_desc: "നിലവിലെ മാർക്കറ്റ് വിലകളും പ്രവണതകളും അറിയുക",
      chat_title: "നിങ്ങളുടെ ഡിജിറ്റൽ കൃഷി ഓഫീസർ",
      welcome_message: "ഹലോ! ഞാൻ നിങ്ങളുടെ എഐ സഹായിയാണ്. വിളകൾ, രോഗങ്ങൾ, സാങ്കേതിക വിദ്യകൾ എന്നിവയെക്കുറിച്ച് ചോദിക്കുക അല്ലെങ്കിൽ ചിത്രങ്ങൾ അപ്‌ലോഡ് ചെയ്യുക.",
      message_placeholder: "നിങ്ങളുടെ സന്ദേശം ടൈപ്പ് ചെയ്യുക...",
      services: "സേവനങ്ങൾ",
      chat: "ചാറ്റ്",
      contact: "ബന്ധപ്പെടുക",
      send: "പോസ്റ്റ് ചെയ്യുക",
      all_rights: "എല്ലാ അവകാശങ്ങളും സംരക്ഷിച്ചിരിക്കുന്നു.",
      response_language: "മറുപടി ഭാഷ:",
      english: "ഇംഗ്ലീഷ്",
      hindi: "ഹിന്ദി",
      malayalam: "മലയാളം"
    }
  }
};

i18next.init({ lng: 'en', resources }, () => {
  updateTranslations();
});

function updateTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.innerText = i18next.t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = i18next.t(el.getAttribute('data-i18n-placeholder'));
  });
}

document.getElementById('languageSelect').addEventListener('change', (e) => {
  i18next.changeLanguage(e.target.value, () => {
    updateTranslations();
  });
});