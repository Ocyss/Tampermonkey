// ==UserScript==
// @name         力扣新版UI评论区
// @namespace    Ocyss
// @version      0.1
// @description  杀软,tm的会不会设计?
// @author       Ocyss
// @match        https://leetcode.cn/problems/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=leetcode.cn
// @license      MIT
// @grant        none
// ==/UserScript==

(function () {
  const t = setInterval(() => {
    const comment = document.querySelector(".mt-6.flex.flex-col.gap-3 .flex.flex-col")
    const header = document.querySelector(".flexlayout__tabset_tabbar_inner_tab_container.flexlayout__tabset_tabbar_inner_tab_container_top")
    const layout = document.querySelector(".flexlayout__layout")
    if (!layout || !comment || !header) {
      return
    }
    clearInterval(t)
    const l = new leetcode(comment, header, layout)
    l.main()
  }, 1000)
})();

class DOMApi {
  static createElement(tag, _class = "", id = "", content = "", style = "") {
    const el = document.createElement(tag)
    if (_class) { el.className = _class }
    if (id) { el.id = id }
    if (style) { el.style.cssText = style }
    el.innerHTML = content
    return el
  }
  static click(el, func) {
    el.addEventListener("click", func)
  }
  static mousedown(el, func) {
    el.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        func(e)
      }
    })
  }
  static remove(cls, parent = document) {
    const t = setInterval(() => {
      const el = parent.querySelector(cls)
      if (!el) {
        return
      }
      el.remove()
      clearInterval(t)
    }, 200)
  }
}

class leetcode {
  constructor(comment, header, layout) {
    this.comment = comment // 评论区
    this.header = header
    this.layout = layout
    this.flexlayout = document.querySelectorAll(".flexlayout__tab")

    this.content = null
  }
  main() {
    this.buildComment()
    this.buildTagBut()
  }
  buildComment() {
    this.content = DOMApi.createElement("div", "flexlayout__tab", "", "", "left: 0px; top: 32px; width: 595px; height: 928.391px; position: absolute;display: none;")
    this.content.appendChild(this.comment.querySelector(".overflow-hidden.transition-all"))
    DOMApi.remove(".w-full.border.p-4.bg-fill-4.border-divider-4", this.content)
    this.layout.appendChild(this.content)
  }
  buildTagBut() {
    const commentBut = DOMApi.createElement("div", "flexlayout__tab_button flexlayout__tab_button_top flexlayout__tab_button--unselected", "", `
    <div class="flexlayout__tab_button_content">
    <div class="relative flex items-center gap-1 overflow-hidden text-xs capitalize" style="max-width: 150px;">
    <svg t="1694789310774" class="h-3.5 w-3.5 flex-none fill-none stroke-current stroke-1.5 text-blue-60 dark:text-blue-60" style="width: 1em;height: 1em;vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="4393"><path d="M873.909015 142.185058H150.090985c-40.867561 0-74.072455 44.516451-74.072455 99.249792v429.839173c0 54.733341 33.204894 99.249792 74.072455 99.249792h61.78786c4.743556 0 9.000594 3.040741 10.33852 7.541038l31.13719 98.398385c2.067704 6.568001 9.730372 9.487112 15.690225 6.081482l194.850695-110.682979c1.702815-0.973037 3.52726-1.459556 5.351704-1.459555H873.909015c40.867561 0 74.072455-44.516451 74.072455-99.249793V241.43485c-0.12163-54.854971-33.204894-99.249792-74.072455-99.249792zM557.915192 605.472384h-379.4845c-19.217484 0-33.326523-15.325336-33.326523-36.610524 0-21.163559 13.987409-36.610524 33.326523-36.610524h379.4845c19.217484 0 33.326523 15.446965 33.326523 36.610524 0 21.163559-13.987409 36.610524-33.326523 36.610524z m185.241953-125.886685h-559.496378c-21.650077 0-38.434969-16.298373-38.434968-37.097042s16.906521-37.097042 38.434968-37.097043h559.496378c21.650077 0 38.434969 16.298373 38.434968 37.097043s-16.906521 37.097042-38.434968 37.097042z m0-124.18387h-559.496378c-21.650077 0-38.434969-15.811854-38.434968-36.245635s16.906521-36.245635 38.434968-36.245635h559.496378c21.650077 0 38.434969 15.933484 38.434968 36.245635 0 20.312151-16.906521 36.245635-38.434968 36.245635z" p-id="4394" data-spm-anchor-id="a313x.search_index.0.i4.7ca13a810pE5J9"></path></svg>
      <div class="relative">
        <div class="medium whitespace-nowrap font-medium">评论</div>
        <div class="normal absolute left-0 top-0 whitespace-nowrap font-normal">评论</div>
      </div>
    </div>
  </div>
    `)
    const svg = this.comment.querySelector(".origin-center.transition-transform")
    const buts = document.querySelectorAll(".flexlayout__tab_button.flexlayout__tab_button_top")
    let pre

    const syncWidth = () => {
      if (!pre) {
        return
      }
      this.content.style.width = pre.style.width;
    }
    DOMApi.mousedown(commentBut, (e) => {
      if (!svg.classList.contains("rotate-180")) {
        this.comment.firstElementChild.click()
      }
      this.flexlayout.forEach((flex) => {
        if (flex.dataset.layoutPath.startsWith("/ts0") && flex.style.display == "") {
          pre = flex
          flex.style.display = "none"
          syncWidth()
        }
      })
      buts.forEach((but) => {
        if (but.dataset.layoutPath.startsWith("/ts0") && but.classList.contains("flexlayout__tab_button--selected")) {
          but.classList.replace("flexlayout__tab_button--selected", "flexlayout__tab_button--unselected");
        }
      })
      commentBut.classList.replace("flexlayout__tab_button--unselected", "flexlayout__tab_button--selected");
      this.content.style.display = ""
    })


    buts.forEach((but) => {
      if (but.dataset.layoutPath.startsWith("/ts0")) {
        DOMApi.mousedown(but, (e) => {
          if (pre && pre.dataset.layoutPath.replace(/\/t([^\/]*)$/, '/tb$1') == but.dataset.layoutPath) {
            pre.style.display = ""
            pre.classList.replace("flexlayout__tab_button--unselected", "flexlayout__tab_button--selected");
            pre = void 0
          }
          commentBut.classList.replace("flexlayout__tab_button--selected", "flexlayout__tab_button--unselected");
          this.content.style.display = "none"
        })
      }
    })

    this.header.appendChild(DOMApi.createElement("div", "flexlayout__tabset_tab_divider"))
    this.header.appendChild(commentBut)
    document.addEventListener("mousemove", function (event) {
      syncWidth()
    });
  }
}
