

class ScriptManager {
    constructor() {
        this.cleanupFunctions = [];
        // 初始化時根據設備類型設置滾動（同時設置 html 和 body）
        const isMobile = window.innerWidth <= 600;
        if (isMobile) {
            // 手機版使用 auto，保持滾動功能
            document.documentElement.style.overflowY = 'auto';
            document.body.style.overflowY = 'auto';
        } else {
            // 桌面版使用 clip，禁用滾動
            document.documentElement.style.overflow = 'clip';
            document.body.style.overflow = 'clip';
        }
    }

    init() {
        
        this.initializeAnimations();
        window.scrollTo(0, 0);
    }

    initializeAnimations() {
        const cleanups = [
            preloaderAnimation(),
            mainScrollAnimation(),
            horizontalScrollAnimation(),
            initHeaderStickyBehavior(),
            textLinkAnimation(),
            parallaxEffect(),
            initListHoverEffect(),
            initStripScrollAnimation(),
            initCanvasTextAnimation(),
            initMenuAnimation(),
            // utility.js 的動畫
        ];

        cleanups.forEach(fn => {
            if (typeof fn === 'function') {
                window.animationManager.register(fn);
                this.cleanupFunctions.push(fn);
            }
        });

    }

    cleanup() {
        this.cleanupFunctions.forEach(fn => fn());
        this.cleanupFunctions = [];
        window.animationManager.destroy();
    }
}

function preloaderAnimation() {


    let loadTl = gsap.timeline({
        onComplete: () => {
            const lenisCleanup = lenisInitialize()
            
            // 將 lenis 清理函數註冊到 AnimationManager
            if (typeof lenisCleanup === 'function') {
                window.animationManager.register(lenisCleanup);
            }
            
            gsap.set(".preloader", {
                display: "none",
            });

            // 修復手機版 sticky 失效問題
            // 清除所有可能影響 sticky 的 overflow 設定
            const isMobile = window.innerWidth <= 600;
            if (isMobile) {
                // 移除所有 inline style 讓 CSS 正常工作
                document.documentElement.removeAttribute('style');
                document.body.removeAttribute('style');
            }
            
        }
    });



    loadTl.set(".preload-txt p", {
        yPercent: 100,
    });

    loadTl.set(".ball", {
        opacity: 0,
    });

    loadTl.to(".preload-txt", {
        autoAlpha: 1,
        duration: 0.3,
    });

    loadTl.to(".svg-char:not(.enter)", {
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 0% 100%)",
        duration: 1,
        ease: "power2.inOut",
    },0.5);

    loadTl.to(".preload-txt p", {
        yPercent: 0,
        duration: 0.8,
        stagger: 0.1,
        ease:  "power2.out",
    },0.5);


    loadTl.to(".leave", {
        clipPath: "polygon(0 0, 0% 0, 0% 100%, 0% 100%)",
        duration: 1,
        ease: "power2.inOut",
        delay: 0.3,
    });


    loadTl.to(".svg-char.enter", {
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 0% 100%)",
        duration: 1,
        ease: "power2.inOut",
    });

    // 在动画即将完成时获取 Flip 状态并执行 Flip 动画
    loadTl.add(() => {
        // 获取当前状态
        let state = Flip.getState(".preload-svg");
        
        // 将 SVG 内容移动到目标位置
        const svgElement = document.querySelector(".preload-svg");
        const targetSelector = window.innerWidth <= 600 ? ".svg-holder-mobile" : ".svg-holder";
        const targetElement = document.querySelector(targetSelector);
        
        if (svgElement && targetElement) {
            // 将 SVG 移动到目标位置
            targetElement.appendChild(svgElement);
            
            // 执行 Flip 动画
            Flip.from(state, {
                duration: 1,
                ease: "expo.inOut",
            });
        }
    }, "-=0.2"); 


    
    loadTl.to(".preload-bg", {
        opacity: 0,
        duration: 2,
        delay: -1.8,
        ease: "power2.inOut",
        onComplete: () => {
            gsap.set(".preload-bg", {
                display: "none",
            });
        }
    });

    loadTl.to(".preload-txt p", {
        yPercent: -100,
        duration: 0.6,
        stagger: 0.1,
        ease:  "power2.out",
    });

    loadTl.from(".title-enter", {
        opacity: 0,
        duration: 1,
        stagger: 0.05,
        ease:  "power2.out",
    });
    

    loadTl.to(".bg-line", {
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 0% 100%)",
        duration: 1.2,
        delay: -0.8,
        ease: "expo.out",
    });


    loadTl.from(".nav a", {
        yPercent: -100,
        duration: 1,
        delay: -0.8,
        ease:  "power2.out",
    });

    loadTl.to(".ball", {
        opacity: 1,
        duration: 0.3,
        delay: -0.8,
        ease:  "power2.out",
    });

    loadTl.from(".zhan-inner", {
        xPercent: 80,
        yPercent: 80,
        delay: -0.8,
        duration: 1.6,
        ease:  "power2.out",
    });

    loadTl.from(".kv-top", {
        clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
        delay: -1,
        ease: "expo.out",
        duration: 1.5,
    });


    
    return () => {
        if (loadTl.Flip) {
            loadTl.Flip.kill();
        }
        loadTl.kill();
    };
}



