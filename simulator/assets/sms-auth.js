/* =====================================================================
   SMS認証シミュレーター レッスンエンジン (sms-auth.js)
   ===================================================================== */

// =====================================================================
// A. SMS認証レッスン定義データ（SMS_AUTH_LESSON）
// =====================================================================
const SMS_AUTH_LESSON = {
  id: 'sms_auth',
  title: 'SMS認証（ショートメッセージでの本人確認）',
  targetApp: 'sms',
  expectedCode: '739204',
  steps: [
    {
      title: '1. 携帯電話番号のパーツを枠にセットしましょう',
      desc: '下の「共通パーツトレイ」にある「090-****-5678」を押すか、スマホの携帯電話番号欄へドラッグして入れてください。',
      hint: '右下の「090-****-5678」ボタンを1回押すだけで、スマホ内の携帯電話番号欄に自動でセットされます。',
      safeScreen: 'browser',
      tokens: [
        { id: 'tok_phone', label: '090-****-5678', value: '090-****-5678', targetField: 'phone', icon: '📱' }
      ]
    },
    {
      title: '2. 「認証番号を送信」を押して確認画面で「はい」を選びましょう',
      desc: '携帯電話番号が入ったら、スマホ内の緑色の「認証番号を送信」ボタンを押し、確認画面で「はい」を押してください。',
      hint: 'スマホ画面の「認証番号を送信」を押すと「送信しますか？」と出るので「はい」を押します。',
      safeScreen: 'browser',
      tokens: [
        { id: 'tok_phone', label: '090-****-5678', value: '090-****-5678', targetField: 'phone', icon: '📱' }
      ]
    },
    {
      title: '3. 元の画面を閉じずに「メッセージ」アプリを開きましょう',
      desc: '下の「○ ホーム」ボタンを押してホーム画面へ戻り、赤い「新着1」が付いた緑色の「💬 メッセージ」アプリを開いてください。',
      hint: 'スマホ一番下の中央にある青い「○ ホーム」ボタンを押し、次に緑色の「💬 メッセージ」アイコンを押します。会員サイトは消えずに待機しています。',
      safeScreen: 'home',
      tokens: []
    },
    {
      title: '4. 届いた「0005-9999（本人確認センター）」のトークを開きましょう',
      desc: 'メッセージのトーク一覧にある「0005-9999（本人確認センター）」をタップして会話画面を開いてください。',
      hint: '未読バッジ「1」が付いた「0005-9999」の行を押すと、吹き出しのメッセージが開きます。',
      safeScreen: 'sms',
      tokens: []
    },
    {
      title: '5. 吹き出し内の認証番号「739204」を長押ししてコピーしましょう',
      desc: '相手から届いた吹き出しの中にある「739204」を1秒間長押し（または下のコピーボタン）して、一時メモにコピーしてください。',
      hint: '吹き出し内の「739204」の数字を押したまま1秒待つか、すぐ下の「📋 長押ししてコピー」ボタンを押すと一時メモに保存されます。',
      safeScreen: 'sms',
      tokens: []
    },
    {
      title: '6. 「□ 履歴」ボタンから元の「会員サイト」へ戻りましょう',
      desc: '一番下の右下にある「□ 履歴」ボタンを押し、待機中の「🌐 会員サイト」カードを選んで元の画面に戻ってください。',
      hint: 'スマホ一番下の右端「□ 履歴」を押すと、開いているアプリ一覧が出ます。「🌐 会員サイト」を押して戻りましょう。',
      safeScreen: 'recents',
      tokens: []
    },
    {
      title: '7. コピーした番号を貼り付けて「認証する」を押しましょう',
      desc: 'SMS認証番号欄の「📋 一時メモから貼り付け」ボタンを押し、「認証する」を押して完了です！',
      hint: 'スマホ内の「📋 一時メモから貼り付け」ボタンを押すと「739204」が入ります。最後に緑の「認証する」ボタンを押してください。',
      safeScreen: 'browser',
      tokens: []
    }
  ]
};

// =====================================================================
// B. アプリケーション一元状態（AppState）
// =====================================================================
const AppState = {
  theme: 'light',
  fontLarge: false,
  stepIndex: 0,
  completed: false,
  hintVisible: false,

  // 画面ルーティング状態
  activeScreen: 'browser', // 'home' | 'drawer' | 'browser' | 'sms' | 'recents'
  dialogOpen: false,

  // バックグラウンド待機中のアプリ一覧（アプリ間往復の核）
  runningApps: ['browser'],

  // 共通一時メモ（クリップボード）
  clipboardText: '',

  // アプリ内サブビュー状態
  smsViewMode: 'list', // 'list' | 'detail'
  newMessageArrived: false,

  // フォーム入力状態
  formValues: {
    phone: '',
    code: '',
    codeSent: false
  }
};

