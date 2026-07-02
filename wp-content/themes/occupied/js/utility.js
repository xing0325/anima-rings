
class AnimationManager {
    constructor() {
        this.animations = [];
        this.resizeHandler = null;
        this.updateTimeout = null;
    }

    register(cleanupFunction) {
        if (typeof cleanupFunction === 'function') {
            this.animations.push(cleanupFunction);
        }
        return this;
    }

    setResizeHandler(handler) {
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        this.resizeHandler = handler;
        window.addEventListener('resize', this.resizeHandler);
        return this;
    }

    setTimeout(callback, delay) {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        this.updateTimeout = setTimeout(callback, delay);
        return this;
    }

    initializeBase() {
        ScrollTrigger.getAll().forEach(st => st.kill());
        return this;
    }

    destroy() {
        ScrollTrigger.getAll().forEach(st => st.kill());

        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }

        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = null;
        }

        this.animations.forEach(cleanup => {
            if (typeof cleanup === 'function') {
                cleanup();
            }
        });
        this.animations = [];
    }
}

window.animationManager = new AnimationManager();


function lenisInitialize() {
    gsap.registerPlugin(ScrollTrigger);
    
    // Create Lenis instance with scrollTop reset
    const lenis = new Lenis({
        // Add any existing options you have
        // Then add this to ensure it doesn't override your scrollTo command
        smoothWheel: true,
        wheelMultiplier: 1.2,
        infinite: false,
        anchors: true
    });


    window.lenisInstance = lenis;

    const anchorLinks = Array.from(document.querySelectorAll('a[href^="#"]'));
    const anchorCleanup = [];

    anchorLinks.forEach((link) => {
        const handler = (event) => {
            const href = link.getAttribute("href");
            if (!href || href === "#" || href === "#0") {
                return;
            }

            // ignore external hashes
            if (!href.startsWith("#")) {
                return;
            }

            const target = document.querySelector(href);
            if (!target) {
                return;
            }

            event.preventDefault();

            const durationAttr = parseFloat(link.getAttribute("data-scroll-duration"));
            const offsetAttr = parseFloat(link.getAttribute("data-scroll-offset"));

            lenis.scrollTo(target, {
                duration: isNaN(durationAttr) ? 1.5 : durationAttr,
                offset: isNaN(offsetAttr) ? 0 : offsetAttr,
                // ease out cubic
                easing: (t) => 1 - Math.pow(1 - t, 3)
            });
        };

        link.addEventListener("click", handler);
        anchorCleanup.push(() => link.removeEventListener("click", handler));
    });

    // Force scroll to top immediately
    lenis.scrollTo(0, { immediate: true });

    // Add this to handle page refresh/reload
    window.history.scrollRestoration = "manual";
    
    lenis.on("scroll", ScrollTrigger.update);

    const tickerCallback = (time) => {
        lenis.raf(time * 1000);
    };

    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    // Force browser scroll to top as well
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // 返回清理函數
    return () => {
        if (lenis) {
            lenis.destroy();
            gsap.ticker.remove(tickerCallback);
        }

        anchorCleanup.forEach((cleanup) => cleanup());
        window.lenisInstance = undefined;
    };
}



