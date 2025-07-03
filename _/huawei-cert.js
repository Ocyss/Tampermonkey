// ==UserScript==
// @name         半自动微认证考试(linux.do专用)
// @namespace    https://linux.do/u/ocyss_04/summary
// @version      2025-07-03
// @description  严谨分享，仅供佬友自用!。
// @author       Ocyss
// @license      GPL-3.0
// @match        https://connect.huaweicloud.com/courses/exam/*
// @match        https://edu.huaweicloud.com/certifications/*
// @match        https://edu.huaweicloud.com/signup/*
// @match        https://www.huaweicloud.com
 
// @icon         https://www.google.com/s2/favicons?sz=64&domain=huaweicloud.com

// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// ==/UserScript==
 
// 报名地址(AFF) https://edu.huaweicloud.com/signup/9990e06079984850979909a6a602d283
/*
如果跨域可在UserScript当中添加如下代码，并替换 GM_chat 中的 fetch 为 GM_fetch

// @connect      *
// @grant        GM.xmlHttpRequest
// @require      https://cdn.jsdelivr.net/npm/@trim21/gm-fetch@0.3.0

*/

const 网络劫持Prompt = (x) => `## 角色设定
你是一位正在参加华为云认证考试的考生

## 任务要求
我将向你提供华为云认证的考试题目，然后请你直接给出准确答案+题号。

## 输出示例

A: 类型丰富
B: 弹性伸缩
C: 高安全、高可靠

## 参考题库
${GM_getValue("tk", "")}

## 输入题目
${x}`;

const 快捷键Prompt = (x) => `## 角色设定
你是一位正在参加华为云认证考试的考生

## 任务要求
我将向你提供华为云认证的考试题目，你需要先对题目进行判断，是单选题还是多选题，然后直接给出准确答案+索引序号(1起始)，换行符表示新的选项。
请无视 上一题下一题 字样

## 输出示例

1: 类型丰富
2: 弹性伸缩
4: 高安全、高可靠

## 参考题库
${GM_getValue("tk", "")}

## 输入题目
${x}`;

function initBlockingFeatures() {
	const stepEvent = (e) => {
		e.stopImmediatePropagation();
		e.stopPropagation();
		e.preventDefault();
		return false;
	};
	// 伪造document.visibilityState为visible，始终显示为可见状态
	Object.defineProperty(unsafeWindow.document, "visibilityState", {
		configurable: true,
		get: function () {
			return "visible";
		},
	});

	// 伪造document.hidden为false，始终显示为非隐藏状态
	Object.defineProperty(unsafeWindow.document, "hidden", {
		configurable: true,
		get: function () {
			return false;
		},
	});

	[
		"blur", // 阻止焦点事件（失去焦点和获取焦点）
		"focus",
		"focusin",
		"focusout", // 阻止页面显示和隐藏事件
		"pageshow",
		"pagehide",
		"visibilitychange", // 阻止可见性变化事件
	].forEach((k) => {
		unsafeWindow.addEventListener(k, stepEvent, true);
	});

	// 阻止可见性变化事件
	unsafeWindow.document.addEventListener("visibilitychange", stepEvent, true);

	// 阻止屏幕方向变化监听
	if (unsafeWindow.screen.orientation) {
		unsafeWindow.screen.orientation.addEventListener("change", stepEvent, true);
	}

	// 伪装全屏状态 - 让页面认为已经进入全屏
	Object.defineProperty(unsafeWindow.document, "fullscreenElement", {
		configurable: true,
		get: function () {
			return unsafeWindow.document.documentElement;
		},
	});

	Object.defineProperty(unsafeWindow.document, "fullscreenEnabled", {
		configurable: true,
		get: function () {
			return true;
		},
	});

	// 覆盖requestFullscreen使其无效，但返回成功状态
	unsafeWindow.Element.prototype.requestFullscreen = function () {
		return new Promise((resolve, reject) => {
			// 不执行真正的全屏，直接resolve让调用方认为成功
			resolve();
		});
	};

	// 覆盖exitFullscreen使其无效
	unsafeWindow.document.exitFullscreen = function () {
		return new Promise((resolve, reject) => {
			// 不执行真正的退出全屏，直接resolve
			resolve();
		});
	};

	// 阻止fullscreenchange事件
	unsafeWindow.document.addEventListener("fullscreenchange", stepEvent, true);

	console.log("切屏检测阻止功能已启用");
}