// =====================================================================
// C. 排他的画面ルーティングエンジン（ScreenRouter）
//    ※ 遷移元および非アクティブ要素を必ず display: none & aria-hidden="true" にする
// =====================================================================
const ScreenRouter = {
  SCREEN_DOM_IDS: {
    home: 'screenHome',
    drawer: 'screenDrawer',
    browser: 'screenBrowser',
    sms: 'screenSms',
    recents: 'screenRecents'
  },

  navigate(targetKey, animType = 'zoom') {
    try {
      if (!this.SCREEN_DOM_IDS[targetKey]) return;

      // 確認ダイアログが開いていたら必ず閉じる
      ConfirmDialogController.close();

      AppState.activeScreen = targetKey;

      // すべての画面を走査し、非アクティブ画面は即座に display: none & aria-hidden="true"
      Object.entries(this.SCREEN_DOM_IDS).forEach(([key, domId]) => {
        const el = document.getElementById(domId);
        if (!el) return;
        el.classList.remove('anim-zoom', 'anim-slide-up');
        if (key !== targetKey) {
          el.style.display = 'none';
          el.setAttribute('aria-hidden', 'true');
        }
      });

      // アクティブ画面のみ表示
      const activeEl = document.getElementById(this.SCREEN_DOM_IDS[targetKey]);
      if (activeEl) {
        activeEl.style.display = 'flex';
        activeEl.setAttribute('aria-hidden', 'false');
        void activeEl.offsetWidth;
        activeEl.classList.add(animType === 'slide' ? 'anim-slide-up' : 'anim-zoom');
      }

      // 画面ごとの固有描画更新
      if (targetKey === 'home') {
        this.updateHomeBadges();
      } else if (targetKey === 'browser') {
        BrowserAppController.render();
      } else if (targetKey === 'sms') {
        SmsAppController.render();
      } else if (targetKey === 'recents') {
        this.renderRecents();
      }

      // ステップ進行チェック＆立体階層マップ更新
      LessonEngine.evaluateNavigationStep(targetKey);
      LayerMapEngine.render();
    } catch (err) {
      console.error('画面遷移エラー:', err);
    }
  },

  openApp(appId) {
    if (!AppState.runningApps.includes(appId)) {
      AppState.runningApps.push(appId);
    } else {
      // 履歴順序を最新へ移動
      AppState.runningApps = [...AppState.runningApps.filter(id => id !== appId), appId];
    }
    this.navigate(appId, 'zoom');
  },

  pressHome() {
    this.navigate('home', 'zoom');
  },

  pressBack() {
    if (AppState.dialogOpen) {
      ConfirmDialogController.reject();
      return;
    }
    if (AppState.activeScreen === 'sms' && AppState.smsViewMode === 'detail') {
      SmsAppController.backToList();
      return;
    }
    if (AppState.activeScreen !== 'home') {
      this.navigate('home', 'zoom');
    }
  },

  pressRecents() {
    if (AppState.activeScreen === 'recents') {
      const lastApp = AppState.runningApps[AppState.runningApps.length - 1] || 'browser';
      this.navigate(lastApp, 'zoom');
    } else {
      this.navigate('recents', 'slide');
    }
  },

  updateHomeBadges() {
    const browserBadge = document.getElementById('badgeHomeBrowser');
    const smsBadge = document.getElementById('badgeHomeSms');

    // 待機中バッジ（会員サイトがバックグラウンドにある場合）
    const isBrowserWaiting = AppState.runningApps.includes('browser') && AppState.activeScreen !== 'browser';
    browserBadge.style.display = isBrowserWaiting ? 'inline-block' : 'none';
    browserBadge.setAttribute('aria-hidden', isBrowserWaiting ? 'false' : 'true');

    // SMS新着バッジ
    const showSmsNew = AppState.newMessageArrived;
    smsBadge.style.display = showSmsNew ? 'inline-block' : 'none';
    smsBadge.setAttribute('aria-hidden', showSmsNew ? 'false' : 'true');
  },

  renderRecents() {
    const container = document.getElementById('recentsCardsContainer');
    const appMeta = {
      browser: {
        icon: '🌐',
        name: '会員サイト（本人確認画面）',
        color: '#0067C0',
        status: AppState.formValues.codeSent ? 'SMS認証番号入力待ち（待機中）' : '入力途中（待機中）'
      },
      sms: {
        icon: '💬',
        name: 'メッセージ（SMS受信箱）',
        color: '#16A34A',
        status: AppState.clipboardText ? '認証番号をコピー済み' : '受信一覧表示中'
      }
    };

    const list = [...AppState.runningApps].reverse();
    container.innerHTML = list.map(appId => {
      const meta = appMeta[appId];
      if (!meta) return '';
      const isHighlight = appId === 'browser' && AppState.stepIndex >= 5;
      return `
        <button type="button" onclick="ScreenRouter.openApp('${appId}')"
          class="w-full p-3 rounded-[10px] text-left cursor-pointer transition flex items-center justify-between ${
            isHighlight
              ? 'bg-[#DCFCE7] text-[#0F172A] border-2 border-[#22C55E]'
              : 'bg-white text-[#0F172A] border border-[#CBD5E1] hover:bg-[#F8FAFC]'
          }">
          <div class="flex items-center gap-2.5">
            <span class="w-10 h-10 rounded-[8px] text-white flex items-center justify-center text-lg shrink-0"
              style="background-color: ${meta.color};">${meta.icon}</span>
            <div>
              <div class="font-bold text-xs">${meta.name}</div>
              <div class="text-[11px] text-[#475569] mt-0.5">${meta.status}</div>
            </div>
          </div>
          <span class="px-2 py-1 rounded bg-[#0067C0] text-white text-[11px] font-bold shrink-0">
            この画面へ戻る
          </span>
        </button>
      `;
    }).join('');
  },

  showInfoToast(msg) {
    const box = document.getElementById('homeToastBox');
    if (!box) return;
    box.textContent = msg;
    box.style.display = 'block';
    box.setAttribute('aria-hidden', 'false');
    setTimeout(() => {
      box.style.display = 'none';
      box.setAttribute('aria-hidden', 'true');
    }, 2600);
  }
};

