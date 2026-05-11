const GAS_URL = 'https://script.google.com/macros/s/AKfycbxwczCM82WBjyjURd6D6Dn66mtLb9oUVWiWxQrJx4IhcWPnlMlC3nRZoQdhGXK1K09m/exec';

const urlParams = new URLSearchParams(window.location.search);
const lineUserId = urlParams.get('uid') || '';

let myData = null;
let weightChart = null;

window.addEventListener('DOMContentLoaded', () => {
  setGreeting();
  loadData();
  setupWeightInput();
});

function setGreeting() {
  const hour = new Date().getHours();
  let text = 'おはようございます';
  
  if (hour >= 11 && hour < 15) {
    text = 'こんにちは';
  } else if (hour >= 15 && hour < 18) {
    text = 'お疲れ様です';
  } else if (hour >= 18 || hour < 5) {
    text = 'こんばんは';
  }
  
  document.getElementById('greetingText').textContent = text;
}

function setupWeightInput() {
  const input = document.getElementById('weightInput');
  
  // タップしたら空欄にする
  input.addEventListener('focus', () => {
    input.value = '';
  });
  
  // フォーカス外れた時、空欄なら前回値に戻す
  input.addEventListener('blur', () => {
    if (input.value === '' && myData && myData.member) {
      input.value = myData.member.currentWeight || 70.0;
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
      
      // URLハッシュでセクションジャンプ
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
    
    if (hash === '#weight') {
      targetEl = document.querySelector('.weight-card');
    } else if (hash === '#food') {
      targetEl = document.querySelector('.food-card');
    } else if (hash === '#water') {
      targetEl = document.querySelector('.water-card');
    } else if (hash === '#cheat') {
      targetEl = document.querySelector('.cheat-card');
    } else if (hash === '#recommend') {
      targetEl = document.querySelector('.recommend-card');
    }
    
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // ハイライトアニメ
      targetEl.style.transition = 'transform 0.3s ease';
      targetEl.style.transform = 'scale(1.02)';
      setTimeout(() => {
        targetEl.style.transform = 'scale(1)';
      }, 300);
    }
  }, 300);
}

function renderPage(data) {
  const m = data.member;
  const t = data.today;
  
  document.getElementById('nickname').textContent = m.nickname || 'ヨシ';
  
  // 体重入力欄: placeholder で前回値を薄く表示
  const weightInput = document.getElementById('weightInput');
  weightInput.placeholder = (m.currentWeight || 70.0).toFixed(1);
  weightInput.value = m.currentWeight || 70.0;
  
  document.getElementById('targetWeight').textContent = m.targetWeight || '--';
  
  if (data.weightHistory && data.weightHistory.length > 0) {
    const lastWeight = data.weightHistory[data.weightHistory.length - 1].weight;
    document.getElementById('weightInfo').textContent = `前回の体重: ${lastWeight}kg`;
    
    const diffEl = document.getElementById('weightDiff');
    const goalDiff = (m.currentWeight - m.targetWeight).toFixed(1);
    diffEl.textContent = goalDiff > 0 ? `あと -${goalDiff}kg` : `達成`;
  }
  
  drawWeightChart(data.weightHistory);
  renderFoodList(t.foods);
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
  
  if (weightChart) {
    weightChart.destroy();
  }
  
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
        label: '体重',
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
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: false,
          grid: { color: 'rgba(165, 200, 235, 0.15)' },
          ticks: { font: { size: 10 }, color: '#8FA8BD' }
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
      setTimeout(() => loadData(), 1000);
    });
}

function addWater(ml) {
  showToast(`水分 ${ml}ml 追加 💧`, 'success');
  
  postToGas({ action: 'saveWater', uid: lineUserId, ml: ml })
    .then(() => {
      setTimeout(() => loadData(), 800);
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
  window.location.href = `profile.html?uid=${lineUserId}`;
}

function showGoal() {
  window.location.href = `profile.html?uid=${lineUserId}#goal`;
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
      showToast('退会処理が完了しました', 'success');
    });
}

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

function showError(message) {
  document.getElementById('errorText').textContent = message;
  document.getElementById('errorMessage').style.display = 'block';
  document.getElementById('loading').style.display = 'none';
}

function hideError() {
  document.getElementById('errorMessage').style.display = 'none';
}
