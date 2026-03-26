(function () {
  "use strict";

  // ── Configuration ──────────────────────────────────────────────────
  const SUPABASE_URL = "https://xznrlwhpstfhmxljidnj.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bnJsd2hwc3RmaG14bGppZG5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MTc0MzAsImV4cCI6MjA5MDA5MzQzMH0.e7XExxq2bZjibbz9YGJ2RjjtcH_RFMgptzcjJgp9nSE";
  const CHAT_ENDPOINT = SUPABASE_URL + "/functions/v1/chat";

  const PLACEHOLDERS = [
    "What should I know about docks and shoreline permits before I buy?",
    "What is the difference between lakefront and lake access?",
    "What are the hidden costs of owning a waterfront property?",
    "How do I know if a home in the Lakes Region is priced right?",
    "Which Lakes Region towns are best for year-round living?",
    "What should I look for when buying a condo in New Hampshire?",
    "How does the buying process work when I am purchasing from out of state?",
  ];

  // ── State ──────────────────────────────────────────────────────────
  let sessionId = null;
  let isOpen = false;
  let isLoading = false;
  let placeholderIndex = 0;
  let placeholderInterval = null;

  // ── Styles ─────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    #lakeiq-widget * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    #lakeiq-widget {
      font-family: 'Inter', 'Lato', sans-serif;
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    /* ── Collapsed bar ── */
    #lakeiq-bar {
      display: flex;
      align-items: center;
      gap: 0;
      background: #3D3D3D;
      border-radius: 28px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.18);
      overflow: hidden;
      cursor: pointer;
      transition: box-shadow 0.2s;
      max-width: 420px;
    }
    #lakeiq-bar:hover {
      box-shadow: 0 6px 32px rgba(0,0,0,0.28);
    }

    #lakeiq-bar-label {
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 600;
      padding: 0 6px 0 18px;
      white-space: nowrap;
      letter-spacing: 0.5px;
    }

    #lakeiq-bar-placeholder {
      color: #E2E3E4;
      font-size: 13px;
      padding: 0 12px 0 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 260px;
      opacity: 0.85;
      transition: opacity 0.3s;
    }

    #lakeiq-ask-btn {
      background: #B19A55;
      color: #FFFFFF;
      border: none;
      font-family: 'Inter', 'Lato', sans-serif;
      font-size: 13px;
      font-weight: 700;
      padding: 14px 22px;
      cursor: pointer;
      letter-spacing: 1px;
      white-space: nowrap;
      transition: background 0.2s;
      border-radius: 0 28px 28px 0;
    }
    #lakeiq-ask-btn:hover {
      background: #9A8545;
    }

    /* ── Chat window ── */
    #lakeiq-chat {
      display: none;
      width: 400px;
      max-width: calc(100vw - 48px);
      height: 520px;
      max-height: calc(100vh - 120px);
      background: #FFFFFF;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.22);
      flex-direction: column;
      overflow: hidden;
      margin-top: 12px;
    }
    #lakeiq-chat.open {
      display: flex;
    }

    /* ── Header ── */
    #lakeiq-header {
      background: #3D3D3D;
      color: #FFFFFF;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    #lakeiq-header-title {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    #lakeiq-header-beta {
      font-size: 10px;
      font-weight: 600;
      background: #B19A55;
      color: #FFFFFF;
      padding: 2px 8px;
      border-radius: 10px;
      letter-spacing: 0.5px;
    }

    #lakeiq-close-btn {
      background: none;
      border: none;
      color: #E2E3E4;
      font-size: 22px;
      cursor: pointer;
      padding: 0 0 0 12px;
      line-height: 1;
    }
    #lakeiq-close-btn:hover {
      color: #FFFFFF;
    }

    /* ── Messages area ── */
    #lakeiq-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 16px 8px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .lakeiq-msg {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
      white-space: pre-wrap;
    }

    .lakeiq-msg a {
      color: #B19A55;
      text-decoration: underline;
    }

    .lakeiq-msg-user {
      align-self: flex-end;
      background: #B19A55;
      color: #FFFFFF;
      border-bottom-right-radius: 4px;
    }

    .lakeiq-msg-assistant {
      align-self: flex-start;
      background: #F5F5F5;
      color: #3D3D3D;
      border-bottom-left-radius: 4px;
    }

    .lakeiq-msg-welcome {
      align-self: flex-start;
      background: #F5F5F5;
      color: #3D3D3D;
      border-bottom-left-radius: 4px;
      font-size: 13px;
    }

    .lakeiq-typing {
      align-self: flex-start;
      background: #F5F5F5;
      color: #999;
      border-radius: 14px;
      border-bottom-left-radius: 4px;
      padding: 12px 16px;
      font-size: 14px;
    }
    .lakeiq-typing span {
      animation: lakeiq-dot 1.4s infinite;
      display: inline-block;
    }
    .lakeiq-typing span:nth-child(2) { animation-delay: 0.2s; }
    .lakeiq-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes lakeiq-dot {
      0%, 80%, 100% { opacity: 0.3; }
      40% { opacity: 1; }
    }

    /* ── Input area ── */
    #lakeiq-input-area {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-top: 1px solid #E2E3E4;
      gap: 8px;
      flex-shrink: 0;
      background: #FFFFFF;
    }

    #lakeiq-input {
      flex: 1;
      border: 1px solid #E2E3E4;
      border-radius: 22px;
      padding: 10px 16px;
      font-family: 'Inter', 'Lato', sans-serif;
      font-size: 14px;
      outline: none;
      color: #3D3D3D;
      transition: border-color 0.2s;
    }
    #lakeiq-input:focus {
      border-color: #B19A55;
    }
    #lakeiq-input::placeholder {
      color: #AAAAAA;
    }

    #lakeiq-send-btn {
      background: #B19A55;
      border: none;
      color: #FFFFFF;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.2s;
    }
    #lakeiq-send-btn:hover {
      background: #9A8545;
    }
    #lakeiq-send-btn:disabled {
      background: #E2E3E4;
      cursor: not-allowed;
    }
    #lakeiq-send-btn svg {
      width: 18px;
      height: 18px;
    }

    /* ── Mobile adjustments ── */
    @media (max-width: 480px) {
      #lakeiq-widget {
        bottom: 12px;
        right: 12px;
        left: 12px;
        align-items: stretch;
      }
      #lakeiq-chat {
        width: 100%;
        max-width: 100%;
        height: calc(100vh - 80px);
        max-height: calc(100vh - 80px);
        border-radius: 16px 16px 0 0;
      }
      #lakeiq-bar {
        max-width: 100%;
      }
      #lakeiq-bar-placeholder {
        max-width: 140px;
      }
    }
  `;

  // ── Build DOM ──────────────────────────────────────────────────────
  function init() {
    // Inject styles
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    // Root container
    var root = document.createElement("div");
    root.id = "lakeiq-widget";

    // Collapsed bar
    var bar = document.createElement("div");
    bar.id = "lakeiq-bar";
    bar.onclick = toggleChat;

    var label = document.createElement("span");
    label.id = "lakeiq-bar-label";
    label.textContent = "LAKES IQ AI";

    var placeholder = document.createElement("span");
    placeholder.id = "lakeiq-bar-placeholder";
    placeholder.textContent = PLACEHOLDERS[0];

    var askBtn = document.createElement("button");
    askBtn.id = "lakeiq-ask-btn";
    askBtn.textContent = "ASK AI";
    askBtn.onclick = function (e) {
      e.stopPropagation();
      toggleChat();
    };

    bar.appendChild(label);
    bar.appendChild(placeholder);
    bar.appendChild(askBtn);

    // Chat window
    var chat = document.createElement("div");
    chat.id = "lakeiq-chat";

    // Header
    var header = document.createElement("div");
    header.id = "lakeiq-header";

    var headerLeft = document.createElement("div");
    headerLeft.style.display = "flex";
    headerLeft.style.alignItems = "center";
    headerLeft.style.gap = "10px";

    var title = document.createElement("span");
    title.id = "lakeiq-header-title";
    title.textContent = "LAKES IQ AI";

    var beta = document.createElement("span");
    beta.id = "lakeiq-header-beta";
    beta.textContent = "BETA";

    var closeBtn = document.createElement("button");
    closeBtn.id = "lakeiq-close-btn";
    closeBtn.innerHTML = "&times;";
    closeBtn.onclick = toggleChat;

    headerLeft.appendChild(title);
    headerLeft.appendChild(beta);
    header.appendChild(headerLeft);
    header.appendChild(closeBtn);

    // Messages area
    var messages = document.createElement("div");
    messages.id = "lakeiq-messages";

    // Welcome message
    var welcome = document.createElement("div");
    welcome.className = "lakeiq-msg lakeiq-msg-welcome";
    welcome.textContent =
      "Welcome to Lakes IQ. Ask me anything about buying, selling, or living in New Hampshire's Lakes Region.";
    messages.appendChild(welcome);

    // Input area
    var inputArea = document.createElement("div");
    inputArea.id = "lakeiq-input-area";

    var input = document.createElement("input");
    input.id = "lakeiq-input";
    input.type = "text";
    input.placeholder = PLACEHOLDERS[0];
    input.onkeydown = function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    };

    var sendBtn = document.createElement("button");
    sendBtn.id = "lakeiq-send-btn";
    sendBtn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
    sendBtn.onclick = sendMessage;

    inputArea.appendChild(input);
    inputArea.appendChild(sendBtn);

    // Assemble chat
    chat.appendChild(header);
    chat.appendChild(messages);
    chat.appendChild(inputArea);

    // Assemble root
    root.appendChild(bar);
    root.appendChild(chat);
    document.body.appendChild(root);

    // Start rotating placeholders
    startPlaceholderRotation();
  }

  // ── Placeholder rotation ───────────────────────────────────────────
  function startPlaceholderRotation() {
    placeholderInterval = setInterval(function () {
      placeholderIndex = (placeholderIndex + 1) % PLACEHOLDERS.length;
      var barPh = document.getElementById("lakeiq-bar-placeholder");
      var inputEl = document.getElementById("lakeiq-input");
      if (barPh) {
        barPh.style.opacity = "0";
        setTimeout(function () {
          barPh.textContent = PLACEHOLDERS[placeholderIndex];
          barPh.style.opacity = "0.85";
        }, 300);
      }
      if (inputEl && !inputEl.value) {
        inputEl.placeholder = PLACEHOLDERS[placeholderIndex];
      }
    }, 5000);
  }

  // ── Toggle chat open/close ─────────────────────────────────────────
  function toggleChat() {
    isOpen = !isOpen;
    var chat = document.getElementById("lakeiq-chat");
    var bar = document.getElementById("lakeiq-bar");
    if (isOpen) {
      chat.classList.add("open");
      bar.style.display = "none";
      var input = document.getElementById("lakeiq-input");
      if (input) input.focus();
    } else {
      chat.classList.remove("open");
      bar.style.display = "flex";
    }
  }

  // ── Send message ───────────────────────────────────────────────────
  function sendMessage() {
    if (isLoading) return;
    var input = document.getElementById("lakeiq-input");
    var text = input.value.trim();
    if (!text) return;

    input.value = "";
    appendMessage("user", text);
    showTyping();
    isLoading = true;
    updateSendButton();

    fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: text,
        session_id: sessionId,
      }),
    })
      .then(function (resp) {
        return resp.json();
      })
      .then(function (data) {
        hideTyping();
        if (data.error) {
          appendMessage(
            "assistant",
            "Something went wrong. Please try again or call Corina directly at 603-273-6160."
          );
        } else {
          sessionId = data.session_id;
          appendMessage("assistant", data.response);
        }
      })
      .catch(function () {
        hideTyping();
        appendMessage(
          "assistant",
          "Connection issue. Please try again or call Corina directly at 603-273-6160."
        );
      })
      .finally(function () {
        isLoading = false;
        updateSendButton();
      });
  }

  // ── Append message to chat ─────────────────────────────────────────
  function appendMessage(role, text) {
    var messages = document.getElementById("lakeiq-messages");
    var msg = document.createElement("div");
    msg.className = "lakeiq-msg lakeiq-msg-" + role;

    // Convert URLs to clickable links in assistant messages
    if (role === "assistant") {
      msg.innerHTML = formatMessage(text);
    } else {
      msg.textContent = text;
    }

    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  }

  // ── Format message with links ──────────────────────────────────────
  function formatMessage(text) {
    // Escape HTML first
    var escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    // Convert URLs to links
    return escaped.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
  }

  // ── Typing indicator ───────────────────────────────────────────────
  function showTyping() {
    var messages = document.getElementById("lakeiq-messages");
    var typing = document.createElement("div");
    typing.className = "lakeiq-typing";
    typing.id = "lakeiq-typing";
    typing.innerHTML = "<span>.</span><span>.</span><span>.</span>";
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById("lakeiq-typing");
    if (el) el.remove();
  }

  // ── Update send button state ───────────────────────────────────────
  function updateSendButton() {
    var btn = document.getElementById("lakeiq-send-btn");
    if (btn) btn.disabled = isLoading;
  }

  // ── Initialize on DOM ready ────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