// =====================================================================
// D. 確認ダイアログコントローラー（排他的表示）
// =====================================================================
const ConfirmDialogController = {
  onAcceptCallback: null,

  open(title, message, onAccept) {
    AppState.dialogOpen = true;
    this.onAcceptCallback = onAccept;

    // 背後のスクリーンを完全に非表示（display: none & aria-hidden="true"）にして誤タップ・透け防止
    Object.values(ScreenRouter.SCREEN_DOM_IDS).forEach(domId => {
      const el = document.getElementById(domId);
      if (el) {
        el.style.display = 'none';
        el.setAttribute('aria-hidden', 'true');
      }
    });

    document.getElementById('confirmDialogTitle').textContent = title;
    document.getElementById('confirmDialogMessage').textContent = message;

    const dialogEl = document.getElementById('modalConfirmDialog');
    dialogEl.style.display = 'flex';
    dialogEl.setAttribute('aria-hidden', 'false');
  },

  close() {
    AppState.dialogOpen = false;
    this.onAcceptCallback = null;
    const dialogEl = document.getElementById('modalConfirmDialog');
    if (dialogEl) {
      dialogEl.style.display = 'none';
      dialogEl.setAttribute('aria-hidden', 'true');
    }
  },

  accept() {
    const cb = this.onAcceptCallback;
    this.close();
    ScreenRouter.navigate(AppState.activeScreen, 'zoom');
    if (typeof cb === 'function') cb();
  },

  reject() {
    this.close();
    ScreenRouter.navigate(AppState.activeScreen, 'zoom');
  }
};

