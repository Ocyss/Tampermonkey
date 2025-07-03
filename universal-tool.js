// ==UserScript==
// @name         universal_tool
// @name:zh-cn   万能工具
// @namespace    https://github.com/ocyss
// @version      0.2.1
// @description  Specially written practical gadgets
// @description:zh-cn  专门编写实用小工具
// @author       Ocyss
// @match        *://*/*
// @icon         https://cdn-icons-png.flaticon.com/512/949/949339.png
// @run-at       document-start
// @license      MIT
// @connect      *
// @grant        GM.xmlHttpRequest
// @require      https://cdn.jsdelivr.net/npm/@trim21/gm-fetch
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_openInTab
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_cookie
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_download
// @grant        unsafeWindow
// @noframes
// ==/UserScript==

function createReactiveObject(initialState) {
  let state = { ...initialState };

  return new Proxy(state, {
      get(target, key) {
          // 返回最新的值
          return target[key];
      },
      set(target, key, value) {
          // 更新值
          target[key] = value;
          return true;
      },
  });
}

function createToggleMenu(config) {
  const state = createReactiveObject({ isRunning: false,menuCommandId:null });
  const { menuName, onStart, onStop } = config;

  function updateMenuCommand() {
      if (state.menuCommandId) {
          GM_unregisterMenuCommand(state.menuCommandId);
      }
      if (state.isRunning) {
          state.menuCommandId = GM_registerMenuCommand(`🔴停止${menuName}`, () => {
              state.isRunning = false;
              onStop(state);
              updateMenuCommand();
          });
      } else {
          state. menuCommandId = GM_registerMenuCommand(`🟢开始${menuName}`, () => {
              state.isRunning = true;
              onStart(state);
              updateMenuCommand();
          });
      }
  }

  // 初始化菜单
  updateMenuCommand();
}


/**
* OpenAI Chat API 调用函数
* @param {string|Array<{role: string, content: string}>} msg - 消息内容，可以是字符串或消息数组
* @param {Object} [opt={}] - 选项配置
* @param {boolean} [opt.stream=false] - 是否启用流式响应
* @param {boolean} [opt.streamSplit=true] - 流式模式下是否按换行符分割输出
* @param {boolean} [opt.console=true] - 是否在控制台打印输出
* @returns {Promise<{message: string, usage?: Object}>} 返回包含消息内容的对象
*/
async function GM_chat(msg, opt = {}) {
  const {baseUrl,apiKey,model} = GM_getValue("gm_chat",{})
  if (!baseUrl|!apiKey|!model){
    throw Error(`GM_chat没有进行配置。使用 $ocyssSet("gm_chat",{baseUrl,apiKey,model}) 进行配置`)
  }
  const {
      stream = false,
      streamSplit = true,
      console: enableConsole = true
  } = opt;

  // 处理消息格式
  const messages = typeof msg === 'string'
      ? [{ role: 'user', content: msg }]
      : msg;

  const requestBody = {
      model,
      messages: messages,
      stream: stream
  };

  try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (stream) {
          return await handleStreamResponse(response, { streamSplit, enableConsole });
      } else {
          return await handleNormalResponse(response, { enableConsole });
      }

  } catch (error) {
      console.error('GM_chat 调用失败:', error);
      throw error;
  }
}

/**
* 处理普通响应
* @param {Response} response - fetch 响应对象
* @param {Object} options - 选项
* @returns {Promise<{message: string, usage: Object}>}
*/
async function handleNormalResponse(response, { enableConsole }) {
  const data = await response.json();
  const message = data.choices[0].message.content;

  if (enableConsole) {
      console.log('OpenAI Response:', message);
  }

  return {
      message,
      usage: data.usage
  };
}

