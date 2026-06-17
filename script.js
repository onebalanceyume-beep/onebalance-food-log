// ===== LIFF初期化 + localStorage対応(PWA対応) =====
const LIFF_ID = "2010053759-TK9uAwtz";
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxwczCM82WBjyjURd6D6Dn66mtLb9oUVWiWxQrJx4IhcWPnlMlC3nRZoQdhGXK1K09m/exec';
const STORAGE_KEY = 'onetable_user_id';

let lineUserId = '';
let myData = null;
let weightChart = null;

async function initLiff() {
  try {
    const savedUid = localStorage.getItem(STORAGE_KEY);
    const isInLiff = window.location.href.includes('liff.line.me') || 
                     window.parent !== window;
    
    if (isInLiff || !savedUid) {
      await liff.init({ liffId: LIFF_ID });
      
      if (!liff.isLoggedIn()) {
        liff.login();
        return;
      }
      
      const profile = await liff.getProfile();
      lineUserId = profile.userId;
      localStorage.setItem(STORAGE_KEY, lineUserId);
      console.log("LIFFから取得 & 保存:", lineUserId);
      
    } else {
      lineUserId = savedUid;
      console.log("localStorageから取得:", lineUserId);
    }
    
    setGreeting();
    loadData();
    setupWeightInput();
    
  } catch (err) {
    console.error("初期化エラー:", err);
    
    const urlParams = new URLSearchParams(window.location.search);
    const urlUid = urlParams.get('uid');
    const savedUid = localStorage.getItem(STORAGE_KEY);
    
    lineUserId = urlUid || savedUid || '';
    
    if (lineUserId) {
      if (urlUid) localStorage.setItem(STORAGE_KEY, urlUid);
      setGreeting();
      loadData();
      setupWeightInput();
    } else {
      showError("初回はLINEのリッチメニューから開いてください");
    }
  }
}

window.addEventListener('DOMContentLoaded', initLiff);

function setGreeting() {
  const hour = new Date().getHours();
  let text = 'おはようございます';
  if (hour >= 11 && hour < 15) text = 'こんにちは';
  else if (hour >= 15 && hour < 18) text = 'お疲れ様です';
  else if (hour >= 18 || hour < 5) text = 'こんばんは';
  document.getElementById('greetingText').textContent = text;
}

function setupWeightInput() {
  const input = document.getElementById('weightInput');
  input.addEventListener('focus', () => {
    input.value = '';
  });
  input.addEventListener('blur', () => {
    if (input.value === '') {
      input.value = '';
    }
  });
}

function loadData() {
  if (!lineUserId) {
    showError('LINEから開いてください');
    return;
  }
  
  fetch(`${GAS_URL}?action=getData&uid=${lineUserId}`)
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        showError(data.error);
        return;
      }
      
      myData = data;
      renderPage(data);
      
      document.getElementById('loading').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      
      handleHashScroll();
    })
    .catch(err => {
      showError('読み込みに失敗しました');
      console.error(err);
    });
}

function handleHashScroll() {
  const hash = window.location.hash;
  if (!hash) return;
  
  setTimeout(() => {
    let targetEl = null;
    if (hash === '#weight') targetEl = document.querySelector('.weight-card');
    else if (hash === '#food') targetEl = document.querySelector('.food-card');
    else if (hash === '#water') targetEl = document.querySelector('.water-card');
    else if (hash === '#cheat') targetEl = document.querySelector('.cheat-card');
    else if (hash === '#recommend') targetEl = document.querySelector('.recommend-card');
    
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      targetEl.style.transition = 'transform 0.3s ease';
      targetEl.style.transform = 'scale(1.02)';
      setTimeout(() => { targetEl.style.transform = 'scale(1)'; }, 300);
    }
  }, 300);
}