// =====================================================================
// E. 共通一時メモ（クリップボード）エンジン（ClipboardEngine）
// =====================================================================
const ClipboardEngine = {
  holdInterval: null,

  startHold(valueToCopy, progressBarId) {
    this.cancelHold(progressBarId);
    const barEl = document.getElementById(progressBarId);
    let elapsed = 0;
    const duration = 900; // 約1秒ホールド

    this.holdInterval = setInterval(() => {
      elapsed += 50;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      if (barEl) barEl.style.width = `${pct}%`;
      if (elapsed >= duration) {
        this.cancelHold(progressBarId);
        this.copyImmediate(valueToCopy);
      }
    }, 50);
  },

  cancelHold(progressBarId) {
    if (this.holdInterval) {
      clearInterval(this.holdInterval);
      this.holdInterval = null;
    }
    const barEl = document.getElementById(progressBarId);
    if (barEl) barEl.style.width = '0%';
  },

  copyImmediate(valueToCopy) {
    AppState.clipboardText = valueToCopy;
    this.renderUI();
    LessonEngine.onClipboardCopied(valueToCopy);
  },

  clear() {
    AppState.clipboardText = '';
    this.renderUI();
  },

  renderUI() {
    const phoneBadge = document.getElementById('phoneStatusClipboard');
    const statusText = document.getElementById('clipboardStatusText');
    const valueDisp = document.getElementById('clipboardValueDisplay');
    const monitorBox = document.getElementById('clipboardMonitorBox');

    if (AppState.clipboardText) {
      phoneBadge.textContent = `📋 一時メモ：${AppState.clipboardText}`;
      phoneBadge.className = 'px-2 py-0.5 rounded-full bg-[#16A34A] text-white text-[10px] font-bold flex items-center gap-1 max-w-[185px] truncate';

      statusText.textContent = '✓ コピー済み（貼り付けできます）';
      statusText.style.color = 'var(--success-fg)';
      valueDisp.textContent = AppState.clipboardText;
      monitorBox.style.backgroundColor = 'var(--success-bg)';
      monitorBox.style.borderColor = 'var(--success-border)';
    } else {
      phoneBadge.textContent = '📋 一時メモ：なし';
      phoneBadge.className = 'px-2 py-0.5 rounded-full bg-[#1E293B] text-[#94A3B8] text-[10px] font-bold flex items-center gap-1 max-w-[185px] truncate';

      statusText.textContent = 'まだ何もコピーされていません';
      statusText.style.color = 'var(--text-muted)';
      valueDisp.textContent = '---';
      monitorBox.style.backgroundColor = 'var(--bg-card-sub)';
      monitorBox.style.borderColor = 'var(--border-subtle)';
    }
  }
};

// =====================================================================
// F. 共通パーツ配置エンジン（TokenTrayEngine）
// =====================================================================
const TokenTrayEngine = {
  render() {
    const container = document.getElementById('tokenTrayContainer');
    const step = SMS_AUTH_LESSON.steps[AppState.stepIndex];
    const tokens = (step && step.tokens) ? step.tokens : [];

    if (AppState.completed || tokens.length === 0) {
      container.innerHTML = `
        <div class="w-full p-2.5 rounded-[8px] border text-xs"
          style="background-color: var(--bg-card-sub); border-color: var(--border-subtle); color: var(--text-muted);">
          現在のステップではパーツ配置は不要です。スマホ画面の案内に沿って操作してください。
        </div>
      `;
      return;
    }

    container.innerHTML = tokens.map(tok => `
      <button type="button"
        draggable="true"
        ondragstart="TokenTrayEngine.onDragStart(event, '${tok.id}')"
        onclick="TokenTrayEngine.applyToken('${tok.id}')"
        class="px-3.5 py-2.5 rounded-[8px] border-2 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition shadow-2xs"
        style="background-color: var(--sms-tint); border-color: var(--sms-primary); color: var(--text-primary);">
        <span>${tok.icon}</span>
        <span>${tok.label}</span>
        <span class="text-[11px] px-1.5 py-0.5 rounded bg-white/85 text-[#15803D]">押して入力</span>
      </button>
    `).join('');
  },

  onDragStart(event, tokenId) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', tokenId);
    }
  },

  onDropToField(event, expectedField) {
    event.preventDefault();
    event.currentTarget.classList.remove('drop-target-active');
    const tokenId = event.dataTransfer ? event.dataTransfer.getData('text/plain') : '';
    if (tokenId) {
      this.applyToken(tokenId, expectedField);
    }
  },

  applyToken(tokenId, expectedField = null) {
    const step = SMS_AUTH_LESSON.steps[AppState.stepIndex];
    const tok = (step.tokens || []).find(t => t.id === tokenId);
    if (!tok) return;

    if (expectedField && tok.targetField !== expectedField) return;

    // スマホが会員サイト以外の画面にいたら自動で会員サイトを表示
    if (AppState.activeScreen !== 'browser') {
      ScreenRouter.openApp('browser');
    }

    AppState.formValues[tok.targetField] = tok.value;
    BrowserAppController.render();
    LessonEngine.onTokenPlaced(tok.targetField);
  }
};