/**
* 处理流式响应
* @param {Response} response - fetch 响应对象
* @param {Object} options - 选项
* @returns {Promise<{message: string}>}
*/
async function handleStreamResponse(response, { streamSplit, enableConsole }) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullMessage = '';
  let buffer = '';

  if (enableConsole && streamSplit) {
      console.group('OpenAI Stream Response:');
  }

  try {
      while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
              if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;

                  try {
                      const parsed = JSON.parse(data);
                      const delta = parsed.choices[0]?.delta?.content;

                      if (delta) {
                          fullMessage += delta;

                          if (enableConsole) {
                              if (streamSplit) {
                                  // 按换行符分割输出
                                  const parts = delta.split('\n');
                                  for (let i = 0; i < parts.length; i++) {
                                      if (parts[i] || i < parts.length - 1) {
                                          console.log(parts[i]);
                                      }
                                  }
                              } else {
                                  process.stdout.write(delta);
                              }
                          }
                      }
                  } catch (e) {
                      // 忽略 JSON 解析错误
                  }
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

(function () {
  unsafeWindow.$ocyssSet = GM_setValue
  unsafeWindow.$ocyssGet = GM_getValue
  unsafeWindow.GM_fetch = GM_fetch
  unsafeWindow.GM_chat = GM_chat
  unsafeWindow.qe = (selector, el = document) => el.querySelector(selector);
  unsafeWindow.qes = (selector, el = document) => el.querySelectorAll(selector);
  unsafeWindow.qx = (xpath, el = document) =>
  el.evaluate(xpath, el).iterateNext();
  unsafeWindow.qxs = (xpath, el = document) => {
      let results = [];
      let query = el.evaluate(
          xpath,
          parent || el,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
      );
      for (let i = 0, length = query.snapshotLength; i < length; ++i) {
          results.push(query.snapshotItem(i));
      }
      return results;
  };
  unsafeWindow.qesMap = (selector, key = "href", el = document) =>
  Array.from(el.querySelectorAll(selector)).map((a) => a[key]);

  unsafeWindow.qdownload = (items, opt = {}) => {
      const defaultLog = (name) => () => console.log(name);
      const {
          saveAs = true,
          onerror = defaultLog("onerror"),
          onprogress = defaultLog("onprogress"),
          ontimeout = defaultLog("ontimeout"),
          onload = defaultLog("onload"),
      } = opt;

      Array.from(items).forEach((item) =>
                                GM_download({
          url: item.url,
          name: item.name,
          saveAs,
          onerror,
          onprogress,
          ontimeout,
          onload,
      })
                               );
  };

  const host = window.location.host;
  const hostName = isNaN(host.substring(host.lastIndexOf(".")))
  ? host.substring(
      host.substring(0, host.lastIndexOf(".")).lastIndexOf(".") + 1
  )
  : host;
  GM_registerMenuCommand("搜索脚本", () => {
      GM_openInTab(
          `https://greasyfork.org/zh-CN/scripts/by-site/${hostName}?sort=updated`,
          {
              active: true,
              setParent: true,
          }
      );
  });

  createToggleMenu({
      menuName: "平滑滚动",
      onStart: (state) => {
          const speed = parseFloat(prompt("请输入滚动速度（像素/秒）：", "50"));
          if (isNaN(speed) || speed <= 0) {
              alert("请输入有效的速度值！");
              return;
          }

          let lastScrollTime = performance.now();
          let scrollAmount = 0;

          function scrollStep(timestamp) {
              if (!state.isRunning) return;

              const deltaTime = timestamp - lastScrollTime;
              lastScrollTime = timestamp;

              scrollAmount += (speed * deltaTime) / 1000;
              const scrollDelta = Math.floor(scrollAmount);
              scrollAmount -= scrollDelta;

              window.scrollBy(0, scrollDelta);

              if (state.isRunning) {
                  requestAnimationFrame(scrollStep);
              }
          }

          requestAnimationFrame(scrollStep);
      },
      onStop: () => {
          // 停止滚动逻辑
          console.log("自动滚动已停止");
      },
  });

  createToggleMenu({
      menuName: "自然滚动",
      onStart: (state) => {
          // 初始化定时器ID
          state.scrollTimer = null;

          function randomScroll() {
              if (!state.isRunning) return;

              // 随机滚动距离
              const scrollDistance = Math.floor(Math.random() * (window.innerHeight - 100)) + (window.innerHeight/3);

              // 随机停留时间
              const stayTime = Math.floor(Math.random() * 5000) + 3000;

              // 平滑滚动到目标位置
              const startY = window.scrollY;
              const targetY = startY + scrollDistance;
              const duration = 1000; // 滚动持续时间固定为1秒
              let startTime = null;

              function scrollStep(timestamp) {
                  if (!startTime) startTime = timestamp;
                  const progress = timestamp - startTime;

                  const scrollDelta = Math.min(progress / duration, 1);
                  window.scrollTo(0, startY + scrollDistance * scrollDelta);

                  if (progress < duration) {
                      requestAnimationFrame(scrollStep);
                  } else {
                      // 滚动完成后，等待随机停留时间再继续滚动
                      state.scrollTimer = setTimeout(randomScroll, stayTime);
                  }
              }

              requestAnimationFrame(scrollStep);
          }

          // 开始第一次滚动
          randomScroll();
      },
      onStop: (state) => {
          // 停止滚动逻辑
          if (state.scrollTimer) {
              clearTimeout(state.scrollTimer);
              state.scrollTimer = null;
          }
          console.log("模拟滚动已停止");
      },
  });

  // GM_registerMenuCommand("修改速度", () => {
  //   // By: EricZhongYJ
  //   let default_speed = 0.0;
  //   if (document.querySelector("video").playbackRate != default_speed) {
  //     default_speed = window.prompt(
  //       "请输入播放速度:(Please input the speed:0-16)"
  //     );
  //     if (!default_speed)
  //       default_speed = document.querySelector("video").playbackRate;
  //     else document.querySelector("video").playbackRate = default_speed;
  //   }
  // });
  // GM_registerMenuCommand("切换Ck", async () => {
  //   let value = GM_getValue("ck_list-" + host) || [];
  //   GM_cookie("list", {}, async (list, error) => {
  //     if (error === undefined) {
  //       console.log(list, value);
  //       // 储存覆盖老的值
  //       GM_setValue("ck_list-" + host, list);
  //       // 先清空 再设置
  //       for (let i = 0; i < list.length; i++) {
  //         list[i].url = window.location.origin;
  //         await GM_cookie("delete", list[i]);
  //       }
  //       if (value.length) {
  //         // 循环set
  //         for (let i = 0; i < value.length; i++) {
  //           value[i].url = window.location.origin;
  //           await GM_cookie("set", value[i]);
  //         }
  //       }
  //       if (GM_getValue("ck_cur-" + host, "") === "") {
  //         GM_setValue("ck_cur-" + host, "_");
  //       } else {
  //         GM_setValue("ck_cur-" + host, "");
  //       }
  //       //window.location.reload();
  //       window.alert("手动刷新～");
  //     } else {
  //       window.alert("你当前版本可能不支持Ck操作，错误代码：" + error);
  //     }
  //   });
  // });

  // GM_registerMenuCommand("清除当前Ck", () => {
  //   if (GM_getValue("ck_cur-" + host, "") === "_") {
  //     GM_setValue("ck_cur-" + host, "");
  //   }
  //   GM_cookie("list", {}, async (list, error) => {
  //     if (error === undefined) {
  //       // 清空
  //       for (let i = 0; i < list.length; i++) {
  //         list[i].url = window.location.origin;
  //         // console.log(list[i]);
  //         await GM_cookie("delete", list[i]);
  //       }

  //       window.location.reload();
  //     } else {
  //       window.alert("你当前版本可能不支持Ck操作，错误代码：" + error);
  //     }
  //   });
  // });

  // GM_registerMenuCommand("清空所有存储!", async () => {
  //   if (confirm("将清空脚本全部的设置!!")) {
  //     const asyncKeys = await GM_listValues();
  //     for (let index in asyncKeys) {
  //       if (!asyncKeys.hasOwnProperty(index)) {
  //         continue;
  //       }
  //       console.log(asyncKeys[index]);
  //       await GM_deleteValue(asyncKeys[index]);
  //     }
  //     window.alert("OK!");
  //   }
  // });
})();