function renderPage(data) {
  const m = data.member;
  const t = data.today;
  
  document.getElementById('nickname').textContent = m.nickname || 'ヨシ';
  
  // 体重入力欄：数値を先に見せない
  const weightInput = document.getElementById('weightInput');
  weightInput.placeholder = (m.currentWeight || 70.0).toFixed(1);
  weightInput.value = '';

  // 前回からの差分表示
  if (data.weightHistory && data.weightHistory.length >= 2) {
    const history = data.weightHistory;
    const latest = history[history.length - 1].weight;
    const prev = history[history.length - 2].weight;
    const diff = (latest - prev).toFixed(1);
    const sign = diff > 0 ? '+' : '';
    
    const changeDisplay = document.getElementById('weightChangeDisplay');
    const changeValue = document.getElementById('weightChangeValue');
    const changeSince = document.getElementById('weightChangeSince');
    
    changeDisplay.style.display = 'block';
    changeValue.textContent = `${sign}${diff}kg`;
    changeValue.className = 'weight-change-value ' + (diff <= 0 ? 'change-down' : 'change-up');
    changeSince.textContent = `${history[history.length - 2].date} の記録から`;
  }

  // スタートからの差分表示
  if (data.weightHistory && data.weightHistory.length >= 2) {
    const history = data.weightHistory;
    const first = history[0].weight;
    const latest = history[history.length - 1].weight;
    const totalDiff = (latest - first).toFixed(1);
    const sign = totalDiff > 0 ? '+' : '';
    
    const startDisplay = document.getElementById('startDiffDisplay');
    const startValue = document.getElementById('startDiffValue');
    startDisplay.style.display = 'block';
    startValue.textContent = `${sign}${totalDiff}kg の変化`;
    startValue.className = 'weight-diff ' + (totalDiff <= 0 ? 'diff-good' : 'diff-warn');
  }
  
  drawWeightChart(data.weightHistory);
  renderFoodList(t.foods);
  viewDaysAgo = 1; loadDay();
  renderRecent(data.recentMenus);
  renderPFC(t, m);
  renderWater(t.water, m.targetWater);
  renderRecommend(data.recommendedFoods);
  renderWeekCalendar(m.cheatDay);
  
  document.getElementById('streakDays').textContent = data.streakDays || 0;
}

function renderFoodList(foods) {
  const container = document.getElementById('foodList');
  if (!foods || foods.length === 0) {
    container.innerHTML = '<div class="food-empty">まだ記録がありません<br>LINEで食事写真を送ってください</div>';
    return;
  }
  container.innerHTML = foods.map(f => `
    <div class="food-item">
      <div class="food-time">${f.time}</div>
      <div>
        <span class="food-meal">${f.mealType}</span>
        <span class="food-menu">${f.menu}</span>
      </div>
      <div class="food-pfc">
        P:${f.protein}g  F:${f.fat}g  C:${f.carbohydrate}g  ${f.calorie}kcal
      </div>
    </div>
  `).join('');
}

function renderRecommend(recommend) {
  const messageEl = document.getElementById('recommendMessage');
  const listEl = document.getElementById('recommendList');
  
  if (!recommend) {
    messageEl.textContent = 'データを読み込み中...';
    listEl.innerHTML = '';
    return;
  }
  
  messageEl.textContent = recommend.message;
  
  if (!recommend.foods || recommend.foods.length === 0) {
    listEl.innerHTML = '<div class="recommend-empty">バランスばっちりです♡</div>';
    return;
  }
  
  listEl.innerHTML = recommend.foods.map((f, i) => `
    <div class="recommend-item">
      <div class="recommend-rank">${i + 1}位</div>
      <div class="recommend-name">${f.name}</div>
      <div class="recommend-serving">${f.serving} (${f.servingG}g)</div>
      <div class="recommend-pfc">
        <span>P ${f.p}g</span>
        <span>F ${f.f}g</span>
        <span>C ${f.c}g</span>
        <span>${f.calorie}kcal</span>
      </div>
    </div>
  `).join('');
}