function customCursor() {
    let cursorItem = document.querySelector(".cursor");
    if (!cursorItem) {
        return () => { }; // Return empty cleanup if no cursor element exists
    }

    let cursorParagraph = cursorItem.querySelector("p");
    let targets = document.querySelectorAll("[data-cursor]");
    let xOffset = 6;
    let yOffset = 50;
    let cursorIsOnRight = false;
    let currentTarget = null;
    let lastText = '';

    // Position cursor relative to actual cursor position on page load
    gsap.set(cursorItem, { xPercent: xOffset, yPercent: yOffset });

    // Use GSAP quick.to for a more performative tween on the cursor
    let xTo = gsap.quickTo(cursorItem, "x", { ease: "power3" });
    let yTo = gsap.quickTo(cursorItem, "y", { ease: "power3" });

    // Create the mousemove handler
    const mouseMoveHandler = (e) => {
        let windowWidth = window.innerWidth;
        let windowHeight = window.innerHeight;
        let scrollY = window.scrollY;
        let cursorX = e.clientX;
        let cursorY = e.clientY + scrollY;

        // Default offsets
        let xPercent = xOffset;
        let yPercent = yOffset;

        // Adjust X offset if in the rightmost 19% of the window
        if (cursorX > windowWidth * 0.66) {
            cursorIsOnRight = true;
            xPercent = -100;
        } else {
            cursorIsOnRight = false;
        }

        // Adjust Y offset if in the bottom 10% of the current viewport
        if (cursorY > scrollY + windowHeight * 0.9) {
            yPercent = -120;
        }

        if (currentTarget) {
            let newText = currentTarget.getAttribute("data-cursor");
            if (currentTarget.hasAttribute("data-easteregg") && cursorIsOnRight) {
                newText = currentTarget.getAttribute("data-easteregg");
            }

            if (newText !== lastText) {
                cursorParagraph.innerHTML = newText;
                lastText = newText;
            }
        }

        gsap.to(cursorItem, { xPercent: xPercent, yPercent: yPercent, duration: 0.9, ease: "power3" });
        xTo(cursorX);
        yTo(cursorY - scrollY);
    };

    // Create the mouseenter handlers
    const mouseEnterHandlers = new Map();
    targets.forEach(target => {
        const handler = () => {
            currentTarget = target;

            let newText = target.hasAttribute("data-easteregg")
                ? target.getAttribute("data-easteregg")
                : target.getAttribute("data-cursor");

            if (newText !== lastText) {
                cursorParagraph.innerHTML = newText;
                lastText = newText;
            }
        };

        mouseEnterHandlers.set(target, handler);
        target.addEventListener("mouseenter", handler);
    });

    // Add event listeners
    window.addEventListener("mousemove", mouseMoveHandler);

    // Return cleanup function
    return () => {
        // Remove mousemove listener
        window.removeEventListener("mousemove", mouseMoveHandler);

        // Remove all mouseenter listeners
        mouseEnterHandlers.forEach((handler, target) => {
            target.removeEventListener("mouseenter", handler);
        });

        // Reset cursor state
        if (cursorItem) {
            gsap.set(cursorItem, { clearProps: "all" });
        }

        // Clear GSAP tweens
        if (xTo && xTo.kill) xTo.kill();
        if (yTo && yTo.kill) yTo.kill();

        // Clear variables
        currentTarget = null;
        lastText = '';
    };
}



function lottieAnimation() {
    // 檢查 lottie 庫是否存在
    if (typeof lottie === 'undefined') {
        console.error("Lottie library not found");
        return () => { };
    }

    // 獲取動畫容器
    const container = document.getElementById('animation-container');

    // 如果容器不存在，返回空的清理函數
    if (!container) {
        console.warn("Animation container not found");
        return () => { };
    }

    // 初始化 Lottie 動畫
    const animation = lottie.loadAnimation({
        container: container,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://vegan.ning-h.com/wp-content/uploads/sites/2/2025/03/face.json' // 動畫 JSON 檔案路徑
    });

    // 確保動畫已成功載入
    animation.addEventListener('data_ready', () => {
        console.log("Lottie animation loaded successfully");
    });

    // 錯誤處理
    animation.addEventListener('data_failed', () => {
        console.error("Failed to load Lottie animation");
    });

    // 返回清理函數
    return () => {
        // 停止並銷毀動畫
        if (animation) {
            animation.stop();
            animation.destroy();
        }

        // 清理容器內容（可選）
        if (container) {
            container.innerHTML = '';
        }
    };
}



function parallaxSectionAnimation() {
    // 追踪所有創建的 timelines
    const timelines = [];

    // 選取所有 sect-parallax 元素
    const clipSects = document.querySelectorAll("[sect-parallax]");

    clipSects.forEach(sect => {
        // 在每個 sect 內尋找對應的 inner 元素
        const clipInner = sect.querySelector("[sect-inner]");
        const end = sect.getAttribute("end") || "bottom top";

        // 設定初始狀態
        gsap.set(sect, {
            clipPath: 'inset(0rem 0rem 0rem round 0px)'
        });

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: clipInner,
                start: "+=30",
                end: end,
                scrub: 0.3,
            }
        });

        tl.to(sect, {
            clipPath: 'inset(0rem 2rem 8rem round 0px 0px 10px 8px)',
        });

        // 追踪創建的 timeline
        timelines.push(tl);
    });

    // 返回清理函數
    return () => {
        // 清理所有 timeline
        timelines.forEach(tl => {
            if (tl.scrollTrigger) {
                tl.scrollTrigger.kill();
            }
            tl.kill();
        });

        // 重置所有元素的樣式
        clipSects.forEach(sect => {
            gsap.set(sect, { clearProps: "all" });
        });
    };
}


function parallaxEffect() {
    const animations = [];

    gsap.utils.toArray("[parallax-y]").forEach((section, i) => {
        const heightDiff = section.offsetHeight - section.parentElement.offsetHeight;

        const tween = gsap.fromTo(section, {
            y: -heightDiff
        }, {
            scrollTrigger: {
                trigger: section,
                scrub: true
            },
            y: 0,
            ease: "none"
        });

        animations.push(tween);
    });

    // 返回清理函數
    return () => {
        animations.forEach(tween => {
            if (tween.scrollTrigger) {
                tween.scrollTrigger.kill();
            }
            tween.kill();
        });
    };
}