// =====================================================================
// G. 個別アプリコントローラー（会員サイト / メッセージ）
// =====================================================================
const BrowserAppController = {
  render() {
    const container = document.getElementById('browserContentArea');

    // 完了画面表示
    if (AppState.completed) {
      container.innerHTML = `
        <div class="flex-1 flex flex-col items-center justify-center text-center p-2">
          <div class="w-16 h-16 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center text-3xl font-bold mb-3">
            ✓
          </div>
          <h3 class="font-bold text-base text-[#15803D] mb-1">SMS認証が完了しました！</h3>
          <p class="text-xs text-[#334155] leading-relaxed mb-4">
            元の画面を閉じずに「メッセージ」アプリで6桁の番号をコピーし、「□ 履歴」ボタンから戻って貼り付ける流れを体験できました。
          </p>
          <div class="w-full p-3 rounded-[8px] bg-[#F8FAFC] border border-[#CBD5E1] text-left text-xs space-y-1 mb-4">
            <div class="font-bold text-[#0F172A]">今回のポイント振り返り：</div>
            <div>① メッセージアプリを開いても元の画面は消えない</div>
            <div>② 長押しコピーで一時メモに6桁番号を覚える</div>
            <div>③ 「□ 履歴」から元の画面へ確実に帰れる</div>
          </div>
          <button type="button" onclick="resetCurrentLesson()"
            class="w-full py-2.5 rounded-[8px] bg-[#16A34A] text-white font-bold text-xs cursor-pointer">
            もう一度最初から練習する
          </button>
        </div>
      `;
      return;
    }

    const phoneVal = AppState.formValues.phone;
    const codeSent = AppState.formValues.codeSent;
    const codeVal = AppState.formValues.code;

    if (!codeSent) {
      container.innerHTML = `
        <div>
          <div class="text-xs font-bold text-[#15803D] mb-1">ステップ 1/2：ショートメッセージ送信</div>
          <h3 class="font-bold text-sm text-[#0F172A] mb-2">携帯電話番号での本人確認</h3>
          <p class="text-xs text-[#475569] leading-relaxed mb-3">
            携帯電話のショートメッセージ（SMS）宛に6桁の認証番号をお送りします。
          </p>

          <label class="block text-xs font-bold text-[#334155] mb-1">携帯電話番号</label>
          <div
            ondragover="event.preventDefault(); this.classList.add('drop-target-active');"
            ondragleave="this.classList.remove('drop-target-active');"
            ondrop="TokenTrayEngine.onDropToField(event, 'phone')"
            onclick="if(!AppState.formValues.phone) TokenTrayEngine.applyToken('tok_phone', 'phone')"
            class="w-full p-3 rounded-[8px] border-2 border-dashed text-xs font-bold cursor-pointer transition ${
              phoneVal
                ? 'bg-[#DCFCE7] border-[#16A34A] text-[#0F172A]'
                : 'bg-[#F8FAFC] border-[#94A3B8] text-[#64748B]'
            }">
            ${phoneVal || 'ここに「090-****-5678」を置く（またはタップ）'}
          </div>
        </div>

        <button type="button" onclick="BrowserAppController.requestSendCode()"
          class="w-full py-3 rounded-[8px] font-bold text-xs cursor-pointer transition ${
            phoneVal
              ? 'bg-[#16A34A] hover:bg-[#15803D] text-white'
              : 'bg-[#CBD5E1] text-[#64748B]'
          }">
          認証番号を送信
        </button>
      `;
    } else {
      container.innerHTML = `
        <div>
          <div class="p-2.5 rounded-[8px] bg-[#FEF9C3] border border-[#CA8A04] text-xs text-[#854D0E] font-semibold mb-3">
            💬 <strong>${phoneVal}</strong> 宛にSMSを送信しました。「メッセージ」アプリを開いて6桁の番号を確認してください。
          </div>

          <label class="block text-xs font-bold text-[#334155] mb-1">SMS認証番号（6桁の数字）</label>
          <div onclick="BrowserAppController.pasteFromClipboard()"
            class="w-full p-3 rounded-[8px] border-2 text-center text-lg font-extrabold tracking-[0.2em] cursor-pointer ${
              codeVal
                ? 'bg-[#DCFCE7] border-[#16A34A] text-[#15803D]'
                : 'bg-[#F8FAFC] border-[#94A3B8] text-[#94A3B8]'
            }">
            ${codeVal || '（未入力）'}
          </div>

          <button type="button" onclick="BrowserAppController.pasteFromClipboard()"
            class="mt-2.5 w-full py-2.5 px-3 rounded-[8px] border font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 ${
              AppState.clipboardText
                ? 'bg-[#DCFCE7] border-[#16A34A] text-[#15803D] hover:bg-[#BBF7D0]'
                : 'bg-[#F1F5F9] border-[#CBD5E1] text-[#64748B]'
            }">
            <span>📋 一時メモから貼り付け</span>
          </button>
        </div>

        <button type="button" onclick="BrowserAppController.submitAuthCode()"
          class="w-full py-3 rounded-[8px] font-bold text-xs cursor-pointer ${
            codeVal
              ? 'bg-[#16A34A] hover:bg-[#15803D] text-white'
              : 'bg-[#CBD5E1] text-[#64748B]'
          }">
          認証する
        </button>
      `;
    }
  },

  requestSendCode() {
    const val = AppState.formValues.phone;
    if (!val) return;

    ConfirmDialogController.open(
      'SMS送信の確認',
      `この携帯電話番号（${val}）に認証番号を送信しますか？`,
      () => {
        AppState.formValues.codeSent = true;
        AppState.newMessageArrived = true;
        this.render();
        LessonEngine.advanceStepTo(2);
      }
    );
  },

  pasteFromClipboard() {
    if (!AppState.clipboardText) return;
    AppState.formValues.code = AppState.clipboardText;
    this.render();
  },

  submitAuthCode() {
    if (AppState.formValues.code === SMS_AUTH_LESSON.expectedCode) {
      AppState.completed = true;
      this.render();
      LessonEngine.completeLesson();
    }
  }
};

