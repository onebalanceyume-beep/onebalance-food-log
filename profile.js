const GAS_URL = 'https://script.google.com/macros/s/AKfycbxwczCM82WBjyjURd6D6Dn66mtLb9oUVWiWxQrJx4IhcWPnlMlC3nRZoQdhGXK1K09m/exec';

const urlParams = new URLSearchParams(window.location.search);
const lineUserId = urlParams.get('uid') || '';

window.addEventListener('DOMContentLoaded', () => {
  loadProfile();
});

function loadProfile() {
  if (!lineUserId) {
    showToast('LINEから開いてください', 'error');
    return;
  }
  
  fetch(`${GAS_URL}?action=getProfile&uid=${lineUserId}`)
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        showToast(data.error, 'error');
        return;
      }
      
      const p = data.profile;
      document.getElementById('nickname').value = p.nickname || '';
      document.getElementById('age').value = p.age || '';
      document.getElementById('gender').value = p.gender || '';
      document.getElementById('height').value = p.height || '';
      document.getElementById('currentWeight').value = p.currentWeight || '';
      document.getElementById('targetWeight').value = p.targetWeight || '';
      document.getElementById('targetDate').value = p.targetDate || '';
      document.getElementById('activity').value = p.activity || '';
      document.getElementById('cheatDay').value = p.cheatDay || '';
      document.getElementById('allergy').value = p.allergy || '';
      
      document.getElementById('loading').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      
      if (window.location.hash === '#goal') {
        setTimeout(() => {
          document.getElementById('goal').scrollIntoView({ behavior: 'smooth' });
        }, 300);
      }
    })
    .catch(err => {
      showToast('読み込みに失敗しました', 'error');
      console.error(err);
    });
}

function saveProfile() {
  const profile = {
    nickname: document.getElementById('nickname').value,
    age: parseInt(document.getElementById('age').value) || '',
    gender: document.getElementById('gender').value,
    height: parseFloat(document.getElementById('height').value) || '',
    currentWeight: parseFloat(document.getElementById('currentWeight').value) || '',
    targetWeight: parseFloat(document.getElementById('targetWeight').value) || '',
    targetDate: document.getElementById('targetDate').value,
    activity: document.getElementById('activity').value,
    cheatDay: document.getElementById('cheatDay').value,
    allergy: document.getElementById('allergy').value
  };
  
  if (!profile.nickname) {
    showToast('呼び方は必須です', 'error');
    return;
  }
  
  showToast('保存中...', 'info');
  
  fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'updateProfile',
      uid: lineUserId,
      profile: profile
    })
  })
  .then(() => {
    showToast('プロフィールを更新しました ✨', 'success');
    setTimeout(() => {
      goBack();
    }, 1500);
  })
  .catch(err => {
    showToast('保存に失敗しました', 'error');
    console.error(err);
  });
}

function goBack() {
  window.location.href = `index.html?uid=${lineUserId}`;
}

function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}