function scrollTextReveal() {
    let windowWidth = window.outerWidth;
    const splitInstances = [];
    const timelines = [];
    let resizeHandler;

    function cleanupCurrentAnimations() {
        // 清除現有的文字分割和動畫
        splitInstances.forEach(split => split.revert());
        timelines.forEach(tl => {
            if (tl.scrollTrigger) {
                tl.scrollTrigger.kill();
            }
            tl.kill();
        });

        // 清空陣列
        splitInstances.length = 0;
        timelines.length = 0;

        // 移除所有 wrapper
        document.querySelectorAll('.lines-wrap').forEach(wrapper => {
            const parent = wrapper.parentNode;
            while (wrapper.firstChild) {
                parent.insertBefore(wrapper.firstChild, wrapper);
            }
            wrapper.remove();
        });
    }

    function createSplits() {
        document.querySelectorAll("[split-type='text']").forEach(function (myText) {
            const mySplitText = new SplitText(myText, {
                type: "lines",
                linesClass: "split-lines"
            });
            splitInstances.push(mySplitText);

            document.querySelectorAll(".split-lines").forEach(function (line) {
                if (!line.parentNode.classList.contains("lines-wrap")) {
                    let wrapper = document.createElement('div');
                    wrapper.className = 'lines-wrap overflow-clip';
                    line.parentNode.insertBefore(wrapper, line);
                    wrapper.appendChild(line);
                }
            });
        });
    }

    function createAnimations() {
        document.querySelectorAll("[split-type='line']").forEach(function (triggerElement) {
            let myText = triggerElement.querySelector("[split-type='text']");
            let targetElement = triggerElement.querySelectorAll(".split-lines");
            const delayStr = myText.getAttribute("delay");
            const delay = parseFloat(myText.getAttribute("delay")) || 0;
            const scrollTime = parseFloat(myText.getAttribute("scroll-duration")) || 0.5;
            const scrollStagger = parseFloat(myText.getAttribute("scroll-stagger")) || 0.04;

            let tl = gsap.timeline({
                scrollTrigger: {
                    trigger: triggerElement,
                    start: "top bottom",
                    end: "bottom center",
                    toggleActions: "play none none reverse",
                    scrub: 1,
                }
            });

            tl.from(targetElement, {
                yPercent: 100,
                delay: delay,
                skewX: 2,
                duration: scrollTime,
                ease: 'Sine.easeOut',
                stagger: {
                    each: scrollStagger,
                    from: 0
                }
            });

            timelines.push(tl);
        });
    }

    function initializeTextAnimations() {
        createSplits();
        createAnimations();
    }

    initializeTextAnimations();

    // 處理 resize
    resizeHandler = function () {
        if (window.outerWidth !== windowWidth) {
            cleanupCurrentAnimations();
            initializeTextAnimations();
            windowWidth = window.outerWidth;
        }
    };

    window.addEventListener("resize", resizeHandler);

    // 返回清理函數
    return () => {
        cleanupCurrentAnimations();
        window.removeEventListener("resize", resizeHandler);
    };
}




function marqueeAnimation() {
    // 存儲所有的 tween 和 ResizeObserver
    const animations = new Map();

    // 選擇所有的 marquee 元素
    const marquees = document.querySelectorAll('[wb-data="marquee"]');

    if (!marquees.length) {
        return () => { };
    }

    function setupMarquee(marquee) {
        const duration = parseInt(marquee.getAttribute("duration"), 10) || 5;
        const marqueeContent = marquee.firstElementChild;

        if (!marqueeContent) {
            console.warn('Marquee content element not found');
            return null;
        }

        // 創建並添加克隆元素
        const marqueeContentClone = marqueeContent.cloneNode(true);
        marquee.append(marqueeContentClone);

        function playMarquee() {
            let currentAnimation = animations.get(marquee);
            let progress = currentAnimation?.tween ? currentAnimation.tween.progress() : 0;

            // 如果存在之前的動畫，先清除
            if (currentAnimation?.tween) {
                currentAnimation.tween.progress(0).kill();
            }

            const width = parseInt(
                getComputedStyle(marqueeContent).getPropertyValue("width"),
                10
            );
            const gap = parseInt(
                getComputedStyle(marqueeContent).getPropertyValue("column-gap"),
                10
            );
            const distanceToTranslate = -1 * (gap + width);

            const tween = gsap.fromTo(
                marquee.children,
                { x: 0 },
                { x: distanceToTranslate, duration, ease: "none", repeat: -1 }
            );

            tween.progress(progress);

            return tween;
        }

        // 創建 ResizeObserver
        const resizeObserver = new ResizeObserver(() => {
            const newTween = playMarquee();
            animations.set(marquee, {
                tween: newTween,
                observer: resizeObserver,
                clone: marqueeContentClone
            });
        });

        // 開始觀察
        resizeObserver.observe(marqueeContent);

        // 初始播放
        const initialTween = playMarquee();

        // 儲存這個 marquee 的相關物件
        animations.set(marquee, {
            tween: initialTween,
            observer: resizeObserver,
            clone: marqueeContentClone
        });
    }

    // 設置所有 marquee
    marquees.forEach(setupMarquee);

    // 返回清理函數
    return () => {
        animations.forEach(({ tween, observer, clone }) => {
            if (tween) {
                tween.kill();
            }
            observer.disconnect();
            clone.remove();
        });
        animations.clear();
    };
}