// メッセージアプリ内部ビュー排他制御
const SmsAppController = {
  render() {
    const listEl = document.getElementById('smsListView');
    const detailEl = document.getElementById('smsDetailView');
    const newItemBtn = document.getElementById('smsNewItemBtn');

    const showNew = AppState.newMessageArrived;
    newItemBtn.style.display = showNew ? 'block' : 'none';
    newItemBtn.setAttribute('aria-hidden', showNew ? 'false' : 'true');

    if (AppState.smsViewMode === 'detail') {
      listEl.style.display = 'none';
      listEl.setAttribute('aria-hidden', 'true');
      detailEl.style.display = 'flex';
      detailEl.setAttribute('aria-hidden', 'false');
    } else {
      detailEl.style.display = 'none';
      detailEl.setAttribute('aria-hidden', 'true');
      listEl.style.display = 'flex';
      listEl.setAttribute('aria-hidden', 'false');
    }
  },

  openDetail() {
    AppState.smsViewMode = 'detail';
    this.render();
    if (AppState.stepIndex === 3) {
      LessonEngine.advanceStepTo(4);
    }
  },

  backToList() {
    AppState.smsViewMode = 'list';
    this.render();
  }
};

// =====================================================================
// H. 共通立体階層マップエンジン（LayerMapEngine）
//    ※ 「会員サイト（待機中）の上に、メッセージアプリが重なっている」状態を可視化
// =====================================================================
const LayerMapEngine = {
  render() {
    const screen = AppState.activeScreen;
    const badge = document.getElementById('layerStatusSummaryBadge');
    const expText = document.getElementById('layerExplanationText');

    const cardBase = document.getElementById('layerCardBase');
    const cardWaiting = document.getElementById('layerCardWaiting');
    const cardOverlay = document.getElementById('layerCardOverlay');

    const pillBase = document.getElementById('layerPillBase');
    const pillWaiting = document.getElementById('layerPillWaiting');
    const pillOverlay = document.getElementById('layerPillOverlay');

    const subBase = document.getElementById('layerSubBase');
    const subWaiting = document.getElementById('layerSubWaiting');
    const subOverlay = document.getElementById('layerSubOverlay');

    // リセット
    [cardBase, cardWaiting, cardOverlay].forEach(c => {
      c.style.backgroundColor = 'var(--bg-card-sub)';
      c.style.borderColor = 'var(--border-subtle)';
    });
    [pillBase, pillWaiting, pillOverlay].forEach(p => {
      p.style.display = 'none';
    });

    const isBrowserWaiting = AppState.runningApps.includes('browser') && screen !== 'browser';

    if (screen === 'browser') {
      badge.textContent = '最前面：🌐 会員サイト';
      expText.textContent = 'いま、机の上に「会員サイト」を広げて入力しています。別のアプリを開いても、この画面は閉じずに机の上で待機します。';
      cardWaiting.style.backgroundColor = 'var(--accent-tint)';
      cardWaiting.style.borderColor = 'var(--accent-primary)';
      pillWaiting.style.display = 'block';
      subWaiting.textContent = '● 現在操作中（最前面）';
      subBase.textContent = '土台の玄関画面';
      subOverlay.textContent = 'まだ開いていません';
    } else if (screen === 'home' || screen === 'drawer') {
      badge.textContent = screen === 'home' ? '最前面：🏠 ホーム画面' : '最前面：🗂️ アプリ一覧';
      expText.textContent = isBrowserWaiting
        ? '「会員サイト」を机の上で待機させたまま、玄関（ホーム／アプリ一覧）へ移動しました。ここからメッセージアプリを重ねて開けます。'
        : 'スマートフォンの基準となる玄関（ホーム／アプリ一覧）です。';

      cardBase.style.backgroundColor = 'var(--accent-tint)';
      cardBase.style.borderColor = 'var(--accent-primary)';
      pillBase.style.display = 'block';
      subBase.textContent = '● 現在表示中';

      if (isBrowserWaiting) {
        cardWaiting.style.backgroundColor = 'var(--waiting-bg)';
        cardWaiting.style.borderColor = 'var(--waiting-border)';
        subWaiting.textContent = '⏸ 入力途中で待機中（消えていません）';
      }
    } else if (screen === 'sms') {
      badge.textContent = '重ね表示：💬 メッセージ（下に会員サイト待機）';
      expText.textContent = '待機中の「会員サイト」の上に、💬 メッセージアプリが重なって開いています！番号をコピーしたら「□ 履歴」ボタンで下の会員サイトへ戻れます。';

      // 待機中の会員サイトを強調
      cardWaiting.style.backgroundColor = 'var(--waiting-bg)';
      cardWaiting.style.borderColor = 'var(--waiting-border)';
      subWaiting.textContent = '⏸ 下の層で待機中（いつでも戻れます）';

      // 上に重なっているメッセージアプリを最前面強調
      cardOverlay.style.backgroundColor = 'var(--sms-tint)';
      cardOverlay.style.borderColor = 'var(--sms-primary)';
      pillOverlay.style.display = 'block';
      subOverlay.textContent = '● 💬 メッセージが上に重なって表示中';
    } else if (screen === 'recents') {
      badge.textContent = '切り替え：□ アプリ履歴一覧';
      expText.textContent = '机の上に開いている「会員サイト」と「メッセージアプリ」を並べて見比べています。戻りたい方のカードを押してください。';
      cardWaiting.style.backgroundColor = 'var(--waiting-bg)';
      cardWaiting.style.borderColor = 'var(--waiting-border)';
      subWaiting.textContent = '↑ 履歴カードから選択可能';
    }
  }
};