function mainScrollAnimation() {
    let handleResize;
    
    // 使用 gsap.context() 來統一管理所有動畫和資源
    const ctx = gsap.context(() => {
        let stickyHeight = window.innerHeight * 4;

        // KV 標題的 clipPath 動畫
        const kvTl = gsap.timeline({
            scrollTrigger: {
                trigger: ".kv-title",
                start: "top top",
                end: "+=100%",
                scrub: 1,
            }
        });
        
        kvTl.to(".kv-top", {
            clipPath: "polygon(0 0, 100% 0, 100% 0%, 0 0%)",
            ease: "none",
        });

        // About 區塊的動畫時間軸
        let aboutTl;
        
        const initAboutTimeline = () => {
            stickyHeight = window.innerHeight * 4;

            // 如果已存在 timeline 則先清理
            if (aboutTl && aboutTl.scrollTrigger) {
                aboutTl.scrollTrigger.kill();
                aboutTl.kill();
            }

            // 強制重置滾動位置，確保計算基準正確
            if (window.scrollY > 0) {
                window.scrollTo(0, window.scrollY);
            }

            aboutTl = gsap.timeline({
                scrollTrigger: {
                    trigger: ".about",
                    start: "top top",
                    end: "bottom bottom",
                    scrub: 1,
                }
            });

            aboutTl.fromTo(".about .zhan", {
                x: "32vw"
            }, {
                x: "0",
                ease: "none",
                duration: 0.2,
            }, 0);

            aboutTl.fromTo(".about .ling-wrap", {
                x: "-38vw", 
            }, {
                x: "0",
                ease: "none",
                duration: 0.2,
            }, 0);

            aboutTl.fromTo(".nums", {
                yPercent: 100,
            }, {
                yPercent: 0,
                ease: "none",
                duration: 0.05,
            }, 0);

            aboutTl.to(".about-gallery-item", {
                width: "100%",
                height: "100%",
                ease: "none",
                stagger: 0.2,
            }, 0);

            aboutTl.to(".about-gallery-item img", {
                scale: 1,
                stagger: 0.2,
                ease: "none",
            }, 0);

            aboutTl.fromTo(".nums-clip.right", {
                x: "-40vw"
            }, {
                x: 0,
                duration: 0.2,
                ease: "none",
            }, 0);

            aboutTl.fromTo(".nums-clip.left", {
                x: "40vw"
            }, {
                x: 0,
                duration: 0.2,
                ease: "none",
            }, 0);
            
            aboutTl.to(".nums", {
                yPercent: -100,
                ease: "none",
            }, 0.3);
        };

        // 初始化 About 動畫
        initAboutTimeline();

        // Resize 處理函數
        handleResize = () => {
            stickyHeight = window.innerHeight * 4;
            initAboutTimeline();
            
            if (kvTl.scrollTrigger) {
                kvTl.scrollTrigger.refresh();
            }
        };

        // 監聽 resize 事件
        window.addEventListener('resize', handleResize);
    });

    // 返回清理函數，ctx.revert() 會自動清理所有相關資源
    return () => {
        ctx.revert();
        if (handleResize) {
            window.removeEventListener('resize', handleResize);
        }
    };
}

