// ==UserScript==
// @name               Universal Tool
// @name:zh-cn         万能工具
// @namespace          https://github.com/Ocyss/Tampermonkey
// @version            0.3.0
// @description        Specially written practical gadgets
// @description:zh-cn  专门编写实用小工具
// @icon               https://cdn-icons-png.flaticon.com/512/949/949339.png
// @downloadURL        https://update.greasyfork.org/scripts/506179/Universal%20Tool.user.js
// @updateURL          https://update.greasyfork.org/scripts/506179/Universal%20Tool.user.js
// @require            https://cdn.jsdelivr.net/npm/@trim21/gm-fetch@0.3.0
// @match              *://*/*
// @connect            *
// @grant              CAT_userConfig
// @grant              GM.xmlHttpRequest
// @grant              GM_download
// @grant              GM_getValue
// @grant              GM_openInTab
// @grant              GM_registerMenuCommand
// @grant              GM_setClipboard
// @grant              GM_setValue
// @grant              unsafeWindow
// @grant              GM_cookie
// @grant              window.focus
// @run-at             document-start
// ==/UserScript==

/* ==UserConfig==
{OpenAI: {baseUrl: {title: baseUrl,type: text,default: https://api.openai.com/v1},apiKey: {title: apiKey,type: text},model: {title: model,type: text}}}
  ==/UserConfig== */

const getPublicSuffix = (host) => {
  const parts = host.split('.');
  if (parts.length <= 2) return host;
  const multiPartSuffixes = new Set([
    'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn',
    'com.hk', 'org.hk', 'com.tw', 'com.jp', 'co.jp',
    'co.uk', 'me.uk', 'org.uk', 'com.au'
  ]);
  const lastTwo = parts.slice(-2).join('.');
  return parts.slice(multiPartSuffixes.has(lastTwo) ? -3 : -2).join('.');
};

const HOST = window.location.hostname;
const DOMAIN = getPublicSuffix(HOST);

class ToggleMenu {
  constructor(config) {
    Object.assign(this, {
      name: "未命名",
      strategy: "host",
      persistent: true,
      defaultRunning: false,
      onStart: () => { },
      onStop: () => { },
      onInit: () => { },
      label: (s) => `${s.isRunning ? "🟢" : "🔴"}${this.name}`,
      initialState: {},
      ...config
    });

    const scopeMap = { global: "global", host: HOST, domain: DOMAIN };
    this.storageKey = `menu_state_${this.name}_${scopeMap[this.strategy] || HOST}`;

    const saved = this.persistent ? GM_getValue(this.storageKey, this.defaultRunning) : this.defaultRunning;
    this.state = { isRunning: !!saved, ...this.initialState };

    this.init();
  }

  init() {
    this.refreshMenu();
    this.onInit(this.state);
    if (this.state.isRunning) this.onStart(this.state);
  }

  refreshMenu() {
    const menuLabel = typeof this.label === "function" ? this.label(this.state) : this.label;
    GM_registerMenuCommand(menuLabel, () => this.toggle(), { id: this.storageKey });
  }

  toggle() {
    this.state.isRunning = !this.state.isRunning;
    if (this.persistent) GM_setValue(this.storageKey, this.state.isRunning);
    this.state.isRunning ? this.onStart(this.state) : this.onStop(this.state);
    this.refreshMenu();
  }
}