// =====================================================================
// I. レッスン進行・ガイド管理エンジン（LessonEngine）
// =====================================================================
const LessonEngine = {
  reset() {
    AppState.stepIndex = 0;
    AppState.completed = false;
    AppState.hintVisible = false;
    AppState.runningApps = ['browser'];
    AppState.smsViewMode = 'list';
    AppState.newMessageArrived = false;
    AppState.formValues = {
      phone: '',
      code: '',
      codeSent: false
    };
    ClipboardEngine.clear();
    this.renderStepGuide();
    TokenTrayEngine.render();
    ScreenRouter.navigate('browser', 'zoom');
  },

  advanceStepTo(nextIndex) {
    if (nextIndex > AppState.stepIndex && nextIndex < SMS_AUTH_LESSON.steps.length) {
      AppState.stepIndex = nextIndex;
      this.renderStepGuide();
      TokenTrayEngine.render();
    }
  },

  completeLesson() {
    AppState.completed = true;
    this.renderStepGuide();
    TokenTrayEngine.render();
    LayerMapEngine.render();
  },

  onTokenPlaced(targetField) {
    if (targetField === 'phone' && AppState.stepIndex === 0) {
      this.advanceStepTo(1);
    }
  },

  evaluateNavigationStep(screenKey) {
    if (AppState.completed) return;

    // ステップ3（index 2）：メッセージアプリを開いたらステップ4（index 3）へ
    if (AppState.stepIndex === 2 && screenKey === SMS_AUTH_LESSON.targetApp) {
      this.advanceStepTo(3);
    }
    // ステップ6（index 5）：履歴から会員サイトへ戻ったらステップ7（index 6）へ
    if (AppState.stepIndex === 5 && screenKey === 'browser' && AppState.clipboardText === SMS_AUTH_LESSON.expectedCode) {
      this.advanceStepTo(6);
    }
  },

  onClipboardCopied(copiedText) {
    if (AppState.completed) return;
    if (AppState.stepIndex === 4 && copiedText === SMS_AUTH_LESSON.expectedCode) {
      this.advanceStepTo(5);
    }
  },

  renderStepGuide() {
    const total = SMS_AUTH_LESSON.steps.length;
    const step = SMS_AUTH_LESSON.steps[AppState.stepIndex] || SMS_AUTH_LESSON.steps[total - 1];

    document.getElementById('lessonTitleDisplay').textContent = SMS_AUTH_LESSON.title;
    const counterEl = document.getElementById('lessonStepCounter');

    if (AppState.completed) {
      counterEl.textContent = '🎉 全ステップ達成！';
      counterEl.style.backgroundColor = 'var(--success-fg)';
      counterEl.style.color = '#FFFFFF';
      document.getElementById('stepInstructionTitle').textContent = 'おめでとうございます！SMS認証の操作をマスターしました';
      document.getElementById('stepInstructionDesc').textContent = '「↺ 最初からやり直す」を押すと、何度でも繰り返し練習できます。';
    } else {
      counterEl.textContent = `ステップ ${AppState.stepIndex + 1} / ${total}`;
      counterEl.style.backgroundColor = 'var(--sms-primary)';
      counterEl.style.color = '#FFFFFF';
      document.getElementById('stepInstructionTitle').textContent = step.title;
      document.getElementById('stepInstructionDesc').textContent = step.desc;
    }

    // ヒントパネルの排他的表示制御
    const hintPanel = document.getElementById('stepHintPanel');
    const hintBtn = document.getElementById('toggleStepHintBtn');
    document.getElementById('stepHintText').textContent = step.hint;

    if (AppState.hintVisible && !AppState.completed) {
      hintPanel.style.display = 'block';
      hintPanel.setAttribute('aria-hidden', 'false');
      hintBtn.setAttribute('aria-expanded', 'true');
      hintBtn.innerHTML = '<span>💡 ヒントを閉じる</span>';
    } else {
      hintPanel.style.display = 'none';
      hintPanel.setAttribute('aria-hidden', 'true');
      hintBtn.setAttribute('aria-expanded', 'false');
      hintBtn.innerHTML = '<span>💡 ヒントを見る</span>';
    }

    // 進捗ドット描画
    const dotsEl = document.getElementById('stepProgressDots');
    dotsEl.innerHTML = SMS_AUTH_LESSON.steps.map((_, idx) => {
      const isDone = AppState.completed || idx < AppState.stepIndex;
      const isCurrent = !AppState.completed && idx === AppState.stepIndex;
      return `
        <div class="h-2 flex-1 rounded-full transition"
          style="background-color: ${
            isDone ? 'var(--success-border)' : isCurrent ? 'var(--sms-primary)' : 'var(--border-subtle)'
          };"></div>
      `;
    }).join('');
  }
};