function horizontalScrollAnimation() {
    const horiContainer = document.querySelector(".hori");
    if (!horiContainer) {
        console.warn('Element not found: ".hori"');
        return () => {};
    }

    // 1. 建立一個 GSAP Context，所有動畫和 ScrollTrigger 都會被包裹在裡面
    // 這讓我們可以透過 ctx.revert() 一次性地清理所有相關資源
    const ctx = gsap.context(() => {
        
        // 2. 使用 gsap.matchMedia() 來處理響應式動畫
        // GSAP 會自動根據斷點來建立和清理對應的動畫，無需手動監聽 resize
        gsap.matchMedia().add({
            // 桌面版條件
            isDesktop: "(min-width: 600px)",
            // 手機版條件
            isMobile: "(max-width: 599px)"
        }, (context) => {
            // context.conditions 包含了當前符合的條件 (isDesktop: true 或 isMobile: true)
            let { isDesktop, isMobile } = context.conditions;

            // 無論是桌面還是手機，我們都需要分割文字
            // 因為 matchMedia 會自動 revert，所以每次斷點切換時，舊的 SplitText 會被銷毀，新的會被建立
            const titleElement = horiContainer.querySelector(".hori-title h1");
            let splitTitle;
            
            if (titleElement) {
                splitTitle = SplitText.create(".hori-title h1", {
                    type: "chars",
                    mask: "lines",
                    charsClass: "chars",
                });
            }

            const sections = gsap.utils.toArray(".hori [scroll-child]");
            const parallaxElements = gsap.utils.toArray(".hori [parallax-x]");
            
            // 建立一個共用的 timeline
            const horiTl = gsap.timeline();

            if (isDesktop) {
                // --- 桌面版動畫設定 ---
                // 使用 DOM 元素引用而不是字符串选择器
                horiTl.scrollTrigger = ScrollTrigger.create({
                    animation: horiTl,
                    trigger: horiContainer,
                    start: "top top",
                    end: () => {
                        const track = document.querySelector(".track");
                        return track ? "+=" + track.offsetWidth : "+=100%";
                    },
                    scrub: 1,
                    pin: true,
                    pinSpacing: true,
                });

                // 圖片和標題動畫
                horiTl.from(".hori-content .hori-img-wrap", { opacity: 0, duration: 0.1 });
                
                if (splitTitle) {
                    horiTl.from(splitTitle.chars, {
                        yPercent: 100,
                        stagger: { amount: 0.04, from: "center" },
                        duration: 0.15,
                    }, 0);
                }

                // 水平滾動
                if (sections.length > 0) {
                    horiTl.to(sections, {
                        xPercent: -100 * (sections.length - 1),
                        ease: "none"
                    });
                }

                // 水平視差效果
                parallaxElements.forEach((section) => {
                    const widthDiff = section.offsetWidth - section.parentElement.offsetWidth;
                    horiTl.fromTo(section, { x: -widthDiff }, { x: 0, ease: "none" }, 0.2);
                });

            } else if (isMobile) {
                // --- 手機版動畫設定 ---
                // 使用 DOM 元素引用而不是字符串选择器
                horiTl.scrollTrigger = ScrollTrigger.create({
                    animation: horiTl,
                    trigger: horiContainer,
                    start: "-=300px",
                    end: "bottom center",
                    scrub: 1,
                });

                // 標題動畫
                if (splitTitle) {
                    horiTl.from(splitTitle.chars, {
                        yPercent: 100,
                        stagger: { amount: 0.04, from: "center" },
                        duration: 0.1,
                    }, 0);
                }

                // 垂直視差效果
                parallaxElements.forEach((section) => {
                    const heightDiff = section.offsetHeight - section.parentElement.offsetHeight;
                    horiTl.fromTo(section, { y: -heightDiff }, { y: 0, ease: "none" }, 0);
                });
            }
        });

    }, horiContainer); // 將 context 綁定到主容器

    // 返回一個清理函式，當元件卸載時可以呼叫它
    // ctx.revert() 會自動清理 context 內建立的所有 GSAP 實例
    return () => ctx.revert();
}


