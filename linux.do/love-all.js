// ==UserScript==
// @name         linux.do 一键点赞
// @namespace    https://github.com/Ocyss
// @version      2025-07-03
// @description  ❤️❤️❤️❤️❤️❤️❤️
// @author       Ocyss
// @match        https://linux.do/t/topic/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=linux.do
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @license      GPL-3.0
// ==/UserScript==

class ButtonViewportManager {
  constructor() {
    this.visibleButtons = new Set()
    this.observer = this.createObserver()
    this.init()
  }

  createObserver() {
    return new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.visibleButtons.add(entry.target)
          } else {
            this.visibleButtons.delete(entry.target)
          }
        })
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.1,
      },
    )
  }

  init() {
    this.observeAllButtons()
    this.setupMutationObserver()
  }

  observeAllButtons() {
    document.querySelectorAll('.discourse-reactions-reaction-button').forEach((button) => {
      this.observer.observe(button)
    })
  }

  setupMutationObserver() {
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const buttons = node.querySelectorAll?.('.discourse-reactions-reaction-button') || []
            buttons.forEach((button) => this.observer.observe(button))
          }
        })
      })
    })

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  // 获取当前视图中的所有按钮
  getVisibleButtons() {
    return Array.from(this.visibleButtons)
  }

  // 获取可见按钮数量
  getVisibleButtonCount() {
    return this.visibleButtons.size
  }

  // 清理资源
  destroy() {
    this.observer.disconnect()
    this.visibleButtons.clear()
  }
}

function waitForElement(selector, timeout = 60000) {
  return new Promise((resolve, reject) => {
    // 首先检查元素是否已经存在
    const existingElement = document.querySelector(selector)
    if (existingElement) {
      resolve(existingElement)
      return
    }

    const observer = new MutationObserver((mutations) => {
      const element = document.querySelector(selector)
      if (element) {
        observer.disconnect()
        clearTimeout(timeoutId)
        resolve(element)
      }
    })

    const timeoutId = setTimeout(() => {
      observer.disconnect()
      reject(new Error(`Element ${selector} not found within ${timeout}ms`))
    }, timeout)

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
  })
}

;(() => {
  // 初始化按钮视图管理器
  const buttonManager = new ButtonViewportManager()

  waitForElement('.timeline-footer-controls .btn.reply-to-post')
    .then((element) => {
      console.log('找到元素:', element)
      const clonedButton = element.cloneNode(true)
      clonedButton.setAttribute('title', '大爱天下')
      const svgUseElement = clonedButton.querySelector('use')
      if (svgUseElement) {
        svgUseElement.setAttribute('href', '#heart')
      }
      clonedButton.addEventListener('click', () => {
        const visibleButtons = buttonManager.getVisibleButtons()
        console.log('当前视图中的所有点赞按钮:', visibleButtons)
        console.log(`当前视图中有 ${buttonManager.getVisibleButtonCount()} 个点赞按钮可见`)
      })
      element.parentNode.insertBefore(clonedButton, element.nextSibling)
    })
    .catch((error) => {
      console.error('元素未找到:', error)
    })
})()