(function () {
  "use strict";

  async function GM_chat(msg, opt = {}) {
    const baseUrl = GM_getValue("OpenAI.baseUrl");
    const apiKey = GM_getValue("OpenAI.apiKey");
    const model = GM_getValue("OpenAI.model");
    if (!baseUrl || !apiKey || !model) {
      try {
        CAT_userConfig();
      } catch (error) {
        throw Error(`GM_chat没有进行配置, ${error}`);
      }
    }
    const { stream = false, streamSplit = true, console: enableConsole = true } = opt;
    const messages = typeof msg === "string" ? [{ role: "user", content: msg }] : msg;
    const requestBody = {
      model,
      messages,
      stream,
    };
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      if (stream) {
        return await handleStreamResponse(response, {
          streamSplit,
          enableConsole,
        });
      } else {
        return await handleNormalResponse(response, { enableConsole });
      }
    } catch (error) {
      console.error("GM_chat 调用失败:", error);
      throw error;
    }
  }
  async function handleNormalResponse(response, { enableConsole }) {
    const data = await response.json();
    const message = data.choices[0].message.content;
    if (enableConsole) {
      console.log("OpenAI Response:", message);
    }
    return {
      message,
      usage: data.usage,
    };
  }
  async function handleStreamResponse(response, { streamSplit, enableConsole }) {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullMessage = "";
    let buffer = "";
    if (enableConsole && streamSplit) {
      console.group("OpenAI Stream Response:");
    }
    if (!reader) {
      throw new Error("reader is not defined");
    }
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices[0]?.delta?.content;
              if (delta) {
                fullMessage += delta;
                if (enableConsole) {
                  const parts = delta.split("\n");
                  for (let i = 0; i < parts.length; i++) {
                    if (parts[i] || i < parts.length - 1) {
                      console.log(parts[i]);
                    }
                  }
                }
              }
            } catch { }
          }
        }
      }
    } finally {
      reader.releaseLock();
      if (enableConsole && streamSplit) {
        console.groupEnd();
      }
    }
    return { message: fullMessage };
  }

  const ut = {
    qe(selector, el) {
      return (el ?? document).querySelector(selector);
    },
    qes(selector, el) {
      return (el ?? document).querySelectorAll(selector);
    },
    qesMap(selector, key = "href", el = document) {
      return Array.from(el.querySelectorAll(selector)).map((a) => a[key]);
    },
    qx(xpath, el = document) {
      return el.evaluate(xpath, el).iterateNext();
    },
    qxs(xpath, el = document) {
      const results = [];
      const query = el.evaluate(
        xpath,
        el.parentElement || el,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null,
      );
      for (let i = 0, length = query.snapshotLength; i < length; ++i) {
        results.push(query.snapshotItem(i));
      }
      return results;
    },
    clipboard(data, type = "text/plain", cb = void 0) {
      if (type === "text/plain") {
        console.log("📋 ut复制内容:", data.slice(0, 50));
      }
      return GM_setClipboard(data, type, cb);
    },
    setValue: GM_setValue,
    getValue: GM_getValue,
    fetch: GM_fetch,
    chat: GM_chat,
    download(items, opt = {}) {
      const defaultLog = (name) => () => console.log(name);
      opt.saveAs ??= true;
      opt.onerror ??= defaultLog("onerror");
      opt.onprogress ??= defaultLog("onprogress");
      opt.ontimeout ??= defaultLog("ontimeout");
      opt.onload ??= defaultLog("onload");
      Array.from(items).forEach((item) => {
        GM_download({
          ...opt,
          url: item.url,
          name: item.name,
        });
      });
    },
    getAllIp() {
      const ips = [
        ...document.body.innerText.matchAll(
          /(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)){3}/g,
        ),
      ]
        .map((m) => m[0])
        .filter(
          (ip) => !/^ (10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|127\.|169\.254\.)/.test(ip),
        )
        .join(" ");
      this.clipboard(ips);
    },
  };
  unsafeWindow.ut = ut;

  GM_registerMenuCommand("🔍 搜索脚本", () => {
    GM_openInTab(`https://greasyfork.org/zh-CN/scripts/by-site/${DOMAIN}?sort=updated`, {
      active: true,
      setParent: true,
    });
  });

  new ToggleMenu({
    name: "平滑滚动",
    persistent: false,
    onStart: (state) => {
      const speed = parseFloat(prompt("请输入滚动速度（像素/秒）：", "50") ?? "50");
      if (Number.isNaN(speed) || speed <= 0) return;
      let last = performance.now();
      let acc = 0;
      const step = (now) => {
        if (!state.isRunning) return;
        const delta = now - last;
        last = now;
        acc += (speed * delta) / 1e3;
        const d = Math.floor(acc);
        acc -= d;
        window.scrollBy(0, d);
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  });

  new ToggleMenu({
    name: "自然滚动",
    persistent: false,
    onStart: (state) => {
      const loop = () => {
        if (!state.isRunning) return;
        const dist = Math.floor(Math.random() * (window.innerHeight - 100)) + window.innerHeight / 3;
        const wait = Math.floor(Math.random() * 5e3) + 3e3;
        const startY = window.scrollY;
        let start = null;
        const step = (now) => {
          if (!start) start = now;
          const p = Math.min((now - start) / 1e3, 1);
          window.scrollTo(0, startY + dist * p);
          if (p < 1) requestAnimationFrame(step);
          else state.timer = setTimeout(loop, wait);
        };
        requestAnimationFrame(step);
      };
      loop();
    },
    onStop: (state) => clearTimeout(state.timer)
  });

  new ToggleMenu({
    name: "焦点劫持",
    defaultRunning: true,
    onStart: (state) => {
      let active = false;
      const down = () => { active = true; setTimeout(() => active = false, 100); };
      const blur = (e) => { if (!active) { e.preventDefault(); e.stopImmediatePropagation(); } };
      const orig = window.focus;
      document.addEventListener("mousedown", down, true);
      window.addEventListener("blur", blur, true);
      window.focus = function () { if (active) return orig.apply(this, arguments); };
      state.hook = () => {
        document.removeEventListener("mousedown", down, true);
        window.removeEventListener("blur", blur, true);
        window.focus = orig;
      };
    },
    onStop: (state) => state.hook?.()
  });

  new ToggleMenu({
    name: "保持登录",
    strategy: "domain",
    onStart: () => {
      GM_cookie.list({ domain: DOMAIN }, (cookies, err) => {
        if (err) return;
        const exp = Math.floor(Date.now() / 1000) + 2592000;
        cookies.forEach(c => {
          if (c.session) {
            const { session: _, ...rest } = c;
            rest.expirationDate = exp;
            rest.url = window.location.origin;
            GM_cookie.set(rest);
          }
        });
      });
    }
  });
})();
