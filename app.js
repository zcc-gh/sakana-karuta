// 鱼牌列表。提示数据来自 hints-data.js，不会直接展示鱼名，以免泄题。
const cards = [
  { zh: "河豚", ja: "フグ", hintZh: "", hintJa: "" },
  { zh: "食人鱼", ja: "ピラニア", hintZh: "", hintJa: "" },
  { zh: "狮鱼", ja: "ブリ", hintZh: "", hintJa: "" },
  { zh: "虹鳟", ja: "ニジマス", hintZh: "", hintJa: "" },
  { zh: "褐菖鲉", ja: "カサゴ", hintZh: "", hintJa: "" },
  { zh: "飞鱼", ja: "トビウオ", hintZh: "", hintJa: "" },
  { zh: "鯕鳅", ja: "シイラ", hintZh: "", hintJa: "" },
  { zh: "金枪鱼", ja: "マグロ", hintZh: "", hintJa: "" },
  { zh: "喜鱼", ja: "キス", hintZh: "", hintJa: "" },
  { zh: "沙丁鱼", ja: "イワシ", hintZh: "", hintJa: "" },
  { zh: "山女鱼", ja: "ヤマメ", hintZh: "", hintJa: "" },
  { zh: "鲑鱼", ja: "サケ", hintZh: "", hintJa: "" },
  { zh: "斗鱼", ja: "ベタ", hintZh: "", hintJa: "" },
  { zh: "鲣鱼", ja: "カツオ", hintZh: "", hintJa: "" },
  { zh: "鲭鱼", ja: "サバ", hintZh: "", hintJa: "" },
  { zh: "带鱼", ja: "タチウオ", hintZh: "", hintJa: "" },
  { zh: "魟鱼", ja: "エイ", hintZh: "", hintJa: "" },
  { zh: "龙鱼", ja: "アロワナ", hintZh: "", hintJa: "" },
  { zh: "鲷鱼", ja: "タイ", hintZh: "", hintJa: "" },
  { zh: "大口黑鲈", ja: "ブラックバス", hintZh: "", hintJa: "" },
  { zh: "石斑鱼", ja: "ハタ", hintZh: "", hintJa: "" },
  { zh: "竹筴鱼", ja: "アジ", hintZh: "", hintJa: "" },
  { zh: "香鱼", ja: "アユ", hintZh: "", hintJa: "" },
  { zh: "黑鲫", ja: "フナ", hintZh: "", hintJa: "" },
];
if (typeof cardHints !== "undefined") {
  cards.forEach((card) => {
    const hints = cardHints[card.zh];
    card.hintZh = hints?.zh || [];
    card.hintJa = hints?.ja || [];
  });
}

const $ = (id) => document.getElementById(id);
const screens = [$("modeScreen"), $("languageScreen"), $("speedScreen"), $("gameScreen"), $("completeScreen")];
const voiceNames = {
  ja: { male: "Hattori", female: "O-Ren" },
  zh: { male: "Li-Mu", female: "莉莉" },
};
const VOLUME = { intro: 0.55, name: 1, hint: 1 };

const state = {
  deck: [],
  index: 0,
  mode: "teach",
  language: "zh",
  gender: "male",
  interval: 5,
  hintIndex: 0,
  voiceName: "",
  paused: false,
  pauseSource: null,
  pausedByDialog: false,
  faceDown: null,
  step: -1,
  stepType: "gap",
  currentText: "",
  gapRemaining: 0,
  gapDeadline: 0,
  timer: null,
  countdown: null,
};

let seqToken = 0;
let motionBound = false;

function showScreen(screen) {
  screens.forEach((item) => item.classList.toggle("hidden", item !== screen));
}

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

function stopSpeech() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

function cardName(card) {
  return state.language === "zh" ? card.zh : card.ja;
}

function speak(text, type = "hint") {
  if (!window.speechSynthesis) return;
  stopSpeech();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = state.language === "zh" ? "zh-CN" : "ja-JP";
  utterance.volume = VOLUME[type] ?? 1;
  const chosenVoice = window.speechSynthesis.getVoices().find((voice) => voice.name === state.voiceName);
  if (chosenVoice) utterance.voice = chosenVoice;
  utterance.rate = .85;
  window.speechSynthesis.speak(utterance);
}

function speakThen(text, type, onDone) {
  if (!window.speechSynthesis) {
    onDone();
    return;
  }
  stopSpeech();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = state.language === "zh" ? "zh-CN" : "ja-JP";
  utterance.volume = VOLUME[type] ?? 1;
  const chosenVoice = window.speechSynthesis.getVoices().find((voice) => voice.name === state.voiceName);
  if (chosenVoice) utterance.voice = chosenVoice;
  utterance.rate = .85;
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    clearTimeout(fallback);
    onDone();
  };
  utterance.onend = finish;
  utterance.onerror = finish;
  const fallback = setTimeout(finish, Math.max(3000, text.length * 400));
  window.speechSynthesis.speak(utterance);
}