function initHeaderStickyBehavior() {
    const header = document.querySelector('.header-wrap');
    if (!header) return () => {};

    let isSticky = false;
    let headerTop = header.offsetTop;
    let originalHeaderTop = headerTop; // 保存原始位置

    const updateHeaderPosition = () => {
        // 如果 header 當前是 sticky 狀態，先暫時恢復到相對定位來獲取正確位置
        if (isSticky) {
            header.style.position = 'relative';
            header.style.top = '';
            header.style.left = '';
            header.style.width = '';
            // 強制重排以獲取正確位置
            header.offsetHeight;
        }
        
        // 重新获取header位置
        headerTop = header.offsetTop;
        originalHeaderTop = headerTop;
        
        // 如果之前是 sticky 狀態，恢復 sticky 樣式
        if (isSticky) {
            header.style.position = 'fixed';
            header.style.top = '0';
            header.style.left = '0';
            header.style.width = '100vw';
            header.style.zIndex = '99';
        }
    };

    const handleScroll = () => {
        // 使用多种方式获取滚动位置，确保与Lenis兼容
        const scrollTop = window.pageYOffset || 
                         document.documentElement.scrollTop || 
                         document.body.scrollTop || 0;
        
        if (scrollTop > headerTop && !isSticky) {
            header.style.position = 'fixed';
            header.style.top = '0';
            header.style.left = '0';
            header.style.width = '100vw';
            header.style.zIndex = '99';
            isSticky = true;
        } else if (scrollTop <= headerTop && isSticky) {
            header.style.position = 'relative';
            header.style.top = '';
            header.style.left = '';
            header.style.width = '';
            header.style.zIndex = '99';
            isSticky = false;
        }
    };

    // 监听滚动事件
    window.addEventListener('scroll', handleScroll);
    
    // 监听窗口大小变化，重新计算header位置
    window.addEventListener('resize', updateHeaderPosition);

    return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', updateHeaderPosition);
        // 重置header样式
        if (header) {
            header.style.position = 'relative';
            header.style.top = '';
            header.style.left = '';
            header.style.width = '';
            header.style.zIndex = '99';
        }
    };
}

// List hover效果初始化
function initListHoverEffect() {
    const experienceContainer = document.querySelector('.experience');
    if (!experienceContainer) return () => {};
    
    const listItems = document.querySelectorAll('.list-item');
    const galleryItems = document.querySelectorAll('.list-gallery-item');
    
    // 使用 gsap.context 管理所有动画和事件监听器
    const ctx = gsap.context(() => {
        
        // 使用 gsap.matchMedia() 來處理響應式動畫
        gsap.matchMedia().add({
            // 桌面版條件
            isDesktop: "(min-width: 601px)",
            // 手機版條件
            isMobile: "(max-width: 600px)"
        }, (context) => {
            const { isDesktop, isMobile } = context.conditions;

            if (isDesktop) {
                // 桌面版：使用 hover 效果
                listItems.forEach(item => {
                    const itemIndex = item.getAttribute('list-index');
                    
                    const mouseenterHandler = () => {
                        // 重置所有gallery-item的透明度
                        galleryItems.forEach(galleryItem => {
                            galleryItem.style.opacity = '0';
                        });
                        
                        // 找到對應的gallery-item並設置透明度為1
                        const correspondingGalleryItem = document.querySelector(`.list-gallery-item[list-index="${itemIndex}"]`);
                        if (correspondingGalleryItem) {
                            correspondingGalleryItem.style.opacity = '1';
                        }
                    };
                    
                    const mouseleaveHandler = () => {
                        // 重置所有gallery-item的透明度
                        galleryItems.forEach(galleryItem => {
                            galleryItem.style.opacity = '0';
                        });
                    };
                    
                    item.addEventListener('mouseenter', mouseenterHandler);
                    item.addEventListener('mouseleave', mouseleaveHandler);
                });
                
            } else if (isMobile) {
                // 手機版：使用 ScrollTrigger
                // 先重置所有gallery-item的透明度
                galleryItems.forEach(galleryItem => {
                    galleryItem.style.opacity = '0';
                });
                
                // 創建 ScrollTrigger timeline
                const mobileTimeline = gsap.timeline({
                    scrollTrigger: {
                        trigger: experienceContainer,
                        start: "top top",
                        end: "bottom bottom",
                        scrub: 1,
                    }
                });

                mobileTimeline.to(".list-item", {
                    opacity: 1,
                    stagger: 0.5,
                }, 0.5);
                
                mobileTimeline.to(".list-gallery-item", {
                    opacity: 1,
                    stagger: 0.5,
                }, 0.5);

                mobileTimeline.to(".list-item", {
                    opacity: 0.3,
                    stagger: 0.5,
                }, 1.5);

                mobileTimeline.to(".list-gallery-item", {
                    opacity: 0,
                    stagger: 0.5,
                }, 1.5);
            }
        });
        
    }, experienceContainer); // 將 context 綁定到主容器
    
    // 返回清理函數
    // ctx.revert() 會自動清理 context 內建立的所有 GSAP 實例和事件監聽器
    return () => {
        ctx.revert();
        
        // 重置所有gallery-item的透明度
        galleryItems.forEach(galleryItem => {
            galleryItem.style.opacity = '0';
        });
    };
}

