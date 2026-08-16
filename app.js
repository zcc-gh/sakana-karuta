// 鱼牌列表。提示数据来自 hints-data.js，不会直接展示鱼名，以免泄题。
const cards = [
  { zh: "河豚", ja: "フグ", hintZh: "", hintJa: "" },
  { zh: "食人鱼", ja: "ピラニア", hintZh: "", hintJa: "" },
  { zh: "𫚕鱼", ja: "ブリ", hintZh: "", hintJa: "" },
  { zh: "虹鳟", ja: "ニジマス", hintZh: "", hintJa: "" },
  { zh: "褐菖鲉", ja: "カサゴ", hintZh: "", hintJa: "" },
  { zh: "飞鱼", ja: "トビウオ", hintZh: "", hintJa: "" },
  { zh: "鯕鳅", ja: "シイラ", hintZh: "", hintJa: "" },
  { zh: "金枪鱼", ja: "マグロ", hintZh: "", hintJa: "" },
  { zh: "𬶮鱼", ja: "キス", hintZh: "", hintJa: "" },
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
  faceDown: null,
  cardStart: 0,
  elapsed: 0,
  events: [],
  timers: [],
  countdown: null,
};

let motionBound = false;

function showScreen(screen) {
  screens.forEach((item) => item.classList.toggle("hidden", item !== screen));
}

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

function clearTimers() {
  state.timers.forEach(clearTimeout);
  state.timers = [];
  clearInterval(state.countdown);
  state.countdown = null;
}

function stopSpeech() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

function cardName(card) {
  return state.language === "zh" ? card.zh : card.ja;
}

function speak(text) {
  if (!window.speechSynthesis) return;
  stopSpeech();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = state.language === "zh" ? "zh-CN" : "ja-JP";
  const chosenVoice = window.speechSynthesis.getVoices().find((voice) => voice.name === state.voiceName);
  if (chosenVoice) utterance.voice = chosenVoice;
  utterance.rate = .85;
  window.speechSynthesis.speak(utterance);
}

function scheduleCard(events) {
  state.cardStart = Date.now();
  state.elapsed = 0;
  state.events = events;
  armTimers();
}

function armTimers() {
  clearTimers();
  state.events.forEach((event) => {
    const remaining = event.at - state.elapsed;
    if (remaining > 0) state.timers.push(setTimeout(() => event.fn(), remaining));
  });
  state.countdown = setInterval(updateCountdown, 250);
}

function updateCountdown() {
  if (state.paused || state.events.length === 0) return;
  const remaining = Math.max(0, Math.min(...state.events.map((event) => event.at - (Date.now() - state.cardStart))));
  $("countdown").textContent = `${Math.ceil(remaining / 1000)} 秒`;
}

function pause() {
  if (state.paused) return;
  state.paused = true;
  state.elapsed = Date.now() - state.cardStart;
  clearTimers();
  stopSpeech();
  $("readerStage").classList.add("is-paused");
  $("pauseInstruction").textContent = "已暂停 · 翻转手机或点暂停键继续";
  $("pauseButton").textContent = "▶";
  $("countdown").textContent = "已暂停";
}

function resume() {
  if (!state.paused) return;
  state.paused = false;
  state.cardStart = Date.now() - state.elapsed;
  armTimers();
  $("readerStage").classList.remove("is-paused");
  $("pauseInstruction").textContent = "翻转手机暂停 · 点击屏幕中央出提示";
  $("pauseButton").textContent = "Ⅱ";
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

function readName() {
  const card = state.deck[state.index];
  $("currentNumber").textContent = state.index + 1;
  $("nowReading").textContent = "正在读牌";
  $("readerMessage").textContent = "请听读牌";
  $("hintMessage").hidden = true;
  state.hintIndex = 0;
  speak(cardName(card));

  const events = state.mode === "teach"
    ? [
        { at: 2000, fn: speakHint },
        { at: 4000, fn: speakHint },
        { at: 6000, fn: speakHint },
        { at: 6000 + state.interval * 1000, fn: advance },
      ]
    : [{ at: state.interval * 1000, fn: advance }];
  scheduleCard(events);
}

function speakHint() {
  const card = state.deck[state.index];
  const hints = state.language === "zh" ? card.hintZh : card.hintJa;
  const hint = hints[state.hintIndex];
  const message = hint || (state.language === "zh" ? "三条提示都已给出。" : "ヒントはすべて出しました。");
  if (hint) state.hintIndex += 1;
  $("hintMessage").textContent = message;
  $("hintMessage").hidden = false;
  speak(message);
}

function advance() {
  if (state.index >= state.deck.length - 1) finishGame();
  else {
    state.index += 1;
    readName();
  }
}

function finishGame() {
  clearTimers();
  stopSpeech();
  showScreen($("completeScreen"));
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
  state.faceDown = null;

  $("readerStage").classList.remove("is-paused");
  $("pauseButton").textContent = "Ⅱ";
  $("languageLabel").textContent = state.language === "zh" ? "中文读牌" : "日本語の読み上げ";
  $("pauseInstruction").textContent = "翻转手机暂停 · 点击屏幕中央出提示";
  $("readerMessage").textContent = "准备朗读…";
  $("hintMessage").hidden = true;
  showScreen($("gameScreen"));

  const introText = state.language === "zh" ? "开始了哦" : "はじまるよ";
  speak(introText);
  scheduleCard([{ at: 3000, fn: readName }]);
  requestMotionPermission();
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
$("repeatButton").addEventListener("click", () => speak(cardName(state.deck[state.index])));
$("pauseButton").addEventListener("click", togglePauseButton);

$("readerStage").addEventListener("click", () => {
  if (state.paused) return;
  if (state.mode === "free") speakHint();
});
$("readerStage").addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (state.paused) return;
    if (state.mode === "free") speakHint();
  }
});

$("quitButton").addEventListener("click", () => $("quitDialog").showModal());
$("cancelQuitButton").addEventListener("click", () => $("quitDialog").close());
$("confirmQuitButton").addEventListener("click", () => {
  $("quitDialog").close();
  clearTimers();
  stopSpeech();
  showScreen($("modeScreen"));
});
$("backToSettingsButton").addEventListener("click", () => showScreen($("modeScreen")));