async function GM_chat(msg, opt = {}) {
	const { baseUrl, apiKey, model } = GM_getValue("gm_chat", {});
	if (!baseUrl | !apiKey | !model) {
		throw Error(`GM_chat没有进行配置。`);
	}
	const {
		stream = false,
		streamSplit = true,
		console: enableConsole = true,
	} = opt;

	const messages =
		typeof msg === "string" ? [{ role: "user", content: msg }] : msg;

	const requestBody = {
		model,
		messages: messages,
		stream: stream,
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
			return;
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

function createReactiveObject(initialState) {
	let state = { ...initialState };
	return new Proxy(state, {
		get(target, key) {
			return target[key];
		},
		set(target, key, value) {
			target[key] = value;
			return true;
		},
	});
}

function createToggleMenu(config) {
	const { menuName, onStart, onStop, defaultEnabled = false } = config;
	const storageKey = `toggle_${menuName}`;
	const initialEnabled = GM_getValue(storageKey, defaultEnabled);

	const state = createReactiveObject({
		isEnabled: initialEnabled,
		menuCommandId: null,
	});

	function updateMenuCommand() {
		if (state.menuCommandId) {
			GM_unregisterMenuCommand(state.menuCommandId);
		}

		GM_setValue(storageKey, state.isEnabled);

		if (state.isEnabled) {
			state.menuCommandId = GM_registerMenuCommand(
				`🟢${menuName}(已启用)`,
				() => {
					state.isEnabled = false;
					onStop(state);
					updateMenuCommand();
				},
			);
		} else {
			state.menuCommandId = GM_registerMenuCommand(
				`🔴${menuName}(未启用)`,
				() => {
					state.isEnabled = true;
					onStart(state);
					updateMenuCommand();
				},
			);
		}
	}

	if (initialEnabled) {
		onStart(state);
	}

	updateMenuCommand();
}

function logQA(question, answer) {
	console.log(`
📚════════❓❓❓════════📚
${question}
📚════════✅✅✅════════📚
${answer}
📚════════🎆🎆🎆════════📚
`);
}

(function () {
	"use strict";
	unsafeWindow._chat = GM_chat;
	initBlockingFeatures();

	GM_registerMenuCommand("⚙️ OpenAI配置", () => {
		const currentConfig = GM_getValue("gm_chat", {});
		const baseUrl = prompt(
			"请输入 Base URL:",
			currentConfig.baseUrl || "https://api.openai.com/v1",
		);
		if (baseUrl === null) return;

		const apiKey = prompt("请输入 API Key:", currentConfig.apiKey || "");
		if (apiKey === null) return;

		const model = prompt(
			"请输入模型名称:",
			currentConfig.model || "gpt-3.5-turbo",
		);
		if (model === null) return;
		GM_setValue("gm_chat", {
			baseUrl: baseUrl.trim(),
			apiKey: apiKey.trim(),
			model: model.trim(),
		});
		alert("配置已保存！");
	});

	GM_registerMenuCommand("⚙️ 题库配置", () => {
		const tk = prompt("粘贴题库:", "");
		GM_setValue("tk", tk);
		alert("题库已保存！");
	});

	// 网络劫持功能开关
	createToggleMenu({
		menuName: "网络劫持",
		defaultEnabled: false,
		onStart: (state) => {
			console.log("网络劫持已启动", state);

			state.originalOpen = unsafeWindow.XMLHttpRequest.prototype.open;
			state.originalSend = unsafeWindow.XMLHttpRequest.prototype.send;

			const url = "/svc/innovation/userapi/exam2d/so/servlet/getExamPaper";

			unsafeWindow.XMLHttpRequest.prototype.open = function (m, u) {
				this._t = m === "POST" && u.includes(url);
				return state.originalOpen.apply(this, arguments);
			};
			unsafeWindow.XMLHttpRequest.prototype.send = function () {
				if (this._t) {
					this.addEventListener("load", async function () {
						try {
							const response = JSON.parse(this.responseText);
							const questions = response.result.questions.map((x, i) => [
								`${i + 1}/${x.type == 2 ? "判断" : x.type == 0 ? "单选" : "多选"}: ${x.content}`,
								x.options
									.map(
										(opt, oi) =>
											`${opt.optionOrder ?? String.fromCharCode(65 + oi)}: ${opt.optionContent}`,
									)
									.join("\n"),
							]);
							console.log("拦截到考试题目：", questions);
							for (const question of questions) {
								await new Promise((r) => {
									setTimeout(() => r(), 2000);
								});
								const res = await GM_chat(
									网络劫持Prompt(question[0] + "\n\n" + question[1]),
									{ stream: false, console: false },
								);
								logQA(question[0], res.message);
							}
						} catch (e) {
							console.error("解析考试数据失败：", e);
						}
					});
				}
				return state.originalSend.apply(this, arguments);
			};

			state.interceptor = { active: true };
		},
		onStop: (state) => {
			console.log("网络劫持已停止", state);

			if (state.originalOpen) {
				unsafeWindow.XMLHttpRequest.prototype.open = state.originalOpen;
				state.originalOpen = null;
			}

			if (state.originalSend) {
				unsafeWindow.XMLHttpRequest.prototype.send = state.originalSend;
				state.originalSend = null;
			}

			if (state.interceptor) {
				state.interceptor.active = false;
				state.interceptor = null;
			}
		},
	});

	// ctrl+s 快捷键备用方案
	createToggleMenu({
		menuName: "快捷键",
		defaultEnabled: true,
		onStart: (state) => {
			console.log("快捷键监听已启动", state);
			async function handleKeyPress(event) {
				if ((event.ctrlKey || event.metaKey) && event.key === "s") {
					event.preventDefault();

					const examElement = unsafeWindow.document.querySelector(
						"#Examination > div.content > div.right",
					);

					if (!examElement) {
						console.log("未找到考题元素");
						return;
					}

					const textToCopy = examElement.innerText;
					console.log("快捷键答题模式：", { text: textToCopy });

					const res = await GM_chat(快捷键Prompt(textToCopy), { stream: false, console:false });
					logQA("", res.message);
				}
			}
			state.keyHandler = handleKeyPress;
			unsafeWindow.document.addEventListener("keydown", handleKeyPress);
		},
		onStop: (state) => {
			console.log("快捷键监听已停止", state);
			if (state.keyHandler) {
				unsafeWindow.document.removeEventListener("keydown", state.keyHandler);
				state.keyHandler = null;
			}
		},
	});
})();