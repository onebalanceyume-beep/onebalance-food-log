// ============================================
// ONE BALANCE マイページ
// ============================================

// GAS APIのURL(ヨシさんのデプロイURL)
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxwczCM82WBjyjURd6D6Dn66mtLb9oUVWiWxQrJx4IhcWPnlMlC3nRZoQdhGXK1K09m/exec';

// URLパラメータからLINE User ID取得
const urlParams = new URLSearchParams(window.location.search);
const lineUserId = urlParams.get('uid') || '';

let myData = null;
let weightChart = null;

window.addEventListener('DOMContentLoaded', () => {
  setGreeting();
  loadData();
});

function setGreeting() {
  const hour = new Date().getHours();
  let icon = '🌅';
  let text = 'おはようございます';
  
  if (hour >= 11 && hour < 15) {
    icon = '☀️';
    text = 'こんにちは';
  } else if (hour >= 15 && hour < 18) {
    icon = '🌇';
    text = 'お疲れ様です';
  } else if (hour >= 18 || hour < 5) {
    icon = '🌙';
    text = 'こんばんは';
  }
  
  document.getElementById('greetingIcon').textContent = icon;
  document.getElementById('greetingText').textContent = text;
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
    })
    .catch(err => {
      showError('読み込みに失敗しました');
      console.error(err);
    });
}

function renderPage(data) {
  const m = data.member;
  const t = data.today;
  
  document.getElementById('nickname').textContent = m.nickname || 'ヨシ';
  document.getElementById('weightInput').value = m.currentWeight || 70.0;
  document.getElementById('targetWeight').textContent = m.targetWeight || '--';
  
  if (data.weightHistory && data.weightHistory.length > 0) {
    const lastWeight = data.weightHistory[data.weightHistory.length - 1].weight;
    document.getElementById('weightInfo').textContent = `昨日の体重: ${lastWeight}kg`;
    
    const diffEl = document.getElementById('weightDiff');
    const goalDiff = (m.currentWeight - m.targetWeight).toFixed(1);
    diffEl.textContent = goalDiff > 0 ? `あと -${goalDiff}kg` : `達成`;
  }
  
  drawWeightChart(data.weightHistory);
  renderFoodList(t.foods);
  renderPFC(t, m);
  renderWater(t.water, m.targetWater);
  
  document.getElementById('streakDays').textContent = data.streakDays || 0;
  document.getElementById('cheatDay').textContent = m.cheatDay || '--';
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
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#8B8580';
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
        borderColor: '#C9656B',
        backgroundColor: 'rgba(201, 101, 107, 0.08)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#C9656B',
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
          grid: { color: '#F0EBE5' },
          ticks: { font: { size: 10 }, color: '#8B8580' }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 10 }, color: '#8B8580', maxTicksLimit: 7 }
        }
      }
    }
  });
}

function adjustWeight(delta) {
  const input = document.getElementById('weightInput');
  let val = parseFloat(input.value) || 0;
  val = Math.round((val + delta) * 10) / 10;
  if (val < 20) val = 20;
  if (val > 200) val = 200;
  input.value = val.toFixed(1);
}

function saveWeightHandler() {
  const weight = parseFloat(document.getElementById('weightInput').value);
  
  if (!weight || weight < 20 || weight > 200) {
    showToast('正しい体重を入力してください', 'error');
    return;
  }
  
  postToGas({ action: 'saveWeight', uid: lineUserId, weight: weight })
    .then(result => {
      if (result.success) {
        showToast('体重を記録しました', 'success');
        setTimeout(() => loadData(), 1000);
      } else {
        showToast(result.error || 'エラーが発生しました', 'error');
      }
    });
}

function addWater(ml) {
  postToGas({ action: 'saveWater', uid: lineUserId, ml: ml })
    .then(result => {
      if (result.success) {
        showToast(`水分 ${ml}ml 追加しました`, 'success');
        setTimeout(() => loadData(), 500);
      } else {
        showToast(result.error || 'エラーが発生しました', 'error');
      }
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
  alert('プロフィール変更機能は次のバージョンで実装予定です');
}

function showGoal() {
  alert('目標体重変更機能は次のバージョンで実装予定です');
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
  
  const reasonMap = {
    '1': '効果が感じられなかった',
    '2': '価格が合わなかった',
    '3': '時間がなくなった',
    '4': '他のサービスに移った',
    '5': 'その他'
  };
  
  const reasonText = reasonMap[reason] || 'その他';
  const satisfaction = prompt('満足度を1〜5で教えてください(任意・スキップOK)') || '';
  const comment = prompt('最後に、ご意見・ご感想があれば(任意・スキップOK)') || '';
  
  postToGas({ action: 'withdraw', uid: lineUserId, reason: reasonText, satisfaction: satisfaction, comment: comment })
    .then(result => {
      if (result.success) {
        showToast('退会処理が完了しました', 'success');
      } else {
        showToast(result.error || 'エラーが発生しました', 'error');
      }
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