function textLinkAnimation() {
    let windowWidth = window.innerWidth;
    const splitInstances = [];
    const timelines = [];
    const eventListeners = [];
    let resizeHandler;

    function cleanupCurrentAnimations() {
        // Clean up split instances
        splitInstances.forEach(split => {
            if (split && typeof split.revert === 'function') {
                split.revert();
            }
        });

        // Clean up timelines
        timelines.forEach(tl => {
            if (tl) {
                tl.kill();
            }
        });

        // Remove event listeners
        eventListeners.forEach(({ element, listeners }) => {
            element.removeEventListener("mouseenter", listeners.mouseenter);
            element.removeEventListener("mouseleave", listeners.mouseleave);
        });

        // Clear arrays
        splitInstances.length = 0;
        timelines.length = 0;
        eventListeners.length = 0;
    }

    function createSplits() {
        // Initialize SplitText for stagger-link elements
        document.querySelectorAll("[stagger-link]").forEach(function(element) {
            const staggerLinkSplit = new SplitText(element, {
                types: ["words"]
            });
            splitInstances.push(staggerLinkSplit);
        });

        // Initialize SplitText for hoverstagger text elements
        document.querySelectorAll("[hoverstagger='text']").forEach(function(element) {
            const staggerType = new SplitText(element, {
                type: "chars",
                charsClass: "char"
            });
            splitInstances.push(staggerType);
        });
    }

    function createAnimations() {
        // Select all elements with attribute [hoverstagger='link']
        document.querySelectorAll("[hoverstagger='link']").forEach((element, index) => {
            const text1 = element.querySelectorAll("[hoverstagger='text']")[0];
            const text2 = element.querySelectorAll("[hoverstagger='text']")[1];

            if (!text1 || !text2) return;  // Skip if required elements are missing

            const stagger = parseFloat(element.getAttribute("stagger")) || 0.03;
            const duration = parseFloat(element.getAttribute("duration")) || 0.3;

            const tl = gsap.timeline({
                paused: true,
                defaults: {
                    duration: 0.5,
                    ease: "power1.out"
                }
            });

            tl.to(Array.from(text1.querySelectorAll(".char")), {
                scaleY: 0,
                yPercent: -100,
                duration: duration,
                stagger: { each: stagger }
            });

            tl.from(Array.from(text2.querySelectorAll(".char")), {
                scaleY: 0,
                yPercent: 20,
                duration: duration,
                stagger: { each: stagger }
            }, 0);



            // Store timeline for cleanup
            timelines.push(tl);

            // Create event listeners
            const mouseenterHandler = () => tl.play();
            const mouseleaveHandler = () => tl.reverse();

            // Add event listeners
            element.addEventListener("mouseenter", mouseenterHandler);
            element.addEventListener("mouseleave", mouseleaveHandler);

            // Store event listeners for cleanup
            eventListeners.push({
                element,
                listeners: {
                    mouseenter: mouseenterHandler,
                    mouseleave: mouseleaveHandler
                }
            });
        });
    }

    function initializeTextAnimations() {
        createSplits();
        createAnimations();
    }

    initializeTextAnimations();

    // Handle resize
    resizeHandler = function () {
        if (window.innerWidth !== windowWidth) {
            cleanupCurrentAnimations();
            initializeTextAnimations();
            windowWidth = window.innerWidth;
        }
    };

    window.addEventListener("resize", resizeHandler);

    // Return cleanup function
    return () => {
        cleanupCurrentAnimations();
        window.removeEventListener("resize", resizeHandler);
    };
}