function gapStep(token, milliseconds, onDone) {
  state.stepType = "gap";
  state.gapRemaining = milliseconds;
  state.gapDeadline = Date.now() + milliseconds;
  clearTimeout(state.timer);
  state.timer = setTimeout(() => {
    state.timer = null;
    if (token === seqToken) onDone();
  }, milliseconds);
  updateCountdown();
}

function hintStep(token, onDone) {
  const card = state.deck[state.index];
  const hints = state.language === "zh" ? card.hintZh : card.hintJa;
  const hint = hints[state.hintIndex];
  const message = hint || (state.language === "zh" ? "三条提示都已给出。" : "ヒントはすべて出しました。");
  if (hint) state.hintIndex += 1;
  state.currentText = message;
  $("hintMessage").textContent = message;
  $("hintMessage").hidden = false;
  speakThen(message, "hint", () => {
    if (token === seqToken) onDone();
  });
}

function runTeachStep(token, step) {
  state.step = step;
  const card = state.deck[state.index];
  if (step === 0) {
    state.stepType = "speak";
    state.currentText = cardName(card);
    speakThen(state.currentText, "name", () => {
      if (token === seqToken) runTeachStep(token, 1);
    });
  } else if (step === 1 || step === 3 || step === 5) {
    gapStep(token, 2000, () => runTeachStep(token, step + 1));
  } else if (step === 2 || step === 4 || step === 6) {
    state.stepType = "hint";
    hintStep(token, () => runTeachStep(token, step + 1));
  } else if (step === 7) {
    gapStep(token, state.interval * 1000, () => advance(token));
  }
}

function runFreeStep(token, step) {
  state.step = step;
  const card = state.deck[state.index];
  if (step === 0) {
    state.stepType = "speak";
    state.currentText = cardName(card);
    speakThen(state.currentText, "name", () => {
      if (token === seqToken) runFreeStep(token, 1);
    });
  } else if (step === 1) {
    gapStep(token, state.interval * 1000, () => advance(token));
  }
}

function startCard(token) {
  if (token !== seqToken) return;
  $("currentNumber").textContent = state.index + 1;
  $("nowReading").textContent = "正在读牌";
  $("readerMessage").textContent = "请听读牌";
  $("hintMessage").hidden = true;
  state.hintIndex = 0;
  if (state.mode === "teach") runTeachStep(token, 0);
  else runFreeStep(token, 0);
}

function advance(token) {
  if (token !== seqToken) return;
  if (state.index >= state.deck.length - 1) finishGame();
  else {
    state.index += 1;
    startCard(token);
  }
}

function startGame() {
  stopSpeech();
  state.mode = document.querySelector('input[name="mode"]:checked').value;
  state.language = document.querySelector('input[name="language"]:checked').value;
  state.gender = document.querySelector('input[name="gender"]:checked').value;
  state.interval = Number(document.querySelector('input[name="interval"]:checked').value);
  state.voiceName = voiceNames[state.language][state.gender];
  state.deck = shuffle(cards);
  state.index = 0;
  state.hintIndex = 0;
  state.paused = false;
  state.pauseSource = null;
  state.pausedByDialog = false;
  state.faceDown = null;
  seqToken += 1;
  const token = seqToken;

  $("readerStage").classList.remove("is-paused");
  $("pauseButton").textContent = "Ⅱ";
  $("languageLabel").textContent = state.language === "zh" ? "中文读牌" : "日本語の読み上げ";
  $("pauseInstruction").textContent = "翻转手机暂停 · 点击屏幕中央出提示";
  $("readerMessage").textContent = "准备朗读…";
  $("hintMessage").hidden = true;
  $("nextCard").classList.toggle("hidden", state.mode === "teach");
  clearInterval(state.countdown);
  state.countdown = setInterval(updateCountdown, 250);
  showScreen($("gameScreen"));

  const introText = state.language === "zh" ? "开始了哦" : "はじまるよ";
  state.step = -1;
  state.stepType = "gap";
  speak(introText, "intro");
  gapStep(token, 3000, () => startCard(token));
  requestMotionPermission();
}

function pause() {
  if (state.paused) return;
  state.paused = true;
  seqToken += 1;
  clearTimeout(state.timer);
  state.timer = null;
  if (state.stepType === "gap" && state.gapDeadline) {
    state.gapRemaining = Math.max(0, state.gapDeadline - Date.now());
    state.gapDeadline = 0;
  }
  stopSpeech();
  $("readerStage").classList.add("is-paused");
  $("pauseInstruction").textContent = "已暂停 · 翻转手机或点暂停键继续";
  $("pauseButton").textContent = "▶";
  $("countdown").textContent = "已暂停";
}

