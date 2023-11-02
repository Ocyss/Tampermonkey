// ==UserScript==
// @name         universal_tool
// @name:zh-cn   万能工具
// @namespace    Ocyss
// @version      0.1
// @description  Specially written practical gadgets
// @description:zh-cn  专门编写实用小工具
// @author       Ocyss
// @source       https://github.com/Ocyss/Tampermonkey
// @homepage     https://github.com/Ocyss
// @match        *://*/*
// @icon         https://cdn-icons-png.flaticon.com/512/949/949339.png
// @run-at       document-start
// @license      MIT
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// ==/UserScript==



(function () {
  GM_registerMenuCommand("搜索脚本", () => {
    GM_openInTab(`https://greasyfork.org/zh-CN/scripts/by-site/${window.location.host}?sort=updated`, {
      active: true,
      setParent: true
    })
  });
  GM_registerMenuCommand("修改速度", () => {
    // By: EricZhongYJ
    let default_speed = 0.0;
    if (document.querySelector('video').playbackRate != default_speed) {
      default_speed = window.prompt("请输入播放速度:(Please input the speed:0-16)");
      if (!default_speed) default_speed = document.querySelector('video').playbackRate;
      else document.querySelector('video').playbackRate = default_speed;
    }
  });
}())