function renderWeekCalendar(cheatDayName) {
  const container = document.getElementById('weekCalendar');
  const countdownEl = document.getElementById('cheatCountdown');
  
  const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];
  const dayMap = { '日': 0, '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6 };
  const cheatDayNum = dayMap[cheatDayName];
  
  const today = new Date();
  const todayDow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((todayDow + 6) % 7));
  
  let html = '';
  let daysUntilCheat = -1;
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dow = date.getDay();
    const dateNum = date.getDate();
    const isToday = date.toDateString() === today.toDateString();
    const isCheat = dow === cheatDayNum;
    
    if (isCheat) {
      const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
      if (diff >= 0) daysUntilCheat = diff;
    }
    
    let cls = 'week-day';
    if (isToday && !isCheat) cls += ' today';
    if (isCheat) cls += ' cheat';
    
    html += `
      <div class="${cls}">
        <div class="day-label">${dayLabels[dow]}</div>
        <div class="day-num">${dateNum}</div>
        ${isCheat ? '<div class="day-icon">🎂</div>' : ''}
      </div>
    `;
  }
  
  container.innerHTML = html;
  
  if (cheatDayNum === undefined) {
    countdownEl.innerHTML = 'チートデイ未設定';
  } else if (daysUntilCheat === 0) {
    countdownEl.innerHTML = '今日はチートデイ <strong>🎂</strong> 楽しんで♡';
  } else if (daysUntilCheat > 0) {
    countdownEl.innerHTML = `チートデイまで <strong>あと${daysUntilCheat}日</strong>`;
  } else {
    countdownEl.innerHTML = 'チートデイは今週終了。来週もう少し!';
  }
}

function renderPFC(today, member) {
  const pRate = Math.min((today.totalP / member.targetP * 100) || 0, 100);
  const fRate = Math.min((today.totalF / member.targetF * 100) || 0, 100);
  const cRate = Math.min((today.totalC / member.targetC * 100) || 0, 100);
  
  document.getElementById('pValue').textContent = `${(today.totalP || 0).toFixed(1)} / ${member.targetP} g`;
  document.getElementById('fValue').textContent = `${(today.totalF || 0).toFixed(1)} / ${member.targetF} g`;
  document.getElementById('cValue').textContent = `${(today.totalC || 0).toFixed(1)} / ${member.targetC} g`;
  
  document.getElementById('pBar').style.width = pRate + '%';
  document.getElementById('fBar').style.width = fRate + '%';
  document.getElementById('cBar').style.width = cRate + '%';
  
  document.getElementById('totalCalorie').textContent = today.totalCalorie || 0;
  document.getElementById('targetCalorie').textContent = member.targetCalorie;
}

function renderWater(currentMl, targetL) {
  const currentL = (currentMl / 1000).toFixed(1);
  const rate = Math.min((currentMl / 1000 / targetL * 100) || 0, 100);
  document.getElementById('waterTotal').textContent = currentL;
  document.getElementById('waterTarget').textContent = targetL || '--';
  document.getElementById('waterBar').style.width = rate + '%';
}

function drawWeightChart(history) {
  const ctx = document.getElementById('weightChart').getContext('2d');
  
  if (weightChart) weightChart.destroy();
  
  if (!history || history.length === 0) {
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#B89AAA';
    ctx.textAlign = 'center';
    ctx.fillText('体重を記録するとグラフが表示されます', ctx.canvas.width / 2, ctx.canvas.height / 2);
    return;
  }
  
  weightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: history.map(h => h.date),
      datasets: [{
        label: '変化',
        data: history.map(h => h.weight),
        borderColor: '#7AA8D8',
        backgroundColor: 'rgba(165, 200, 235, 0.2)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#7AA8D8',
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: () => '記録あり'
          }
        }
      },
      scales: {
        y: {
          display: false  // Y軸の数値を完全非表示
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 10 }, color: '#8FA8BD', maxTicksLimit: 7 }
        }
      }
    }
  });
}

function saveWeightHandler() {
  const input = document.getElementById('weightInput');
  const weight = parseFloat(input.value);
  
  if (!weight || weight < 20 || weight > 200) {
    showToast('正しい体重を入力してください', 'error');
    input.focus();
    return;
  }
  
  showToast('記録中...', 'info');
  
  postToGas({ action: 'saveWeight', uid: lineUserId, weight: weight })
    .then(() => {
      showToast('体重を記録しました ✨', 'success');
      input.value = '';
      setTimeout(() => loadData(), 1000);
    });
}

function addWater(ml) {
  showToast(`水分 ${ml}ml 追加 💧`, 'success');
  postToGas({ action: 'saveWater', uid: lineUserId, ml: ml })
    .then(() => { setTimeout(() => loadData(), 800); });
}
function addWaterManual() {
  const input = document.getElementById('waterManualInput');
  const ml = parseInt(input.value, 10);
  if (!ml || ml < 1 || ml > 3000) {
    showToast('1〜3000の数字を入力してください', 'error');
    return;
  }
  input.value = '';
  input.blur();
  addWater(ml);
}

