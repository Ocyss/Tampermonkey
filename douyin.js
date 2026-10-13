// ==UserScript==
// @name         抖音 Feed 流拦截过滤助手
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  过滤抖音首页 Feed 流中的广告、直播和指定关键词，支持油猴菜单开关及正则表达式
// @author       Ocyss_04
// @match        *://*.douyin.com/*
// @icon         https://www.douyin.com/favicon.ico
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://cdn.jsdelivr.net/npm/@rxliuli/vista@latest/dist/index.iife.mjs
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEYS = {
        filterAd: 'filter_ad',
        filterLive: 'filter_live',
        filterUnfollowedLive: 'filter_unfollowed_live',
        filterKeyword: 'filter_keyword',
        keywordRegex: 'keyword_regex'
    };

    /**
     * 关键词正则缓存，避免每条视频都重复编译正则。
     */
    const keywordRegexCache = {
        source: null,
        regex: null,
        error: null
    };

    /**
     * 获取当前脚本配置项。
     */
    function getConfigs() {
        return {
            filterAd: GM_getValue(STORAGE_KEYS.filterAd, true),
            filterLive: GM_getValue(STORAGE_KEYS.filterLive, false),
            filterUnfollowedLive: GM_getValue(
                STORAGE_KEYS.filterUnfollowedLive,
                true
            ),
            filterKeyword: GM_getValue(STORAGE_KEYS.filterKeyword, false),
            keywordRegex: GM_getValue(STORAGE_KEYS.keywordRegex, '')
        };
    }

    /**
     * 等待 document.body 创建完成。
     */
    function waitForBody() {
        if (document.body) {
            return Promise.resolve(document.body);
        }

        return new Promise(resolve => {
            const observer = new MutationObserver(() => {
                if (!document.body) {
                    return;
                }

                observer.disconnect();
                resolve(document.body);
            });

            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
        });
    }

    /**
     * 在页面右上角显示轻量级 Toast 通知。
     */
    async function showToast(message) {
        const body = await waitForBody();

        let toastContainer = document.getElementById(
            'douyin-filter-toast-container'
        );

        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'douyin-filter-toast-container';
            toastContainer.style.cssText = [
                'position: fixed',
                'top: 20px',
                'right: 20px',
                'z-index: 2147483647',
                'display: flex',
                'flex-direction: column',
                'align-items: flex-end',
                'gap: 10px',
                'pointer-events: none'
            ].join(';');

            body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');

        toast.style.cssText = [
            'max-width: 360px',
            'background: rgba(0, 0, 0, 0.88)',
            'color: #fff',
            'padding: 10px 16px',
            'border-radius: 8px',
            'font-size: 14px',
            'line-height: 1.6',
            'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2)',
            'opacity: 0',
            'transform: translateY(-8px)',
            'transition: opacity 0.25s ease, transform 0.25s ease',
            'white-space: pre-line',
            'word-break: break-word'
        ].join(';');

        toast.textContent = message;
        toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-8px)';

            setTimeout(() => {
                toast.remove();

                if (
                    toastContainer &&
                    toastContainer.childElementCount === 0
                ) {
                    toastContainer.remove();
                }
            }, 300);
        }, 3000);
    }

    /**
     * 切换布尔配置。
     */
    function toggleConfig(key, currentValue, message) {
        const nextValue = !currentValue;

        GM_setValue(key, nextValue);
        updateMenu();

        showToast(`${message}：${nextValue ? '已开启' : '已关闭'}`);
    }

    /**
     * 注册或更新油猴菜单。
     */
    function updateMenu() {
        if (typeof GM_registerMenuCommand !== 'function') {
            return;
        }

        const configs = getConfigs();
        const baseOptions = {
            autoClose: false,
            nested: false
        };

        GM_registerMenuCommand(
            `${configs.filterAd ? '✅' : '❌'} 过滤广告`,
            () => {
                toggleConfig(
                    STORAGE_KEYS.filterAd,
                    configs.filterAd,
                    '广告过滤'
                );
            },
            {
                id: 'filter_ad',
                ...baseOptions
            }
        );

        GM_registerMenuCommand(
            `${configs.filterLive ? '✅' : '❌'} 过滤所有直播`,
            () => {
                toggleConfig(
                    STORAGE_KEYS.filterLive,
                    configs.filterLive,
                    '所有直播过滤'
                );
            },
            {
                id: 'filter_live',
                ...baseOptions
            }
        );

        GM_registerMenuCommand(
            `${configs.filterUnfollowedLive ? '✅' : '❌'} 过滤未关注直播`,
            () => {
                toggleConfig(
                    STORAGE_KEYS.filterUnfollowedLive,
                    configs.filterUnfollowedLive,
                    '未关注直播过滤'
                );
            },
            {
                id: 'filter_unfollowed_live',
                ...baseOptions
            }
        );

        GM_registerMenuCommand(
            `${configs.filterKeyword ? '✅' : '❌'} 过滤关键词`,
            () => {
                toggleConfig(
                    STORAGE_KEYS.filterKeyword,
                    configs.filterKeyword,
                    '关键词过滤'
                );
            },
            {
                id: 'filter_keyword',
                ...baseOptions
            }
        );

        GM_registerMenuCommand(
            '📝 设置关键词正则',
            () => {
                const currentValue = GM_getValue(
                    STORAGE_KEYS.keywordRegex,
                    ''
                );

                const input = window.prompt(
                    [
                        '请输入用于过滤视频的正则表达式：',
                        '',
                        '支持以下格式：',
                        '游戏|抽奖|兼职',
                        '/游戏|抽奖|兼职/i',
                        '/^(广告|推广)$/i',
                        '',
                        '将同时匹配 caption、desc 和 video_tag[].tag_name。',
                        '清空输入即可删除当前规则。'
                    ].join('\n'),
                    currentValue
                );

                if (input === null) {
                    return;
                }

                const value = input.trim();

                if (value) {
                    try {
                        compileKeywordRegex(value);
                    } catch (error) {
                        window.alert(
                            `正则表达式无效：\n\n${error.message}`
                        );
                        return;
                    }
                }

                GM_setValue(STORAGE_KEYS.keywordRegex, value);
                resetKeywordRegexCache();
                updateMenu();

                if (value) {
                    showToast(`关键词正则已更新：\n${value}`);
                } else {
                    showToast('关键词正则已清空');
                }
            },
            {
                id: 'keyword_regex',
                ...baseOptions
            }
        );
    }

    /**
     * 清空关键词正则缓存。
     */
    function resetKeywordRegexCache() {
        keywordRegexCache.source = null;
        keywordRegexCache.regex = null;
        keywordRegexCache.error = null;
    }

    /**
     * 编译用户输入的正则。
     *
     * 支持：
     * 1. 游戏|抽奖|兼职
     * 2. /游戏|抽奖|兼职/i
     * 3. /pattern/flags
     *
     * 普通文本形式默认使用 i 标志，忽略大小写。
     */
    function compileKeywordRegex(input) {
        if (typeof input !== 'string' || !input.trim()) {
            return null;
        }

        const value = input.trim();

        if (keywordRegexCache.source === value) {
            if (keywordRegexCache.error) {
                throw keywordRegexCache.error;
            }

            return keywordRegexCache.regex;
        }

        let pattern = value;
        let flags = 'i';

        /*
         * 识别 /pattern/flags 格式。
         * 使用最后一个未转义的 / 作为正则结尾。
         */
        if (value.startsWith('/')) {
            let closingSlashIndex = -1;

            for (let index = value.length - 1; index > 0; index--) {
                if (value[index] !== '/') {
                    continue;
                }

                let backslashCount = 0;

                for (
                    let cursor = index - 1;
                    cursor >= 0 && value[cursor] === '\\';
                    cursor--
                ) {
                    backslashCount++;
                }

                if (backslashCount % 2 === 0) {
                    closingSlashIndex = index;
                    break;
                }
            }

            if (closingSlashIndex > 0) {
                pattern = value.slice(1, closingSlashIndex);
                flags = value.slice(closingSlashIndex + 1);

                if (!/^[dgimsuvy]*$/.test(flags)) {
                    throw new Error(`不支持的正则标志：${flags}`);
                }
            }
        }

        try {
            const regex = new RegExp(pattern, flags);

            keywordRegexCache.source = value;
            keywordRegexCache.regex = regex;
            keywordRegexCache.error = null;

            return regex;
        } catch (error) {
            keywordRegexCache.source = value;
            keywordRegexCache.regex = null;
            keywordRegexCache.error = error;

            throw error;
        }
    }

    /**
     * 使用正则测试文本。
     *
     * 当正则包含 g 或 y 标志时，RegExp.test 会修改 lastIndex，
     * 因此每次测试前都需要重置。
     */
    function regexTest(regex, text) {
        regex.lastIndex = 0;
        return regex.test(text);
    }

    /**
     * 获取视频中需要参与关键词匹配的所有文本。
     */
    function getKeywordTexts(item) {
        const texts = [];

        if (!item || typeof item !== 'object') {
            return texts;
        }

        if (typeof item.caption === 'string' && item.caption) {
            texts.push(item.caption);
        }

        if (typeof item.desc === 'string' && item.desc) {
            texts.push(item.desc);
        }

        if (Array.isArray(item.video_tag)) {
            for (const tag of item.video_tag) {
                if (
                    tag &&
                    typeof tag.tag_name === 'string' &&
                    tag.tag_name
                ) {
                    texts.push(tag.tag_name);
                }
            }
        }

        return texts;
    }

    /**
     * 判断视频是否命中关键词正则。
     */
    function matchKeyword(item, regexText) {
        if (!regexText) {
            return false;
        }

        let regex;

        try {
            regex = compileKeywordRegex(regexText);
        } catch (error) {
            console.error(
                '[抖音 Feed 过滤] 关键词正则编译失败：',
                regexText,
                error
            );

            return false;
        }

        if (!regex) {
            return false;
        }

        const texts = getKeywordTexts(item);

        return texts.some(text => regexTest(regex, text));
    }

    /**
     * 判断是否为广告。
     */
    function isAdvertisement(item) {
        return Boolean(
            item &&
            (
                item.is_ads === true ||
                item.ad_candidates ||
                item.raw_ad_data ||
                item.web_raw_data?.raw_ad_data
            )
        );
    }

    /**
     * 判断是否为直播内容。
     */
    function isLiveContent(item) {
        if (!item || typeof item !== 'object') {
            return false;
        }

        const roomId = item.author?.room_id;

        return Boolean(
            item.cell_room ||
            item.room ||
            item.live_room ||
            (
                roomId !== undefined &&
                roomId !== null &&
                roomId !== 0 &&
                roomId !== '0'
            )
        );
    }

    /**
     * 判断作者是否为已关注状态。
     */
    function isFollowedAuthor(item) {
        const followStatus = Number(item?.author?.follow_status ?? 0);

        /*
         * 抖音常见状态：
         * 0：未关注
         * 1：已关注
         * 2：互相关注
         *
         * 因此大于 0 时视为已关注。
         */
        return followStatus > 0;
    }

    /**
     * 解析并过滤 Feed 数据。
     */
    function filterFeedData(jsonData, configs) {
        const result = {
            json: jsonData,
            adCount: 0,
            liveCount: 0,
            keywordCount: 0
        };

        if (!jsonData || !Array.isArray(jsonData.aweme_list)) {
            return result;
        }

        jsonData.aweme_list = jsonData.aweme_list.filter(item => {
            if (configs.filterAd && isAdvertisement(item)) {
                result.adCount++;
                return false;
            }

            if (
                configs.filterKeyword &&
                configs.keywordRegex &&
                matchKeyword(item, configs.keywordRegex)
            ) {
                result.keywordCount++;
                return false;
            }

            if (isLiveContent(item)) {
                if (configs.filterLive) {
                    result.liveCount++;
                    return false;
                }

                if (
                    configs.filterUnfollowedLive &&
                    !isFollowedAuthor(item)
                ) {
                    result.liveCount++;
                    return false;
                }
            }

            return true;
        });

        return result;
    }

    /**
     * 判断请求是否为抖音首页 Feed 接口。
     */
    function isFeedRequest(url) {
        if (!url) {
            return false;
        }

        return String(url).includes('/aweme/v1/web/tab/feed');
    }

    /**
     * 构建过滤统计通知。
     */
    function showFilterResultToast({
        adCount,
        liveCount,
        keywordCount
    }) {
        if (
            adCount === 0 &&
            liveCount === 0 &&
            keywordCount === 0
        ) {
            return;
        }

        const lines = ['已为您净化 Feed 流：'];

        if (adCount > 0) {
            lines.push(`🚫 广告 × ${adCount}`);
        }

        if (liveCount > 0) {
            lines.push(`📺 直播 × ${liveCount}`);
        }

        if (keywordCount > 0) {
            lines.push(`🔍 关键词 × ${keywordCount}`);
        }

        showToast(lines.join('\n'));
    }

    /**
     * 创建替换后的 Response，并保留原始响应属性。
     */
    function createFilteredResponse(originalResponse, jsonData) {
        const headers = new Headers(originalResponse.headers);

        /*
         * 内容已经重新序列化，原始长度不再有效。
         */
        headers.delete('content-length');
        headers.delete('Content-Length');

        return new Response(JSON.stringify(jsonData), {
            status: originalResponse.status,
            statusText: originalResponse.statusText,
            headers
        });
    }

    updateMenu();

    if (!window.Vista) {
        console.error(
            '[抖音 Feed 过滤] Vista 加载失败，无法拦截网络请求。'
        );
        return;
    }

    const {
        Vista,
        interceptFetch,
        interceptXHR
    } = window.Vista;

    new Vista([interceptFetch, interceptXHR])
        .use(async (context, next) => {
            await next();

            if (
                !isFeedRequest(context.req?.url) ||
                !context.res
            ) {
                return;
            }

            try {
                const responseClone = context.res.clone();
                const rawText = await responseClone.text();

                if (!rawText) {
                    return;
                }

                const jsonData = JSON.parse(rawText);
                const configs = getConfigs();
                const result = filterFeedData(jsonData, configs);

                showFilterResultToast(result);

                context.res = createFilteredResponse(
                    context.res,
                    result.json
                );
            } catch (error) {
                console.error(
                    '[抖音 Feed 过滤] Feed 数据拦截处理异常：',
                    error
                );
            }
        })
        .intercept();
})();