// Strip撕裂效果ScrollTrigger动画
function initStripScrollAnimation() {
    const tearStrip = document.querySelector('.tear-strip');
    if (!tearStrip) return () => {};

    let ctx;
    let resizeTimeout;
    
    // 创建一个对象来存储value值
    const valueObj = { value: 0 };
    
    // 存储原始容器，用于resize时恢复keywords
    let originalKeywordContainer = null;

    // 初始化动画的函数
    const initStripAnimation = () => {
        const keywords = document.querySelectorAll('.form-keyword');
        
        // 清理所有关键词上的GSAP动画
        if (keywords.length > 0) {
            keywords.forEach(keyword => {
                gsap.killTweensOf(keyword);
                gsap.set(keyword, { clearProps: "all" });
            });
        }

        // 先強制重置滾動位置，確保計算基準正確
        if (window.scrollY > 0) {
            window.scrollTo(0, window.scrollY);
        }
        
        const targetPos = document.querySelector('.keyword-pos');
        
        if (keywords.length > 0 && targetPos) {
            // 在resize时，需要先将keywords恢复原始位置
            if (originalKeywordContainer && keywords[0].parentElement !== originalKeywordContainer) {
                keywords.forEach(keyword => {
                    originalKeywordContainer.appendChild(keyword);
                });
            } else if (!originalKeywordContainer) {
                // 第一次初始化，记录原始容器
                if (keywords[0].parentElement) {
                    originalKeywordContainer = keywords[0].parentElement;
                }
            }
            
            // 记录初始状态
            const state = Flip.getState(keywords);
            
            // 将关键词移动到目标位置
            keywords.forEach(keyword => {
                targetPos.appendChild(keyword);
            });
            
            // 创建 Flip 动画
            const flipTween = Flip.from(state, {
                duration: 1,
                ease: "none",
                stagger: 0.1,
                paused: true,
                onUpdate: function() {
                    // 根据动画进度设置透明度
                    const progress = this.progress();
                    gsap.set(keywords, { opacity: 1 - progress * 1.5 });
                }
            });
            
            // 使用 ScrollTrigger 控制动画进度
            ScrollTrigger.create({
                trigger: ".form-sect",
                start: "top 40%",
                end: "+=240%",
                scrub: true,
                animation: flipTween,
                refreshPriority: -3, 
            });
        }

        // 创建ScrollTrigger动画
        const stripTl = gsap.timeline({
            scrollTrigger: {
                trigger: ".form-sect",
                start: "top top",
                end: "+=240%",
                scrub: true,  
                refreshPriority: -3, // 設定較低的優先順序，確保在水平滾動後執行
            }
        });

        // 动画化value对象，并在更新时设置CSS变量
        stripTl.to(valueObj, {
            value: 100,
            ease: "none",
            onUpdate: function() {
                document.documentElement.style.setProperty('--value', Math.round(valueObj.value));
            }
        });

        stripTl.to(".tear-strip__strip", {
            xPercent: 100,
            rotate: 36,
            opacity: 0,
            ease: "none",
        });

        stripTl.fromTo(".rip-area .extend", {
            "--form-width": "8rem",
            ease: "none",
        }, {
            "--form-width": "100%",
            ease: "none",
        });
    };
    
    // 使用 gsap.context 管理所有动画
    const createContext = () => {
        ctx = gsap.context(() => {
            // 初始化动画
            initStripAnimation();
        });
    };
    
    // 创建初始context
    createContext();
    
    // Resize 处理函数
    const handleResize = () => {
        // 使用requestAnimationFrame确保DOM更新完成后再初始化
        requestAnimationFrame(() => {
            // 先清理旧context
            ctx.revert();
            // 先触发ScrollTrigger刷新，确保位置计算正确
            ScrollTrigger.refresh();
            // 重新创建context
            createContext();
        });
    };
    
    // 添加防抖
    const debounceResize = (callback, delay = 150) => {
        return (...args) => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => callback.apply(this, args), delay);
        };
    };
    
    const debouncedHandler = debounceResize(handleResize);
    window.addEventListener('resize', debouncedHandler);

    // 返回清理函数
    return () => {
        ctx.revert();
        // 重置CSS变量和值对象
        valueObj.value = 0;
        document.documentElement.style.setProperty('--value', 0);
        // 清除防抖定時器
        clearTimeout(resizeTimeout);
        // 移除resize事件监听器
        window.removeEventListener('resize', debouncedHandler);
    };
}