function openCheatDayModal() {
  document.getElementById('cheatDayModal').style.display = 'flex';
}

function closeCheatDayModal() {
  document.getElementById('cheatDayModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  const options = document.querySelectorAll('.day-option');
  options.forEach(btn => {
    btn.addEventListener('click', () => {
      const day = btn.getAttribute('data-day');
      saveCheatDay(day);
    });
  });
});

function saveCheatDay(day) {
  showToast('変更中...', 'info');
  postToGas({ 
    action: 'updateProfile', 
    uid: lineUserId, 
    profile: { cheatDay: day }
  }).then(() => {
    showToast(`チートデイを「${day === 'なし' ? '設定しない' : day + '曜日'}」に変更しました ✨`, 'success');
    closeCheatDayModal();
    setTimeout(() => loadData(), 1000);
  });
}

function postToGas(data) {
  return fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(data)
  }).then(() => ({ success: true }))
    .catch(err => ({ error: err.toString() }));
}

function showProfile() {
  window.location.href = `profile.html`;
}

function showGoal() {
  window.location.href = `profile.html#goal`;
}

function confirmPause() {
  if (confirm('サービスを休止しますか?\n\nデータは残したまま、AI返信だけ止まります。\n再開はLINEで「再開」と送るだけでOKです。')) {
    showToast('LINEで「休止」と送ってください', 'success');
  }
}

function confirmWithdraw() {
  const ok1 = confirm('本当に退会しますか?\n\nこれまでの記録もすべて確認できなくなります。');
  if (!ok1) return;
  
  const ok2 = confirm('もう一度確認します。\n\n退会前に1ヶ月だけお休みする選択肢もあります。\n\n本当に退会しますか?');
  if (!ok2) return;
  
  const reason = prompt('退会理由を選んでください(任意)\n\n1. 効果が感じられなかった\n2. 価格が合わなかった\n3. 時間がなくなった\n4. 他のサービスに移った\n5. その他\n\n番号を入力してください:');
  
  const reasonMap = {'1':'効果が感じられなかった','2':'価格が合わなかった','3':'時間がなくなった','4':'他のサービスに移った','5':'その他'};
  const reasonText = reasonMap[reason] || 'その他';
  const satisfaction = prompt('満足度を1〜5で教えてください(任意・スキップOK)') || '';
  const comment = prompt('最後に、ご意見・ご感想があれば(任意・スキップOK)') || '';
  
  postToGas({ action: 'withdraw', uid: lineUserId, reason: reasonText, satisfaction: satisfaction, comment: comment })
    .then(() => {
      localStorage.removeItem(STORAGE_KEY);
      showToast('退会処理が完了しました', 'success');
    });
}

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}

function showError(message) {
  document.getElementById('errorText').textContent = message;
  document.getElementById('errorMessage').style.display = 'block';
  document.getElementById('loading').style.display = 'none';
}

function hideError() {
  document.getElementById('errorMessage').style.display = 'none';
}
function renderYesterday(y) {
  const card = document.getElementById('yesterdayCard');
  if (!card) return;
  if (!y || !y.foods || y.foods.length === 0) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  document.getElementById('yesterdaySummary').textContent =
    `合計 ${Math.round(y.totalCalorie)}kcal ／ P:${y.totalP.toFixed(1)}g F:${y.totalF.toFixed(1)}g C:${y.totalC.toFixed(1)}g`;
  document.getElementById('yesterdayFoods').innerHTML = y.foods.map(f => `
    <div class="food-item">
      <div>
        <span class="food-meal">${f.mealType}</span>
        <span class="food-menu">${f.menu}</span>
      </div>
      <div class="food-pfc">${f.calorie}kcal</div>
    </div>
  `).join('');
}

