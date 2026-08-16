// 在这里补齐卡牌提示。提示不会展示鱼名，以免直接泄题。
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
  cards.forEach((card) => { const hints = cardHints[card.zh]; card.hintZh = hints?.zh || []; card.hintJa = hints?.ja || []; });
}

const $ = (id) => document.getElementById(id);
const screens = [$("setupScreen"), $("speedScreen"), $("gameScreen"), $("completeScreen")];
const voiceNames = {
  ja: { male: "Hattori", female: "O-Ren" },
  zh: { male: "Li-Mu", female: "莉莉" },
};
const state = { deck: [], index: 0, language: "zh", gender: "male", interval: 5, hints: false, hintIndex: 0, voiceName: "", paused: false, remaining: 0, timeout: null, countdown: null, nextAt: 0 };

function showScreen(screen) { screens.forEach((item) => item.classList.toggle("hidden", item !== screen)); }
function shuffle(list) { return [...list].sort(() => Math.random() - 0.5); }
function clearSchedule() { clearTimeout(state.timeout); clearInterval(state.countdown); state.timeout = state.countdown = null; window.speechSynthesis.cancel(); }
function cardName(card) { return state.language === "zh" ? card.zh : card.ja; }
function speak(text) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = state.language === "zh" ? "zh-CN" : "ja-JP";
  const chosenVoice = window.speechSynthesis.getVoices().find((voice) => voice.name === state.voiceName);
  if (chosenVoice) utterance.voice = chosenVoice;
  utterance.rate = .85;
  window.speechSynthesis.speak(utterance);
}
function updateCountdown() {
  const seconds = Math.max(0, Math.ceil((state.nextAt - Date.now()) / 1000));
  $("countdown").textContent = `${seconds} 秒`;
}
function scheduleNext() {
  scheduleIn(state.interval * 1000);
}
function scheduleIn(milliseconds) {
  state.nextAt = Date.now() + milliseconds;
  const isLastCard = state.index >= state.deck.length - 1;
  if (isLastCard) $("countdown").textContent = "本局最后一张";
  else { updateCountdown(); state.countdown = setInterval(updateCountdown, 250); }
  state.timeout = setTimeout(() => {
    clearInterval(state.countdown);
    if (state.index >= state.deck.length - 1) finishGame();
    else { state.index += 1; readCurrent(); }
  }, milliseconds);
}
function togglePause() {
  if (state.paused) {
    state.paused = false;
    $("readerStage").classList.remove("is-paused");
    $("pauseInstruction").textContent = "点击屏幕暂停";
    $("readerStage").setAttribute("aria-label", "点击暂停读牌");
    scheduleIn(state.remaining);
    return;
  }
  state.paused = true;
  state.remaining = Math.max(0, state.nextAt - Date.now());
  clearTimeout(state.timeout); clearInterval(state.countdown); window.speechSynthesis.cancel();
  $("readerStage").classList.add("is-paused");
  $("pauseInstruction").textContent = "点击继续";
  $("readerStage").setAttribute("aria-label", "点击继续读牌");
  $("countdown").textContent = "已暂停";
}
function readCurrent() {
  const name = cardName(state.deck[state.index]);
  $("currentNumber").textContent = state.index + 1;
  $("readerMessage").textContent = "请听读牌";
  $("hintMessage").hidden = true;
  state.hintIndex = 0;
  speak(name);
  scheduleNext();
}
function startGame() {
  clearSchedule();
  state.language = document.querySelector('input[name="language"]:checked').value;
  state.gender = document.querySelector('input[name="gender"]:checked').value;
  state.interval = Number(document.querySelector('input[name="interval"]:checked').value);
  state.hints = $("hintsEnabled").checked;
  state.voiceName = voiceNames[state.language][state.gender];
  state.deck = shuffle(cards); state.index = 0; state.hintIndex = 0;
  state.paused = false; state.remaining = 0;
  $("readerStage").classList.remove("is-paused");
  $("pauseInstruction").textContent = "点击屏幕暂停";
  $("languageLabel").textContent = state.language === "zh" ? "中文读牌" : "日本語の読み上げ";
  $("hintButton").disabled = !state.hints;
  $("hintButton").style.opacity = state.hints ? "1" : ".42";
  showScreen($("gameScreen"));
  $("readerMessage").textContent = state.language === "zh" ? "开始了哦" : "はじまるよ";
  speak(state.language === "zh" ? "开始了哦" : "はじまるよ");
  state.timeout = setTimeout(readCurrent, 3000);
}
function finishGame() { clearSchedule(); showScreen($("completeScreen")); }
function showHint() {
  const card = state.deck[state.index]; const hints = state.language === "zh" ? card.hintZh : card.hintJa;
  const hint = hints[state.hintIndex++];
  const message = hint || (state.language === "zh" ? "三条提示都已给出。" : "ヒントはすべて出しました。");
  $("hintMessage").textContent = message; $("hintMessage").hidden = false;
  speak(message);
}

document.querySelectorAll('input[name="language"]').forEach((input) => input.addEventListener("change", () => document.querySelectorAll(".choice").forEach((choice) => choice.classList.toggle("selected", choice.querySelector("input").checked))));
document.querySelectorAll('input[name="gender"]').forEach((input) => input.addEventListener("change", () => document.querySelectorAll(".choice").forEach((choice) => choice.classList.toggle("selected", choice.querySelector("input").checked))));
document.querySelectorAll('input[name="interval"]').forEach((input) => input.addEventListener("change", () => document.querySelectorAll(".speed-choice").forEach((choice) => choice.classList.toggle("selected", choice.querySelector("input").checked))));
function openSpeedScreen() {
  showScreen($("speedScreen"));
}
$("toSpeedButton").addEventListener("click", openSpeedScreen);
$("backToLanguageButton").addEventListener("click", () => showScreen($("setupScreen")));
$("startButton").addEventListener("click", startGame);
$("restartButton").addEventListener("click", startGame);
$("repeatButton").addEventListener("click", () => speak(cardName(state.deck[state.index])));
$("hintButton").addEventListener("click", showHint);
$("readerStage").addEventListener("click", togglePause);
$("readerStage").addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); togglePause(); } });
$("quitButton").addEventListener("click", () => $("quitDialog").showModal());
$("cancelQuitButton").addEventListener("click", () => $("quitDialog").close());
$("confirmQuitButton").addEventListener("click", () => { $("quitDialog").close(); clearSchedule(); showScreen($("setupScreen")); });
$("backToSettingsButton").addEventListener("click", () => showScreen($("setupScreen")));