// 初始化 ScriptManager
document.addEventListener('DOMContentLoaded', () => {
    // 等待所有樣式和資源載入完成
    window.addEventListener('load', () => {
        // 額外等待一幀確保所有渲染完成
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                window.scriptManager = new ScriptManager();
                window.scriptManager.init();
            });
        });
    });
});

// 頁面卸載時清理
window.addEventListener('beforeunload', () => {
    if (window.scriptManager) {
        window.scriptManager.cleanup();
    }
});

// 監聽窗口大小變化，處理 SVG 元素的響應式移動
window.addEventListener('resize', () => {
    const svgElement = document.querySelector('.preload-svg');
    if (!svgElement) return;
    
    const currentWidth = window.innerWidth;
    const isInMobile = svgElement.closest('.svg-holder-mobile');
    const isInDesktop = svgElement.closest('.svg-holder');
    
    // 如果寬度大於600px且SVG在mobile容器中，移動到desktop容器
    if (currentWidth > 600 && isInMobile) {
        const desktopHolder = document.querySelector('.svg-holder');
        if (desktopHolder) {
            desktopHolder.appendChild(svgElement);
        }
    }
    // 如果寬度小於等於600px且SVG在desktop容器中，移動到mobile容器
    else if (currentWidth <= 600 && isInDesktop) {
        const mobileHolder = document.querySelector('.svg-holder-mobile');
        if (mobileHolder) {
            mobileHolder.appendChild(svgElement);
        }
    }
});

