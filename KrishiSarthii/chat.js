// chat.js - Frontend calls backend proxy
let uploadedImage = null; // Store uploaded image file
let chatHistory = []; // UI history (backend handles session)
let isRecording = false; // Track recording state

// Add message to chat box
function addMessage(content, isUser = false, imageUrl = null) {
  const chatBox = document.getElementById('chatBox');
  const messageDiv = document.createElement('div');
  messageDiv.className = `flex items-start gap-2 ${isUser ? 'justify-end' : ''}`;
  
  let html = '';
  if (isUser) {
    html = `<div class="bg-green-500 text-white px-4 py-2 rounded-2xl max-w-xs">${content}</div><span class="text-2xl">🧑</span>`;
    if (imageUrl) {
      html = `<img src="${imageUrl}" alt="Uploaded Image" class="w-24 h-24 object-cover rounded mb-2">` + html;
    }
  } else {
    html = `
      <span class="text-2xl">🤖</span>
      <div class="bg-gray-200 text-gray-800 px-4 py-2 rounded-2xl max-w-xs">
        ${content}
        <button class="listen-btn mt-2 bg-green-500 text-white p-1 rounded-full hover:bg-green-600" data-text="${content.replace(/"/g, '&quot;')}">🔊</button>
      </div>`;
  }
  
  messageDiv.innerHTML = html;
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Attach event listeners to all Listen buttons
  document.querySelectorAll('.listen-btn').forEach(btn => {
    btn.removeEventListener('click', speakResponse); // Prevent duplicate listeners
    btn.addEventListener('click', () => {
      speakResponse(btn.getAttribute('data-text'));
    });
  });
}

// Send message to backend proxy
async function sendMessage() {
  const input = document.getElementById('userInput');
  const prompt = input.value.trim();
  if (!prompt) {
    addMessage('Please enter a message.');
    return;
  }

  const langSelect = document.getElementById('chatLanguageSelect').value;

  // Add user message to UI
  const previewUrl = uploadedImage ? URL.createObjectURL(uploadedImage) : null;
  addMessage(prompt, true, previewUrl);
  input.value = '';

  try {
    // Check image size (Gemini limit: ~20MB)
    if (uploadedImage && uploadedImage.size > 20 * 1024 * 1024) {
      addMessage('Image is too large (max 20MB). Please upload a smaller image.');
      uploadedImage = null;
      document.getElementById('imagePreview').classList.add('hidden');
      return;
    }

    let imageBase64 = null;
    let mimeType = null;
    if (uploadedImage) {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          imageBase64 = reader.result.split(',')[1]; // Base64 without prefix
          mimeType = uploadedImage.type;
          await sendToBackend(prompt, langSelect, imageBase64, mimeType);
        } catch (err) {
          console.error('FileReader Error:', err);
          addMessage('Error processing image. Please try a different PNG or JPEG file.');
        }
      };
      reader.onerror = () => {
        addMessage('Error reading image. Please try a different file.');
      };
      reader.readAsDataURL(uploadedImage);
    } else {
      await sendToBackend(prompt, langSelect);
    }

    // Clear uploaded image after send
    uploadedImage = null;
    document.getElementById('imagePreview').classList.add('hidden');
  } catch (error) {
    console.error('Error:', error);
    addMessage('Error processing request. Please check your internet or try again.');
  }
}

async function sendToBackend(prompt, language, imageBase64 = null, mimeType = null) {
  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, language, imageBase64, mimeType })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText} (${response.status})`);
    }

    const data = await response.json();
    if (data.error) {
      addMessage(data.error);
      return;
    }
    addMessage(data.response);
  } catch (error) {
    console.error('Fetch Error:', error);
    addMessage('Failed to connect to server. Ensure the backend is running at http://localhost:3000 and try again.');
  }
}

// Image upload handler
document.getElementById('imageUpload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && ['image/png', 'image/jpeg'].includes(file.type)) { // Strict MIME check
    if (file.size > 20 * 1024 * 1024) {
      addMessage('Image is too large (max 20MB). Please upload a smaller image.');
      return;
    }
    uploadedImage = file;
    const preview = document.getElementById('previewImg');
    preview.src = URL.createObjectURL(file);
    document.getElementById('imagePreview').classList.remove('hidden');
  } else {
    addMessage('Please upload a valid PNG or JPEG image.');
  }
});

// Send button and Enter key
document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('userInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Voice button: Speech-to-Text
document.getElementById('voiceBtn').addEventListener('click', () => {
  // Check secure context (http:// or https://)
  if (window.location.protocol === 'file:') {
    addMessage('Speech recognition requires a web server (http:// or https://). Please serve the site using "python -m http.server" or a similar server.');
    return;
  }

  if (!('webkitSpeechRecognition' in window)) {
    addMessage('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
    return;
  }

  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  const langSelect = document.getElementById('chatLanguageSelect').value;
  recognition.lang = langSelect === 'hi' ? 'hi-IN' : langSelect === 'ml' ? 'ml-IN' : 'en-IN';

  const voiceBtn = document.getElementById('voiceBtn');
  recognition.onstart = () => {
    isRecording = true;
    voiceBtn.classList.add('recording');
    addMessage('Listening... Speak clearly.');
  };

 recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  document.getElementById('userInput').value = transcript;
  addMessage('Voice input received: ' + transcript);

  // Optional: Auto-send after a short delay (2 seconds) to allow review
  setTimeout(() => {
    if (confirm('Send voice query now?')) {  // Or remove confirm for instant send
      sendMessage();
    }
  }, 2000);
};

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    addMessage('Speech recognition failed: ' + event.error + '. Please ensure microphone access and try again.');
  };

  recognition.onend = () => {
    isRecording = false;
    voiceBtn.classList.remove('recording');
    addMessage('Speech recognition stopped.');
  };

  // Request microphone permission
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(() => recognition.start())
    .catch((err) => {
      console.error('Microphone access error:', err);
      addMessage('Microphone access denied. Please allow microphone permissions in your browser settings (check the padlock icon in the address bar).');
    });
});

// Text-to-Speech for responses (triggered by speaker icon)
function speakResponse(text) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    const langSelect = document.getElementById('chatLanguageSelect').value;
    utterance.lang = langSelect === 'hi' ? 'hi-IN' : langSelect === 'ml' ? 'ml-IN' : 'en-IN';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  } else {
    addMessage('Text-to-speech not supported in this browser.');
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  console.log('Chat initialized');
  document.getElementById('userInput').focus();
  // Check backend health
  fetch('http://localhost:3000/api/health')
    .then(res => res.json())
    .then(data => console.log('Backend status:', data))
    .catch(err => {
      console.error('Backend health check failed:', err);
      addMessage('Warning: Backend server is not responding. Start it with "node server.js" in the backend folder.');
    });
});