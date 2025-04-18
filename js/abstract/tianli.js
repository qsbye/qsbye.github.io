function runPostAbstract() {

    // 获取挂载元素，即文章内容所在的容器元素
    let targetElement = document.querySelector('#post #article-container');
    // 若el配置不存在则自动获取，如果auto_mount配置为真也自动获取
    if (!targetElement) {
        return;
    };

    let ai =  GLOBAL_CONFIG.source.postAi.ai;
    let randomNum = GLOBAL_CONFIG.source.postAi.randomNum; //按钮最大的随机次数，也就是一篇文章最大随机出来几种
    let basicWordCount = GLOBAL_CONFIG.source.postAi.basicWordCount; // 最低获取字符数, 最小1000, 最大1999
    let btnLink = GLOBAL_CONFIG.source.postAi.btnLink;
    let gptName = GLOBAL_CONFIG.source.postAi.gptName;
    let modeName = GLOBAL_CONFIG.source.postAi.modeName;
    let switchBtn = GLOBAL_CONFIG.source.postAi.switchBtn //# 可以配置是否显示切换按钮 以切换tianli/local
    let keys = GLOBAL_CONFIG.source.postAi.keys;
    let Referers = GLOBAL_CONFIG.source.postAi.Referers;

    // 当前随机到的ai摘要到index
    let lastAiRandomIndex = -1;
    let animationRunning = true; // 标志变量，控制动画函数的运行
    // 当前gpt模式
    let mode = modeName
    // 刷新点击次数
    let refreshNum = 0
    // 记录上一次传递给aiAbstract的参数
    let prevParam;
    const aiTitleRefreshIcon = document.querySelector(".abstract-title .icon-arrow-rotate-right")
    const explanation = document.querySelector("#abstract-content");
    const post_ai = document.querySelector("#abstract-content");
    let ai_str = "";
    let ai_str_length = "";
    let delay_init = 600;
    let i = 0;
    let j = 0;
    let sto = [];
    let elapsed = 0;
    const animate = timestamp => {
        if (!animationRunning) {
            return; // 动画函数停止运行
        }
        if (!animate.start) animate.start = timestamp;
        elapsed = timestamp - animate.start;
        if (elapsed >= 20) {
            animate.start = timestamp;
            if (i < ai_str_length - 1) {
                let char = ai_str.charAt(i + 1);
                let delay = /[,.，。!?！？]/.test(char) ? 150 : 20;
                if (explanation.firstElementChild) {
                    explanation.removeChild(explanation.firstElementChild);
                }
                explanation.innerHTML += char;
                let div = document.createElement("div");
                div.className = "ai-cursor";
                explanation.appendChild(div);
                i++;
                if (delay === 150) {
                    document.querySelector("#abstract-content .ai-cursor").style.opacity = "0";
                }
                if (i === ai_str_length - 1) {
                    observer.disconnect(); // 暂停监听
                    explanation.removeChild(explanation.firstElementChild);
                }
                sto[0] = setTimeout(() => {
                    requestAnimationFrame(animate);
                }, delay);
            }
        } else {
            requestAnimationFrame(animate);
        }
    };
    const observer = new IntersectionObserver(
        entries => {
            let isVisible = entries[0].isIntersecting;
            animationRunning = isVisible; // 标志变量更新
            if (animationRunning) {
                delay_init = i === 0 ? 200 : 20;
                sto[1] = setTimeout(() => {
                    if (j) {
                        i = 0;
                        j = 0;
                    }
                    if (i === 0) {
                        explanation.innerHTML = ai_str.charAt(0);
                    }
                    requestAnimationFrame(animate);
                }, delay_init);
            }
        },
        { threshold: 0 }
    );
    function clearSTO() {
        if (sto.length) {
            sto.forEach(item => {
                if (item) {
                    clearTimeout(item);
                }
            });
        }
    }
    function startAI(str, df = true) {
        i = 0; //重置计数器
        j = 1;
        clearSTO();
        animationRunning = false;
        elapsed = 0;
        observer.disconnect(); // 暂停上一次监听
        explanation.innerHTML = df ? "生成中. . ." : "请等待. . .";
        ai_str = str;
        ai_str_length = ai_str.length;
        observer.observe(post_ai); //启动新监听
    }

    async function aiAbstract(num = basicWordCount) {
        i = 0; //重置计数器
        j = 1;
        clearSTO();
        animationRunning = false;
        elapsed = 0;
        observer.disconnect(); // 暂停上一次监听
        if (mode === "tianli") {
            num = Math.max(10, Math.min(2000, num));
            const options = {
                key: keys,
                Referer: Referers
            };

            const truncateDescription = getTitleAndContent(num);
            const requestBody = {
                key: options.key,
                content: truncateDescription,
                url: location.href,
            };
            const requestOptions = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Referer: options.Referer
                },
                body: JSON.stringify(requestBody),
            };
            try {
                let animationInterval = null
                if (animationInterval) clearInterval(animationInterval);
                animationInterval = setInterval(() => {
                    const animationText = "生成中" + ".".repeat(j);
                    explanation.innerHTML = animationText;
                    j = (j % 3) + 1; // 在 1、2、3 之间循环
                }, 500);
                const response = await fetch(`https://summary.tianli0.top/`, requestOptions);
                let result;
                if (response.status === 403) {
                    result = {
                        summary: "403 refer与key不匹配，本地无法显示。"
                    }
                } else if (response.status === 500) {
                    result = {
                        summary: "500 系统内部错误"
                    }
                } else {
                    result = await response.json();
                }
                const summary = result.summary.trim();
                setTimeout(() => {
                    aiTitleRefreshIcon.style.opacity = "1";
                }, 300)
                if (summary) {
                    startAI(summary);
                } else {
                    startAI("摘要获取失败!!!请检查Tianli服务是否正常!!!");
                }
                clearInterval(animationInterval)

            } catch (error) {
                console.error(error);
                explanation.innerHTML = "发生异常" + error;
            }
        } else {
            const strArr = ai.split(",").map(item => item.trim()); // 将字符串转换为数组，去除每个字符串前后的空格
            if (strArr.length !== 1) {
                let randomIndex = Math.floor(Math.random() * strArr.length); // 随机生成一个索引
                while (randomIndex === lastAiRandomIndex) { // 如果随机到了上次的索引
                    randomIndex = Math.floor(Math.random() * strArr.length); // 再次随机
                }
                lastAiRandomIndex = randomIndex; // 更新上次随机到的索引
                startAI(strArr[randomIndex]);
            } else {
                startAI(strArr[0])
            }
            setTimeout(() => {
                aiTitleRefreshIcon.style.opacity = "1";
            }, 600)
        }
    }

    function aiRecommend() {
        i = 0; //重置计数器
        j = 1;
        clearSTO();
        animationRunning = false;
        elapsed = 0;
        explanation.innerHTML = "生成中. . .";
        ai_str = "";
        ai_str_length = "";
        observer.disconnect(); // 暂停上一次监听
        sto[2] = setTimeout(() => {
            explanation.innerHTML = recommendList();
        }, 600);
    }
    function aiGoHome() {
        startAI("前往爱发电购买...", false);
        sto[2] = setTimeout(() => {
            pjax.loadUrl("/");
        }, 1000);
    }

    function Introduce() {
        if (mode == "tianli") {
            startAI("我是文章辅助AI: TianliGPT，点击下方的按钮，让我生成本文简介、推荐相关文章等。")
        } else {
            startAI("我是文章辅助AI: " + gptName + " GPT，点击下方的按钮，让我生成本文简介、推荐相关文章等。")
        }
    }
    function aiTitleRefreshIconClick() {
        aiTitleRefreshIcon.click()
    }
    const aiBtnList = document.querySelectorAll(".abstract-btn-item");
    const aiFunctions = [Introduce, aiTitleRefreshIconClick, aiRecommend, aiGoHome];
    const filteredHeadings = Array.from(aiBtnList).filter(heading => heading.id !== "go-tianli-blog");
    filteredHeadings.forEach((item, index) => {
        item.addEventListener("click", () => {
            aiFunctions[index]();
        });
    });

    function recommendList() {
        let thumbnail = document.querySelectorAll('.relatedPosts-list a');
        var title = document.title;
        let list = '';
        let index = 0;
        if (!thumbnail.length) {
            const cardRecentPost = document.querySelector('.card-widget.card-recent-post');
            if (!cardRecentPost) return '';

            thumbnail = cardRecentPost.querySelectorAll('.aside-list-item a');

            if(thumbnail.length>0){
                thumbnail.forEach(item => {
                    if (item) {
                        if(!title.includes(item.title)){
                            index +=1;
                            list += `<div class="ai-recommend-item"><span class="index">${i + 1}：</span><a href="javascript:;" onclick="pjax.loadUrl('${item.href}')" title="${item.title}">${item.title}</a></div>`;
                        }
                    }
                });
            }
            return `很抱歉，无法找到类似的文章，你也可以看看本站最新发布的文章：<br /><div class="ai-recommend">${list}</div>`;
        }
        thumbnail.forEach(item => {
            if (item) {
                if(!title.includes(item.title)){
                    index +=1;
                    list += `<div class="ai-recommend-item"><span>推荐${index}：</span><a href="javascript:;" onclick="pjax.loadUrl('${item.href}')" title="${item.title}">${item.title}</a></div>`;
                }
            }
        });
        return `推荐文章：<br /><div class="ai-recommend">${list}</div>`;
    }


    function changeShowMode() {
        if (mode === "tianli") {
            mode = "local";
            document.getElementById("abstract-tag").innerHTML = gptName + " GPT";
            if ((document.getElementById("go-tianli-blog").style.display = "block")) {
                document.querySelectorAll(".abstract-btn-item").forEach(item => (item.style.display = "block"));
                document.getElementById("go-tianli-blog").style.display = "none";
            }
            aiAbstract(basicWordCount);
        } else {
            mode = "tianli";
            document.getElementById("abstract-tag").innerHTML = "Tianli GPT";

            const truncateDescription = getTitleAndContent(basicWordCount);
            let value = Math.floor(Math.random() * randomNum) + basicWordCount;
            while (value === prevParam || truncateDescription.length - value === prevParam) {
                value = Math.floor(Math.random() * randomNum) + basicWordCount;
            }
            aiTitleRefreshIcon.style.opacity = "0.2";
            aiTitleRefreshIcon.style.transitionDuration = "0.3s";
            aiTitleRefreshIcon.style.transform = "rotate(" + 360 * refreshNum + "deg)";
            if (truncateDescription.length <= 1000) {
                let param = truncateDescription.length - Math.floor(Math.random() * randomNum);
                while (param === prevParam) {
                    param = truncateDescription.length - Math.floor(Math.random() * randomNum);
                }
                aiAbstract(param);
                prevParam = param;
            } else {
                aiAbstract(value);
                prevParam = value;
            }
            refreshNum++;
        }
    }

    //- 监听tag点击事件
    document.getElementById("abstract-tag").addEventListener("click", () => {
        if (mode === "tianli") {
            document.querySelectorAll(".abstract-btn-item").forEach(item => item.style.display = "none");
            document.getElementById("go-tianli-blog").style.display = "block";
            startAI("你好，我是Tianli开发的摘要生成助理TianliGPT，是一个基于GPT-4的生成式AI。我在这里只负责摘要的预生成和显示，你无法与我直接沟通，如果你也需要一个这样的AI摘要接口，可以在下方购买。（暂未开放购买，敬请期待）")
        } else {
            document.getElementById("go-tianli-blog").style.display = "none";
            startAI("你好，我是本站摘要生成助理" + gptName + " GPT，是一个基于GPT-4的生成式AI。我在这里只负责摘要的预生成和显示，你无法与我直接沟通。")
        }

    });

    aiTitleRefreshIcon.addEventListener("click", () => {
        const truncateDescription = getTitleAndContent(basicWordCount);
        let value = Math.floor(Math.random() * randomNum) + basicWordCount;
        while (value === prevParam || truncateDescription.length - value === prevParam) {
            value = Math.floor(Math.random() * randomNum) + basicWordCount;
        }
        aiTitleRefreshIcon.style.opacity = "0.2";
        aiTitleRefreshIcon.style.transitionDuration = "0.3s";
        aiTitleRefreshIcon.style.transform = "rotate(" + 360 * refreshNum + "deg)";
        if (truncateDescription.length <= 1000) {
            let param = truncateDescription.length - Math.floor(Math.random() * randomNum);
            while (param === prevParam) {
                param = truncateDescription.length - Math.floor(Math.random() * randomNum);
            }
            aiAbstract(param);
            prevParam = param;
        } else {
            aiAbstract(value);
            prevParam = value;
        }
        showAiBtn();
        refreshNum++;
    });

    document.getElementById("go-tianli-blog").addEventListener("click", () => {
        window.open(btnLink, "_blank");
    });

    if (switchBtn) {
        document.getElementById("abstract-toggle").addEventListener("click", () => {
            changeShowMode()
        });
    }

    function showAiBtn() {
        document.querySelectorAll(".abstract-btn-item").forEach(item => {
            if (item.id !== "go-tianli-blog") {
                item.style.display = "block";
            }
            if (item.id === "go-tianli-blog") {
                item.style.display = "none";
            }
        });
    }

    //读取文章中的所有文本
    function getTitleAndContent(basicWordCount) {
        try {
            const title = document.title;
            const container = document.querySelector('#post #article-container');
            if (!container) {
                console.warn('TianliGPT：找不到文章容器。请尝试将引入的代码放入到文章容器之后。如果本身没有打算使用摘要功能可以忽略此提示。');
                return '';
            }
            const paragraphs = container.getElementsByTagName('p');

            const headings = container.querySelectorAll('h1, h2, h3, h4, h5');
            let content = '';

            for (let h of headings) {
                content += h.innerText + ' ';
            }

            for (let p of paragraphs) {
                // 移除包含'http'的链接
                const filteredText = p.innerText.replace(/https?:\/\/[^\s]+/g, '');
                content += filteredText;
            }

            const combinedText = title + ' ' + content;
            let wordLimit = 1000;
            if (basicWordCount !== "undefined") {
                wordLimit = basicWordCount;
            }
            const truncatedText = combinedText.slice(0, wordLimit);
            return truncatedText;
        } catch (e) {
            console.error('TianliGPT错误：可能由于一个或多个错误导致没有正常运行，原因出在获取文章容器中的内容失败，或者可能是在文章转换过程中失败。', e);
            return '';
        }
    }

    aiAbstract();
    showAiBtn();
}