function resume() {
  if (!state.paused) return;
  state.paused = false;
  seqToken += 1;
  const token = seqToken;
  $("readerStage").classList.remove("is-paused");
  $("pauseInstruction").textContent = "翻转手机暂停 · 点击屏幕中央出提示";
  $("pauseButton").textContent = "Ⅱ";

  if (state.step === -1) {
    gapStep(token, state.gapRemaining, () => startCard(token));
  } else if (state.stepType === "gap") {
    gapStep(token, state.gapRemaining, resumeNext(token));
  } else {
    state.currentText = state.currentText || cardName(state.deck[state.index]);
    speakThen(state.currentText, state.stepType === "hint" ? "hint" : "name", resumeNext(token));
  }
}

function resumeNext(token) {
  return () => {
    if (token !== seqToken) return;
    if (state.mode === "teach") {
      if (state.step >= 7) advance(token);
      else runTeachStep(token, state.step + 1);
    } else {
      if (state.step >= 1) advance(token);
      else runFreeStep(token, state.step + 1);
    }
  };
}

function togglePauseButton() {
  if (state.paused) {
    state.pauseSource = null;
    resume();
  } else {
    state.pauseSource = "button";
    pause();
  }
}

function finishGame() {
  seqToken += 1;
  clearTimeout(state.timer);
  state.timer = null;
  clearInterval(state.countdown);
  state.countdown = null;
  stopSpeech();
  showScreen($("completeScreen"));
}

function endGame() {
  seqToken += 1;
  clearTimeout(state.timer);
  state.timer = null;
  clearInterval(state.countdown);
  state.countdown = null;
  stopSpeech();
  showScreen($("modeScreen"));
}

function updateCountdown() {
  if (state.mode === "teach" || state.paused || state.stepType !== "gap") return;
  const remaining = Math.max(0, state.gapDeadline - Date.now());
  $("countdown").textContent = `${Math.ceil(remaining / 1000)} 秒`;
}

function freeTapHint() {
  if (state.paused || state.mode !== "free") return;
  const card = state.deck[state.index];
  const hints = state.language === "zh" ? card.hintZh : card.hintJa;
  const hint = hints[state.hintIndex];
  const message = hint || (state.language === "zh" ? "三条提示都已给出。" : "ヒントはすべて出しました。");
  if (hint) state.hintIndex += 1;
  $("hintMessage").textContent = message;
  $("hintMessage").hidden = false;
  speak(message, "hint");

  state.step = 1;
  state.stepType = "gap";
  gapStep(seqToken, state.interval * 1000, () => advance(seqToken));
}

async function requestMotionPermission() {
  try {
    if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
      await DeviceMotionEvent.requestPermission();
    }
  } catch (error) {}
  try {
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      await DeviceOrientationEvent.requestPermission();
    }
  } catch (error) {}
  if (!motionBound) {
    motionBound = true;
    window.addEventListener("deviceorientation", onOrientation, true);
  }
}

function onOrientation(event) {
  if (event.beta == null) return;
  const faceDown = Math.abs(event.beta) > 130;
  if (faceDown === state.faceDown) return;
  state.faceDown = faceDown;
  if (faceDown) {
    if (!state.paused) {
      state.pauseSource = "flip";
      pause();
    }
  } else if (state.paused && state.pauseSource === "flip") {
    resume();
  }
}

function bindRadioHighlight(name, selector) {
  document.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.addEventListener("change", () => {
      document.querySelectorAll(selector).forEach((element) => {
        const inputInElement = element.querySelector("input");
        element.classList.toggle("selected", inputInElement && inputInElement.checked);
      });
    });
  });
}
bindRadioHighlight("mode", ".mode-choice");
bindRadioHighlight("language", ".language-card .choice");
bindRadioHighlight("gender", ".language-card .choice");
bindRadioHighlight("interval", ".speed-choice");

$("toLanguageButton").addEventListener("click", () => showScreen($("languageScreen")));
$("backToModeButton").addEventListener("click", () => showScreen($("modeScreen")));
$("toSpeedButton").addEventListener("click", () => showScreen($("speedScreen")));
$("backToLanguageButton").addEventListener("click", () => showScreen($("languageScreen")));
$("startButton").addEventListener("click", startGame);
$("restartButton").addEventListener("click", startGame);

$("repeatButton").addEventListener("click", () => {
  if (state.paused) return;
  seqToken += 1;
  const token = seqToken;
  startCard(token);
});

$("pauseButton").addEventListener("click", togglePauseButton);
$("readerStage").addEventListener("click", freeTapHint);
$("readerStage").addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    freeTapHint();
  }
});

$("quitButton").addEventListener("click", () => {
  if (!state.paused) {
    state.pausedByDialog = true;
    state.pauseSource = "dialog";
    pause();
  }
  $("quitDialog").showModal();
});

$("cancelQuitButton").addEventListener("click", () => {
  $("quitDialog").close();
  if (state.pausedByDialog) {
    state.pausedByDialog = false;
    state.pauseSource = null;
    resume();
  }
});

$("confirmQuitButton").addEventListener("click", () => {
  $("quitDialog").close();
  state.pausedByDialog = false;
  endGame();
});

$("backToSettingsButton").addEventListener("click", () => showScreen($("modeScreen")));