function renderRecent(menus) {
  const card = document.getElementById('recentCard');
  if (!card) return;
  if (!menus || menus.length === 0) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  window.__recent = menus;
  document.getElementById('recentMenus').innerHTML = menus.map(function(m, i){
    return '<button onclick="logFood(' + i + ')" style="background:#FFF;border:1.5px solid #DB444C;color:#DB444C;border-radius:20px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">' + m.menu + '</button>';
  }).join('');
  if (!recMeal) initRecDefaults();
}
let viewDaysAgo = 1;
function changeDay(delta) {
  const next = viewDaysAgo + delta;
  if (next < 0) return;
  viewDaysAgo = next;
  loadDay();
}
function loadDay() {
  fetch(GAS_URL + '?action=getDayData&uid=' + lineUserId + '&days=' + viewDaysAgo)
    .then(function(res){ return res.json(); })
    .then(function(d){ if (!d || d.error) return; renderDay(d); })
    .catch(function(err){ console.error(err); });
}
function renderDay(d) {
  const label = document.getElementById('dayLabel');
  const summary = document.getElementById('yesterdaySummary');
  const list = document.getElementById('yesterdayFoods');
  const nextBtn = document.getElementById('dayNext');
  if (label) label.textContent = (d.daysAgo === 0 ? '今日' : d.daysAgo === 1 ? '昨日' : d.dateLabel) + 'の記録';
  if (nextBtn) nextBtn.style.visibility = (d.daysAgo === 0 ? 'hidden' : 'visible');
  if (!d.foods || d.foods.length === 0) {
    if (summary) summary.textContent = '';
    if (list) list.innerHTML = '<div class="food-empty">この日の記録はありません</div>';
    return;
  }
  if (summary) summary.textContent = '合計 ' + Math.round(d.totalCalorie) + 'kcal ／ P:' + d.totalP.toFixed(1) + 'g F:' + d.totalF.toFixed(1) + 'g C:' + d.totalC.toFixed(1) + 'g';
  if (list) list.innerHTML = d.foods.map(function(f){ return '<div class="food-item"><div class="food-time">' + f.time + '</div><div><span class="food-meal">' + f.mealType + '</span> <span class="food-menu">' + f.menu + '</span></div><div class="food-pfc">P:' + f.protein + 'g F:' + f.fat + 'g C:' + f.carbohydrate + 'g ' + f.calorie + 'kcal</div></div>'; }).join('');
}
function logFood(i) {
  const item = (window.__recent || [])[i];
  if (!item) return;
  const food = Object.assign({}, item, { daysAgo: recDay, mealType: recMeal || null });
  const where = (recDay === 1 ? '昨日' : '今日') + (recMeal ? 'の' + recMeal.replace('食', '') : '');
  showToast(item.menu + ' を' + where + 'に記録 ✨', 'success');
  postToGas({ action: 'logFood', uid: lineUserId, food: food })
    .then(function(){ setTimeout(function(){ loadData(); }, 800); });
}
let recDay = 0;
let recMeal = '';
function setRecDay(d, btn) {
  recDay = d;
  document.querySelectorAll('.rec-day').forEach(function(b){ b.style.background = '#fff'; b.style.color = '#5BB9CD'; });
  btn.style.background = '#5BB9CD'; btn.style.color = '#fff';
}
function setRecMeal(m, btn) {
  recMeal = m;
  document.querySelectorAll('.rec-meal').forEach(function(b){ b.style.background = '#fff'; b.style.color = '#DB444C'; });
  btn.style.background = '#DB444C'; btn.style.color = '#fff';
}
function initRecDefaults() {
  const h = new Date().getHours();
  let m = '昼食';
  if (h < 10) m = '朝食'; else if (h < 15) m = '昼食'; else if (h < 21) m = '夕食'; else m = '間食';
  recMeal = m;
  document.querySelectorAll('.rec-meal').forEach(function(b){
    if (b.getAttribute('data-meal') === m) { b.style.background = '#DB444C'; b.style.color = '#fff'; }
  });
}
function addMenu() {
  const input = document.getElementById('newMenuInput');
  const name = (input.value || '').trim();
  if (!name) { showToast('メニュー名を入れてください', 'error'); return; }
  showToast('AIが計算中...', 'info');
  input.value = '';
  postToGas({ action: 'addMenu', uid: lineUserId, menuName: name })
    .then(function(){ setTimeout(function(){ loadData(); }, 1800); });
}