// Canvas文字動畫效果
function initCanvasTextAnimation() {
    const canvas = document.getElementById('canvas');
    if (!canvas) {
        console.warn('Canvas element not found!');
        return () => {};
    }

    let position = {x: 0, y: window.innerHeight/2};
    let counter = 0;
    let minFontSize = 3;
    let letters = "LET THE SILENCE CROWN YOU. LET THE THORNS REMEMBER YOUR NAME. LET THE SILENCE CROWN YOU. LET THE THORNS REMEMBER YOUR NAME.";
    
    let context;
    let mouse = {x: 0, y: 0};
    let drawnLetters = [];
    let animationSpeed = 0.06;
    let floatDelay = 800;
    let floatSpeed = 1.8;
    let shrinkSpeed = 0.995;
    let shrinkDelay = 800;
    let fadeDelay = 1800;
    let fadeSpeed = 0.008;
    let animationFrameId;
    let isMouseOnCanvas = false;

    const init = () => {
        context = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight * 1.4;
        
        console.log('Canvas initialized:', canvas.width, 'x', canvas.height);
        
        canvas.addEventListener('mousemove', mouseMove, false);
        canvas.addEventListener('mouseenter', mouseEnter, false);
        canvas.addEventListener('mouseleave', mouseLeave, false);
        canvas.addEventListener('dblclick', doubleClick, false);
        
        animate();
    };

    const mouseMove = (event) => {
        mouse.x = event.offsetX || (event.layerX - canvas.offsetLeft);
        mouse.y = event.offsetY || (event.layerY - canvas.offsetTop);
    };

    const mouseEnter = () => {
        isMouseOnCanvas = true;
        position.x = mouse.x;
        position.y = mouse.y;
        
        const info = document.getElementById('info');
        if (info) {
            info.style.display = 'none';
        }
    };

    const mouseLeave = () => {
        isMouseOnCanvas = false;
    };

    const draw = () => {
        if (!isMouseOnCanvas) return;
        
        const d = distance(position, mouse);
        const fontSize = minFontSize + d/2;
        const letter = letters[counter];
        const stepSize = textWidth(letter, fontSize);
        
        if (d > stepSize) {
            const angle = Math.atan2(mouse.y-position.y, mouse.x-position.x);
            
            const newLetter = {
                char: letter,
                x: position.x,
                y: position.y,
                originalY: position.y,
                fontSize: fontSize,
                angle: angle,
                scale: 0,
                targetScale: 1,
                opacity: 1,
                createdTime: Date.now(),
                isFloating: false,
                floatStartTime: 0,
                isShrinking: false,
                isFading: false,
                rotationSpeed: (Math.random() - 0.5) * 0.01
            };
            
            drawnLetters.push(newLetter);

            counter++;
            if (counter > letters.length-1) {
                counter = 0;
            }
        
            position.x = position.x + Math.cos(angle) * stepSize;
            position.y = position.y + Math.sin(angle) * stepSize;
        }
    };

    const distance = (pt, pt2) => {
        const xs = pt2.x - pt.x;
        const ys = pt2.y - pt.y;
        return Math.sqrt(xs * xs + ys * ys);
    };

    const doubleClick = () => {
        canvas.width = canvas.width;
        drawnLetters = [];
    };

    const animate = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        draw();
        renderLetters();
        animationFrameId = requestAnimationFrame(animate);
    };

    const renderLetters = () => {
        const currentTime = Date.now();
        
        for (let i = drawnLetters.length - 1; i >= 0; i--) {
            const letter = drawnLetters[i];
            const timeElapsed = currentTime - letter.createdTime;
            
            if (letter.scale < letter.targetScale) {
                letter.scale += animationSpeed;
                if (letter.scale > letter.targetScale) {
                    letter.scale = letter.targetScale;
                }
            }
            
            if (timeElapsed >= floatDelay && !letter.isFloating) {
                letter.isFloating = true;
                letter.floatStartTime = currentTime;
            }
            
            if (letter.isFloating) {
                letter.y -= floatSpeed;
                letter.angle += letter.rotationSpeed;
                
                if ((currentTime - letter.floatStartTime) >= shrinkDelay && !letter.isShrinking) {
                    letter.isShrinking = true;
                }
                
                if ((currentTime - letter.floatStartTime) >= fadeDelay && !letter.isFading) {
                    letter.isFading = true;
                }
                
                if (letter.isShrinking) {
                    letter.scale *= shrinkSpeed;
                    if (letter.scale <= 0.01) {
                        letter.scale = 0;
                    }
                }
                
                if (letter.isFading) {
                    letter.opacity -= fadeSpeed;
                    if (letter.opacity <= 0) {
                        letter.opacity = 0;
                    }
                }
                
                if (letter.y < -letter.fontSize || letter.scale <= 0 || letter.opacity <= 0) {
                    drawnLetters.splice(i, 1);
                    continue;
                }
            }
            
            context.font = (letter.fontSize * letter.scale) + "px PP Eiko";
            context.fillStyle = "rgba(255, 255, 255, " + letter.opacity + ")";
            
            context.save();
            context.translate(letter.x, letter.y);
            context.rotate(letter.angle);
            context.scale(letter.scale, letter.scale);
            context.fillText(letter.char, 0, 0);
            context.restore();
        }
    };

    const textWidth = (string, size) => {
        context.font = size + "px PP Eiko";
        
        if (context.fillText) {
            return context.measureText(string).width;
        } else if (context.mozDrawText) {
            return context.mozMeasureText(string);
        }
        
        return 10;
    };

    const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight * 1.4;
    };

    // 等待DOM加载完成后再初始化
    const waitForCanvas = () => {
        if (canvas) {
            init();
        } else {
            setTimeout(waitForCanvas, 100);
        }
    };

    waitForCanvas();
    
    window.addEventListener('resize', handleResize);

    return () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        canvas.removeEventListener('mousemove', mouseMove);
        canvas.removeEventListener('mousedown', mouseDown);
        canvas.removeEventListener('mouseup', mouseUp);
        canvas.removeEventListener('mouseout', mouseUp);
        canvas.removeEventListener('dblclick', doubleClick);
        window.removeEventListener('resize', handleResize);
        drawnLetters = [];
    };
}



