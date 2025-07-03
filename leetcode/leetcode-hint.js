// ==UserScript==
// @name         好好看看数据范围
// @namespace    Ocyss
// @version      0.1
// @description  try to take over the world!
// @author       Ocyss
// @source       https://github.com/Ocyss/Tampermonkey
// @homepage     https://github.com/Ocyss
// @match        https://leetcode.cn/problems/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=leetcode.cn
// @grant        none
// ==/UserScript==

(function () {
  let t = setInterval(() => {
    let ts = document.getElementsByName("description")[0].content.split("提示：")[1]
    if (ts != undefined) {
      alert("睁大你的狗眼看清楚范围：" + ts)
      clearInterval(t)
    }
  }, 2000);
})();