// =====================================================================
// J. 補助コントロール関数（テーマ・文字サイズ・ヒント・迷子復帰）
// =====================================================================
function toggleFontSize() {
  AppState.fontLarge = !AppState.fontLarge;
  document.documentElement.classList.toggle('font-large', AppState.fontLarge);
  document.getElementById('fontToggleBtn').setAttribute('aria-checked', AppState.fontLarge ? 'true' : 'false');
  document.getElementById('fontSizeStatusLabel').textContent = AppState.fontLarge ? '文字サイズ：大きめ' : '文字サイズ：標準';
}

function toggleTheme() {
  AppState.theme = AppState.theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', AppState.theme);
  document.getElementById('themeToggleBtn').setAttribute('aria-checked', AppState.theme === 'dark' ? 'true' : 'false');
  document.getElementById('themeStatusLabel').textContent = AppState.theme === 'dark' ? '配色：ダーク' : '配色：ライト';
  LayerMapEngine.render();
  ClipboardEngine.renderUI();
}

function toggleStepHint(forceVal = null) {
  AppState.hintVisible = forceVal !== null ? forceVal : !AppState.hintVisible;
  LessonEngine.renderStepGuide();
}

function resetCurrentLesson() {
  LessonEngine.reset();
}

function recoverToSafePoint() {
  const step = SMS_AUTH_LESSON.steps[AppState.stepIndex];
  const target = (step && step.safeScreen) ? step.safeScreen : 'browser';
  ScreenRouter.navigate(target, 'zoom');
}

// =====================================================================
// K. 初期化実行
// =====================================================================
window.addEventListener('DOMContentLoaded', () => {
  LessonEngine.reset();
});