function initMenuAnimation() {
    // 聲明所有需要的變量
    let toggleButtons;
    let navTl;
    let isOpen = false;

    // 查找按鈕
    toggleButtons = document.querySelectorAll(".menu-btn");
    if (!toggleButtons || toggleButtons.length === 0) {
        console.warn("Menu toggle buttons not found");
        return () => {}; // 返回空的清理函數
    }

    const menuWrap = document.querySelector('.mobile-menu-wrap');
    if (!menuWrap) {
        console.warn("Menu wrapper not found");
        return () => {}; // 返回空的清理函數
    }

    // 初始設置：將選單隱藏在外面
    gsap.set('.mobile-menu-wrap', {
        yPercent: -100,
        display: "block",
    });

    // 創建選單動畫
    navTl = gsap.timeline({ paused: true });
    
    navTl.to(".mobile-menu-wrap", {
        yPercent: 0, 
        duration: 1.2,
        ease: "power4.inOut",
    });

    // 切換選單狀態的函數
    function toggleMenu() {
        if (isOpen) {
            navTl.reverse();
        } else {
            navTl.play();
        }
        isOpen = !isOpen;
    }

    // 關閉選單的函數
    function closeMenu() {
        if (isOpen) {
            navTl.reverse();
            isOpen = false;
        }
    }

    // 1. 點擊menu外部區域關閉選單
    function handleOutsideClick(e) {
        if (isOpen && !menuWrap.contains(e.target) && !Array.from(toggleButtons).some(btn => btn.contains(e.target))) {
            closeMenu();
        }
    }

    // 2. 點擊menu內的錨點連結後關閉選單
    const menuLinks = menuWrap.querySelectorAll('a[href^="#"]');
    function handleMenuLinkClick(e) {
        // 給一點延遲，讓滾動動畫先開始
        setTimeout(() => {
            closeMenu();
        }, 100);
    }

    // 為每個按鈕添加事件監聽器
    toggleButtons.forEach(button => {
        button.addEventListener("click", toggleMenu);
    });

    // 添加外部點擊監聽
    document.addEventListener("click", handleOutsideClick);

    // 為錨點連結添加監聽
    menuLinks.forEach(link => {
        link.addEventListener("click", handleMenuLinkClick);
    });

    // 返回清理函數
    return () => {
        // 移除所有按鈕的事件監聽器
        if (toggleButtons && toggleButtons.length > 0) {
            toggleButtons.forEach(button => {
                button.removeEventListener("click", toggleMenu);
            });
        }

        // 移除外部點擊監聽
        document.removeEventListener("click", handleOutsideClick);

        // 移除錨點連結監聽
        menuLinks.forEach(link => {
            link.removeEventListener("click", handleMenuLinkClick);
        });

        // 關閉選單（如果是開啟狀態）
        if (isOpen && navTl) {
            navTl.reverse();
            isOpen = false;
        }

        // 清理 GSAP timeline
        if (navTl) {
            navTl.kill();
        }

        // 重置選單元素
        const menuWrap = document.querySelector('.mobile-menu-wrap');
        if (menuWrap) {
            gsap.set(menuWrap, { clearProps: "all" });
        }
    };
}

// 取得表單送出按鈕和所有 label 元素
const formSubmit = document.querySelector('.form-submit');
const labels = document.querySelectorAll('.form-input label');

// 儲存原始文字
const originalText = formSubmit.textContent;

// 點擊事件處理
formSubmit.addEventListener('click', function(e) {
  e.preventDefault(); // 防止連結跳轉
  
  // 檢查是否已經在 submitted 狀態
  if (this.classList.contains('submitted')) {
    // 回復原狀
    this.textContent = originalText;
    this.classList.remove('submitted');
    
    // 移除所有 label 的 submitted class
    labels.forEach(label => label.classList.remove('submitted'));
  } else {
    // 改變為 submitted 狀態
    this.textContent = 'please confirm your code';
    this.classList.add('submitted');
    
    // 加上所有 label 的 submitted class
    labels.forEach(label => label.classList.add('submitted'));
  }
});