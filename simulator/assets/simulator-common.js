/* =====================================================================
   smart-navi シミュレーター共通エンジン (simulator-common.js)
   ===================================================================== */
(function (global) {
  'use strict';

  const STORAGE_KEYS = {
    THEME: 'smart_navi_sim_theme',
    FONT_LARGE: 'smart_navi_sim_font_large',
    COMPLETED_LESSONS: 'smart_navi_sim_completed'
  };

  const SmartNaviCommon = {
    state: {
      theme: 'light',
      fontLarge: false
    },

    // -------------------------------------------------------------------
    // 1. アクセシビリティ（文字サイズ・配色）初期化＆切り替え
    // -------------------------------------------------------------------
    initPreferences(onPreferenceChanged) {
      try {
        const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
        const savedFont = localStorage.getItem(STORAGE_KEYS.FONT_LARGE);
        if (savedTheme === 'dark' || savedTheme === 'light') {
          this.state.theme = savedTheme;
        }
        if (savedFont === 'true') {
          this.state.fontLarge = true;
        }
      } catch (e) {
        // ストレージ制限環境でもエラーにしない
      }
      this.applyPreferencesUI();
      if (typeof onPreferenceChanged === 'function') {
        onPreferenceChanged(this.state);
      }
    },

    applyPreferencesUI() {
      document.documentElement.setAttribute('data-theme', this.state.theme);
      document.documentElement.classList.toggle('font-large', this.state.fontLarge);

      const fontBtn = document.getElementById('fontToggleBtn');
      const fontLabel = document.getElementById('fontSizeStatusLabel');
      if (fontBtn) fontBtn.setAttribute('aria-checked', this.state.fontLarge ? 'true' : 'false');
      if (fontLabel) fontLabel.textContent = this.state.fontLarge ? '文字サイズ：大きめ' : '文字サイズ：標準';

      const themeBtn = document.getElementById('themeToggleBtn');
      const themeLabel = document.getElementById('themeStatusLabel');
      if (themeBtn) themeBtn.setAttribute('aria-checked', this.state.theme === 'dark' ? 'true' : 'false');
      if (themeLabel) themeLabel.textContent = this.state.theme === 'dark' ? '配色：ダーク' : '配色：ライト';
    },

    toggleFontSize(onPreferenceChanged) {
      this.state.fontLarge = !this.state.fontLarge;
      try {
        localStorage.setItem(STORAGE_KEYS.FONT_LARGE, this.state.fontLarge ? 'true' : 'false');
      } catch (e) {}
      this.applyPreferencesUI();
      if (typeof onPreferenceChanged === 'function') {
        onPreferenceChanged(this.state);
      }
    },

    toggleTheme(onPreferenceChanged) {
      this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem(STORAGE_KEYS.THEME, this.state.theme);
      } catch (e) {}
      this.applyPreferencesUI();
      if (typeof onPreferenceChanged === 'function') {
        onPreferenceChanged(this.state);
      }
    },

    // -------------------------------------------------------------------
    // 2. レッスン完了進捗の保存・取得（一覧ページ連携用）
    // -------------------------------------------------------------------
    markLessonCompleted(lessonSlug) {
      try {
        const current = this.getCompletedLessons();
        if (!current.includes(lessonSlug)) {
          current.push(lessonSlug);
          localStorage.setItem(STORAGE_KEYS.COMPLETED_LESSONS, JSON.stringify(current));
        }
      } catch (e) {}
    },

    getCompletedLessons() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.COMPLETED_LESSONS);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    },

    // -------------------------------------------------------------------
    // 3. 排他的画面切り替えヘルパー（遷移元を必ず display: none にする）
    // -------------------------------------------------------------------
    switchScreenExclusive(screenDomMap, targetKey, animType = 'zoom') {
      const targetDomId = screenDomMap[targetKey];
      if (!targetDomId) return;

      // まずすべての画面を完全に非表示化
      Object.entries(screenDomMap).forEach(([key, domId]) => {
        const el = document.getElementById(domId);
        if (!el) return;
        el.classList.remove('anim-zoom', 'anim-slide-up');
        if (key !== targetKey) {
          el.style.display = 'none';
          el.setAttribute('aria-hidden', 'true');
        }
      });

      // 対象画面のみ表示
      const activeEl = document.getElementById(targetDomId);
      if (activeEl) {
        activeEl.style.display = 'flex';
        activeEl.setAttribute('aria-hidden', 'false');
        void activeEl.offsetWidth;
        activeEl.classList.add(animType === 'slide' ? 'anim-slide-up' : 'anim-zoom');
      }
    },

    // -------------------------------------------------------------------
    // 4. 排他的ヒントパネル制御
    // -------------------------------------------------------------------
    renderHintPanel(isVisible, hintText) {
      const panel = document.getElementById('stepHintPanel');
      const btn = document.getElementById('toggleStepHintBtn');
      const textEl = document.getElementById('stepHintText');
      if (!panel || !btn) return;

      if (textEl && typeof hintText === 'string') {
        textEl.textContent = hintText;
      }

      if (isVisible) {
        panel.style.display = 'block';
        panel.setAttribute('aria-hidden', 'false');
        btn.setAttribute('aria-expanded', 'true');
        btn.innerHTML = '<span>💡 ヒントを閉じる</span>';
      } else {
        panel.style.display = 'none';
        panel.setAttribute('aria-hidden', 'true');
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = '<span>💡 ヒントを見る</span>';
      }
    },

    // -------------------------------------------------------------------
    // 5. 共通パーツトレイ描画・ドラッグ補助エンジン
    // -------------------------------------------------------------------
    renderTokenTray(containerId, tokens, onSelectToken, emptyMessage) {
      const container = document.getElementById(containerId);
      if (!container) return;

      if (!tokens || tokens.length === 0) {
        container.innerHTML = `
          <div class="w-full p-2.5 rounded-[8px] border text-xs"
            style="background-color: var(--bg-card-sub); border-color: var(--border-subtle); color: var(--text-muted);">
            ${emptyMessage || '現在のステップではパーツ配置は不要です。スマホ画面の案内に沿って操作してください。'}
          </div>
        `;
        return;
      }

      container.innerHTML = tokens.map(tok => `
        <button type="button"
          draggable="true"
          data-token-id="${tok.id}"
          class="sim-token-btn px-3.5 py-2.5 rounded-[8px] border-2 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition shadow-2xs text-left"
          style="background-color: var(--accent-tint); border-color: var(--accent-primary); color: var(--text-primary);">
          <span class="shrink-0">${tok.icon || '🧩'}</span>
          <span>${tok.label}</span>
          <span class="text-[11px] px-1.5 py-0.5 rounded bg-white/85 text-[#0067C0] shrink-0">押して入力</span>
        </button>
      `).join('');

      container.querySelectorAll('.sim-token-btn').forEach(btn => {
        const tokenId = btn.getAttribute('data-token-id');
        btn.addEventListener('click', () => {
          if (typeof onSelectToken === 'function') onSelectToken(tokenId);
        });
        btn.addEventListener('dragstart', (ev) => {
          if (ev.dataTransfer) ev.dataTransfer.setData('text/plain', tokenId);
        });
      });
    }
  };

  global.SmartNaviCommon = SmartNaviCommon;
})(window);
