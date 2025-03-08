class EmotionDictionaryManager {
    constructor() {
        this.dictionaryVersion = '';
        this.lastUpdateTime = null;
        this.updateInterval = 24 * 60 * 60 * 1000; // 24小时更新一次
        this.isInitialized = false;
        this.initPromise = null;
    }

    async initialize() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = new Promise(async (resolve) => {
            try {
                // 首先尝试从本地存储加载
                const localDict = this.loadFromLocalStorage();
                if (localDict && !this.isUpdateNeeded(localDict.lastUpdateTime)) {
                    this.isInitialized = true;
                    resolve(localDict.dictionary);
                    return;
                }

                // 尝试加载本地词典文件
                const dictionary = await this.loadLocalDictionary();
                if (dictionary) {
                    const processedDict = this.processLocalDictionary(dictionary);
                    this.saveToLocalStorage(processedDict);
                    this.isInitialized = true;
                    resolve(processedDict);
                    return;
                }

                // 如果本地词典加载失败，使用默认词典
                console.warn('使用默认词典');
                const defaultDict = this.getDefaultDictionary();
                this.isInitialized = true;
                resolve(defaultDict);
            } catch (error) {
                console.warn('词典初始化失败，使用默认词典:', error);
                const defaultDict = this.getDefaultDictionary();
                this.isInitialized = true;
                resolve(defaultDict);
            }
        });

        return this.initPromise;
    }

    // 加载本地词典文件
    async loadLocalDictionary() {
        const files = {
            positive: 'Hownet/正面情感词语（中文）.txt',
            degree: 'Hownet/程度级别词语（中文）.txt'
        };

        try {
            const dictionaries = {};
            for (const [type, path] of Object.entries(files)) {
                try {
                    const response = await fetch(path);
                    if (!response.ok) {
                        console.warn(`无法加载词典文件: ${path}`);
                        continue;
                    }
                    const text = await response.text();
                    dictionaries[type] = text.split('\n')
                        .map(line => line.trim())
                        .filter(line => line && !line.startsWith('#'));
                } catch (e) {
                    console.warn(`加载词典文件失败: ${path}`, e);
                }
            }
            return Object.keys(dictionaries).length > 0 ? dictionaries : null;
        } catch (error) {
            console.warn('本地词典加载失败:', error);
            return null;
        }
    }

    processLocalDictionary(localDict) {
        const defaultDict = this.getDefaultDictionary();
        return {
            positive: {
                confidence: [...new Set([
                    ...defaultDict.positive.confidence,
                    ...(localDict.positive || []).filter(word => 
                        word.includes('信心') || 
                        word.includes('重要') || 
                        word.includes('成功') ||
                        word.includes('发展')
                    )
                ])],
                achievement: [...new Set([
                    ...defaultDict.positive.achievement,
                    ...(localDict.positive || []).filter(word => 
                        word.includes('成功') || 
                        word.includes('实现') ||
                        word.includes('完成') ||
                        word.includes('突破')
                    )
                ])],
                determination: [...new Set([
                    ...defaultDict.positive.determination,
                    ...(localDict.positive || []).filter(word => 
                        word.includes('决心') || 
                        word.includes('目标') ||
                        word.includes('意志') ||
                        word.includes('坚定')
                    )
                ])],
                unity: [...new Set([
                    ...defaultDict.positive.unity,
                    ...(localDict.positive || []).filter(word => 
                        word.includes('团结') || 
                        word.includes('合作') ||
                        word.includes('共同') ||
                        word.includes('一致')
                    )
                ])]
            },
            negative: defaultDict.negative,
            degree: localDict.degree || defaultDict.degree,
            negation: defaultDict.negation,
            transition: defaultDict.transition
        };
    }

    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem('emotionDictionary');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn('从本地存储加载词典失败:', error);
            return null;
        }
    }

    saveToLocalStorage(dictionary) {
        try {
            localStorage.setItem('emotionDictionary', JSON.stringify({
                dictionary,
                lastUpdateTime: new Date().getTime()
            }));
        } catch (error) {
            console.warn('保存词典到本地存储失败:', error);
        }
    }

    isUpdateNeeded(lastUpdateTime) {
        return !lastUpdateTime || (new Date().getTime() - lastUpdateTime > this.updateInterval);
    }

    getDefaultDictionary() {
        // 默认词典作为后备
        return {
            positive: {
                confidence: ['重要', '强调', '坚定', '信心', '成果', '提高', '优化', '创新', '发展', '推进', '积极', '良好', '有效'],
                achievement: ['实现', '完成', '建成', '圆满', '突破', '提升', '成就', '进步', '成功', '胜利', '达成'],
                determination: ['使命', '目标', '战略', '部署', '规划', '蓝图', '任务', '决心', '意志', '毅力'],
                unity: ['统筹', '协同', '一体化', '合力', '融合', '支撑', '团结', '协作', '配合', '联合']
            },
            negative: {
                challenge: ['问题', '矛盾', '挑战', '堵点', '卡点', '腐败', '困难', '障碍', '风险'],
                pressure: ['要求', '督促', '监管', '审计', '检验', '压力', '紧张', '严格'],
                urgency: ['加紧', '加快', '确保', '如期', '收官', '迫切', '立即', '马上']
            },
            degree: {
                high: ['全面', '重大', '深入', '充分', '显著', '极其', '非常', '特别', '格外'],
                medium: ['持续', '不断', '逐步', '稳步', '较为', '比较', '相当'],
                low: ['基本', '初步', '有所', '略微', '稍微', '一些']
            },
            negation: ['不', '没', '无', '非', '未', '别', '莫', '勿', '决不', '绝不'],
            transition: ['但是', '然而', '不过', '可是', '尽管', '虽然', '即使', '反而']
        };
    }
}

class HowNetDictionaryManager extends EmotionDictionaryManager {
    constructor() {
        super();
        this.hownetApiKey = 'your_api_key'; // 需要替换为实际的API密钥
        this.hownetApiEndpoint = 'https://api.hownet.com/v2/'; // 示例API端点
        this.semanticCache = new Map(); // 缓存语义关系
    }

    async fetchLatestDictionary() {
        try {
            // 从知网获取情感词典
            const emotionWords = await this.fetchHowNetEmotionWords();
            const semanticRelations = await this.fetchSemanticRelations(emotionWords);

            return this.buildEmotionDictionary(emotionWords, semanticRelations);
        } catch (error) {
            console.warn('知网词典获取失败，使用备选源:', error);
            return super.fetchLatestDictionary();
        }
    }

    async fetchHowNetEmotionWords() {
        const categories = {
            positive: ['POS', 'happiness', 'satisfaction', 'confidence'],
            negative: ['NEG', 'anger', 'sadness', 'fear', 'anxiety']
        };

        const words = {
            positive: new Set(),
            negative: new Set(),
            degree: new Set(),
            negation: new Set(),
            transition: new Set()
        };

        try {
            for (let [polarity, sememes] of Object.entries(categories)) {
                for (let sememe of sememes) {
                    const response = await fetch(`${this.hownetApiEndpoint}words`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.hownetApiKey}`
                        },
                        body: JSON.stringify({
                            sememe: sememe,
                            language: 'zh'
                        })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        data.words.forEach(word => words[polarity].add(word));
                    }
                }
            }

            // 获取程度词
            const degreeResponse = await fetch(`${this.hownetApiEndpoint}degree_words`, {
                headers: { 'Authorization': `Bearer ${this.hownetApiKey}` }
            });
            if (degreeResponse.ok) {
                const degreeData = await degreeResponse.json();
                degreeData.forEach(word => words.degree.add(word));
            }

            return words;
        } catch (error) {
            throw new Error(`知网API访问失败: ${error.message}`);
        }
    }

    async fetchSemanticRelations(words) {
        const relations = new Map();
        const allWords = [...words.positive, ...words.negative];

        for (let word of allWords) {
            if (this.semanticCache.has(word)) {
                relations.set(word, this.semanticCache.get(word));
                continue;
            }

            try {
                const response = await fetch(`${this.hownetApiEndpoint}word_semantic`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.hownetApiKey}`
                    },
                    body: JSON.stringify({ word: word })
                });

                if (response.ok) {
                    const data = await response.json();
                    const semantics = {
                        synonyms: data.synonyms || [],
                        antonyms: data.antonyms || [],
                        hypernyms: data.hypernyms || [],
                        hyponyms: data.hyponyms || []
                    };
                    relations.set(word, semantics);
                    this.semanticCache.set(word, semantics);
                }
            } catch (error) {
                console.warn(`获取词语"${word}"的语义关系失败:`, error);
            }
        }

        return relations;
    }

    buildEmotionDictionary(words, semanticRelations) {
        const dictionary = this.getDefaultDictionary();

        // 扩充情感词典
        for (let [word, relations] of semanticRelations) {
            // 添加同义词
            relations.synonyms.forEach(synonym => {
                if (words.positive.has(word)) {
                    dictionary.positive.confidence.push(synonym);
                } else if (words.negative.has(word)) {
                    dictionary.negative.challenge.push(synonym);
                }
            });

            // 处理上下位词
            relations.hypernyms.forEach(hypernym => {
                if (this.isEmotionWord(hypernym)) {
                    if (words.positive.has(word)) {
                        dictionary.positive.confidence.push(hypernym);
                    } else if (words.negative.has(word)) {
                        dictionary.negative.challenge.push(hypernym);
                    }
                }
            });
        }

        // 去重和分类优化
        return this.optimizeDictionary(dictionary);
    }

    optimizeDictionary(dictionary) {
        const optimized = {};
        
        for (let category in dictionary) {
            if (typeof dictionary[category] === 'object') {
                optimized[category] = {};
                for (let subCategory in dictionary[category]) {
                    optimized[category][subCategory] = Array.from(new Set(dictionary[category][subCategory]))
                        .filter(word => word.length >= 2 && word.length <= 4); // 过滤词长
                }
            } else {
                optimized[category] = Array.from(new Set(dictionary[category]));
            }
        }

        return optimized;
    }

    isEmotionWord(word) {
        // 简单的情感词判断逻辑
        const emotionPatterns = [
            /[情感好坏爱恨喜怒哀乐]/,
            /[积极消极正面负面]/,
            /[满意不满意]/
        ];
        return emotionPatterns.some(pattern => pattern.test(word));
    }
}

class EmotionAnalyzer {
    constructor() {
        this.dictionaryManager = new HowNetDictionaryManager();
        this.emotionDictionary = null;
        this.emotionWeights = {
            positive: {
                confidence: 1.2,
                achievement: 1.3,
                determination: 1.1,
                unity: 1.0
            },
            negative: {
                challenge: 0.8,
                pressure: 0.7,
                urgency: 0.9
            }
        };

        this.punctuationWeight = {
            '!': 1.5,
            '?': 0.7,
            '。': 1.0,
            '...': 1.3,
            '！': 1.5,
            '？': 0.7
        };

        this.contextWeights = {
            negation: -0.8,    // 否定词权重
            transition: 0.5,    // 转折词权重
            distance: 0.9      // 距离衰减因子
        };

        this.speechRecognizer = new SpeechRecognizer();
    }

    async initialize() {
        if (!this.emotionDictionary) {
            try {
                this.emotionDictionary = await this.dictionaryManager.initialize();
                if (!this.emotionDictionary) {
                    console.warn('词典初始化失败，使用默认词典');
                    this.emotionDictionary = this.dictionaryManager.getDefaultDictionary();
                }
            } catch (error) {
                console.error('词典初始化出错，使用默认词典:', error);
                this.emotionDictionary = this.dictionaryManager.getDefaultDictionary();
            }
        }
        return this.emotionDictionary;
    }

    async analyze(text) {
        // 确保词典已初始化
        await this.initialize();
        
        if (!this.emotionDictionary || !this.emotionDictionary.positive) {
            console.error('词典未正确初始化，使用默认词典');
            this.emotionDictionary = this.dictionaryManager.getDefaultDictionary();
        }

        const words = this.segmentText(text);
        const emotionScores = this.calculateEmotionScores(words);
        const keywords = this.extractEmotionKeywords(words);
        const intensity = this.calculateEmotionIntensity(text);

        return {
            scores: emotionScores,
            keywords: keywords,
            intensity: intensity,
            mainEmotion: this.determineMainEmotion(emotionScores)
        };
    }

    // 优化分词处理
    segmentText(text) {
        // 预处理文本
        text = this.preprocessText(text);
        
        // 分句
        const sentences = text.split(/[。！？\n]+/).filter(s => s.trim());
        const words = [];
        
        sentences.forEach(sentence => {
            // 基本分词
            const basicWords = this.basicSegment(sentence);
            words.push(...basicWords);
            
            // N-gram特征提取
            const ngrams = this.extractNgrams(sentence, 2, 4);
            words.push(...ngrams);
        });
        
        return words;
    }

    preprocessText(text) {
        return text
            .replace(/[\s\r\n]+/g, ' ')    // 规范化空白字符
            .replace(/[^\u4e00-\u9fa5。！？，、；：""''（）【】《》\s]+/g, '') // 保留中文和常用标点
            .replace(/[，、；：]/g, ' ')    // 将次要标点转换为空格
            .trim();
    }

    basicSegment(sentence) {
        // 简单的分词算法
        const words = [];
        let i = 0;
        while (i < sentence.length) {
            // 检查4字词
            if (i + 4 <= sentence.length) {
                const word4 = sentence.substr(i, 4);
                if (this.isInDictionary(word4)) {
                    words.push(word4);
                    i += 4;
                    continue;
                }
            }
            // 检查3字词
            if (i + 3 <= sentence.length) {
                const word3 = sentence.substr(i, 3);
                if (this.isInDictionary(word3)) {
                    words.push(word3);
                    i += 3;
                    continue;
                }
            }
            // 检查2字词
            if (i + 2 <= sentence.length) {
                const word2 = sentence.substr(i, 2);
                if (this.isInDictionary(word2)) {
                    words.push(word2);
                    i += 2;
                    continue;
                }
            }
            // 单字
            words.push(sentence.charAt(i));
            i++;
        }
        return words;
    }

    extractNgrams(sentence, minLength, maxLength) {
        const ngrams = [];
        for (let len = minLength; len <= maxLength; len++) {
            for (let i = 0; i <= sentence.length - len; i++) {
                const gram = sentence.substr(i, len);
                if (this.isInDictionary(gram)) {
                    ngrams.push(gram);
                }
            }
        }
        return ngrams;
    }

    isInDictionary(word) {
        // 检查词是否在词典中
        for (let category in this.emotionDictionary) {
            if (typeof this.emotionDictionary[category] === 'object') {
                for (let subCategory in this.emotionDictionary[category]) {
                    if (this.emotionDictionary[category][subCategory].includes(word)) {
                        return true;
                    }
                }
            } else if (Array.isArray(this.emotionDictionary[category])) {
                if (this.emotionDictionary[category].includes(word)) {
                    return true;
                }
            }
        }
        return false;
    }

    calculateEmotionScores(words) {
        const scores = {
            confidence: 0,
            achievement: 0,
            determination: 0,
            unity: 0,
            challenge: 0,
            pressure: 0,
            urgency: 0
        };

        if (!this.emotionDictionary) {
            console.error('词典未初始化');
            return scores;
        }

        words.forEach(word => {
            // 检查积极情绪
            for (let category in this.emotionDictionary.positive) {
                if (this.emotionDictionary.positive[category].includes(word)) {
                    scores[category] += this.emotionWeights.positive[category];
                }
            }

            // 检查消极情绪
            for (let category in this.emotionDictionary.negative) {
                if (this.emotionDictionary.negative[category].includes(word)) {
                    scores[category] += this.emotionWeights.negative[category];
                }
            }
        });

        // 归一化分数
        const maxScore = Math.max(...Object.values(scores));
        if (maxScore > 0) {
            for (let emotion in scores) {
                scores[emotion] = parseFloat((scores[emotion] / maxScore * 5).toFixed(2));
            }
        }

        return scores;
    }

    // 提取情感关键词
    extractEmotionKeywords(words) {
        const keywordCounts = {
            positive: new Map(),
            negative: new Map()
        };
        
        words.forEach(word => {
            // 检查积极情绪词
            for (let emotion in this.emotionDictionary.positive) {
                this.emotionDictionary.positive[emotion].forEach(keyword => {
                    if (word.includes(keyword)) {
                        const count = keywordCounts.positive.get(keyword) || 0;
                        keywordCounts.positive.set(keyword, count + 1);
                    }
                });
            }
            
            // 检查消极情绪词
            for (let emotion in this.emotionDictionary.negative) {
                this.emotionDictionary.negative[emotion].forEach(keyword => {
                    if (word.includes(keyword)) {
                        const count = keywordCounts.negative.get(keyword) || 0;
                        keywordCounts.negative.set(keyword, count + 1);
                    }
                });
            }
        });

        // 转换为排序后的数组
        return {
            positive: Array.from(keywordCounts.positive)
                .sort((a, b) => b[1] - a[1])
                .map(([keyword, count]) => ({ keyword, count })),
            negative: Array.from(keywordCounts.negative)
                .sort((a, b) => b[1] - a[1])
                .map(([keyword, count]) => ({ keyword, count }))
        };
    }

    // 优化情绪强度计算
    calculateEmotionIntensity(text) {
        let intensity = 1.0;
        let totalWeight = 0;

        // 分析标点符号
        for (let punct in this.punctuationWeight) {
            const count = (text.match(new RegExp(`\\${punct}`, 'g')) || []).length;
            const weight = this.punctuationWeight[punct];
            intensity += (weight - 1) * count;
            totalWeight += count;
        }

        // 分析程度词
        const degreeWeights = {
            high: 0.5,
            medium: 0.3,
            low: 0.1
        };

        for (let degree in this.emotionDictionary.degree) {
            const words = this.emotionDictionary.degree[degree];
            words.forEach(word => {
                const count = (text.match(new RegExp(word, 'g')) || []).length;
                intensity += degreeWeights[degree] * count;
                totalWeight += count;
            });
        }

        // 考虑文本长度的影响
        const textLength = text.length;
        const lengthFactor = Math.log10(textLength + 1) / 2;
        intensity = intensity * (1 + lengthFactor);

        // 归一化强度值
        return Math.min(Math.max(intensity / (totalWeight + 1), 0.5), 2);
    }

    // 确定主要情绪
    determineMainEmotion(scores) {
        let maxScore = 0;
        let mainEmotion = null;

        for (let emotion in scores) {
            if (scores[emotion] > maxScore) {
                maxScore = scores[emotion];
                mainEmotion = emotion;
            }
        }

        return {
            emotion: mainEmotion,
            score: maxScore
        };
    }
}

class VideoAnalyzer {
    constructor(textInputHandler) {
        this.textInputHandler = textInputHandler;
        this.isProcessing = false;
        this.frameInterval = 1000; // 每秒提取一帧
        this.worker = null;
        this.initTesseract();
        this.speechRecognizer = new SpeechRecognizer();
    }

    async initTesseract() {
        try {
            // 初始化Tesseract.js
            this.worker = await Tesseract.createWorker({
                logger: m => console.log(m)
            });
            await this.worker.loadLanguage('chi_sim+eng');
            await this.worker.initialize('chi_sim+eng');
        } catch (error) {
            console.error('OCR初始化失败:', error);
        }
    }

    async extractFramesAndOCR(videoUrl) {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous'; // 处理跨域问题
        video.src = videoUrl;
        
        return new Promise((resolve, reject) => {
            video.onloadedmetadata = async () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const duration = video.duration;
                    const frameCount = Math.min(10, Math.floor(duration)); // 最多提取10帧
                    let ocrResults = [];

                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    for (let i = 0; i < frameCount; i++) {
                        video.currentTime = i * (duration / frameCount);
                        await new Promise(resolve => {
                            video.onseeked = resolve;
                        });

                        // 绘制视频帧到canvas
                        ctx.drawImage(video, 0, 0);
                        
                        // 执行OCR
                        if (this.worker) {
                            const {
                                data: { text }
                            } = await this.worker.recognize(canvas);
                            if (text.trim()) {
                                ocrResults.push(text);
                            }
                        }

                        // 显示进度
                        this.updateProgress((i + 1) / frameCount * 100);
                    }

                    resolve(ocrResults.join('\n'));
                } catch (error) {
                    reject(error);
                }
            };

            video.onerror = reject;
        });
    }

    updateProgress(percent) {
        const transcriptionText = document.getElementById('transcriptionText');
        transcriptionText.innerHTML = `
            <div class="progress-container">
                <div class="progress-bar" style="width: ${percent}%"></div>
                <div class="progress-text">正在分析视频: ${Math.round(percent)}%</div>
            </div>`;
    }

    async handleVideoUrl(url) {
        const videoContainer = document.getElementById('videoContainer');
        const videoFrame = document.getElementById('videoFrame');
        const transcriptionText = document.getElementById('transcriptionText');
        
        try {
            if (url.includes('bilibili.com')) {
                // 提取BV号和p参数
                const bvMatch = url.match(/BV\w+/);
                const pMatch = url.match(/[?&]p=(\d+)/);
                const page = pMatch ? pMatch[1] : '1';
                
                if (!bvMatch) {
                    throw new Error('无法识别的B站视频链接格式');
                }
                const bvid = bvMatch[0];
                
                transcriptionText.innerHTML = `
                    <div class="info-message">
                        <p>正在获取视频信息...</p>
                        <div class="spinner"></div>
                    </div>`;

                // 获取视频信息
                const videoInfo = await this.fetchBiliVideoInfo(bvid);
                if (!videoInfo) {
                    throw new Error('无法获取视频信息');
                }

                // 构建嵌入播放器URL，添加更多参数以优化播放器
                const embedUrl = `https://player.bilibili.com/player.html?bvid=${bvid}&page=${page}&high_quality=1&danmaku=0&autoplay=0&sandbox=allow-top-navigation allow-same-origin allow-forms allow-scripts`;
                
                // 显示视频播放器
                videoContainer.style.display = 'block';
                
                // 创建新的iframe元素，添加安全属性
                const newFrame = document.createElement('iframe');
                newFrame.id = 'videoFrame';
                newFrame.setAttribute('frameborder', '0');
                newFrame.setAttribute('allowfullscreen', 'true');
                newFrame.setAttribute('scrolling', 'no');
                newFrame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-presentation');
                newFrame.setAttribute('referrerpolicy', 'no-referrer');
                newFrame.style.width = '100%';
                newFrame.style.height = '360px';
                newFrame.style.backgroundColor = '#000';
                
                // 替换旧的iframe
                if (videoFrame) {
                    videoFrame.parentNode.replaceChild(newFrame, videoFrame);
                }
                
                // 设置src触发加载
                newFrame.src = embedUrl;

                // 准备视频内容
                let content = '';
                
                // 添加视频标题和简介
                if (videoInfo.title) {
                    content += `标题：${videoInfo.title}\n\n`;
                }
                if (videoInfo.desc) {
                    content += `简介：${videoInfo.desc}\n\n`;
                }

                // 尝试获取字幕（即使失败也继续处理）
                try {
                    if (videoInfo.cid) {
                        const subtitles = await this.fetchBiliSubtitles(bvid, videoInfo.cid);
                        if (subtitles && subtitles.length > 0) {
                            content += `字幕文本：\n${subtitles.join('\n')}\n\n`;
                        }
                    }
                } catch (subtitleError) {
                    console.warn('字幕获取失败:', subtitleError);
                }

                // 即使没有字幕，只要有标题或简介也显示内容
                if (content.trim()) {
                    transcriptionText.innerHTML = `
                        <div class="video-content">
                            <pre>${content}</pre>
                            <button class="analyze-btn" onclick="document.getElementById('textInput').value = this.previousElementSibling.textContent; document.getElementById('analyzeBtn').click();">
                                分析文本
                            </button>
                        </div>`;
                    return content;
                } else {
                    throw new Error('未能获取到任何视频文本内容');
                }
            } else {
                throw new Error('暂不支持该视频平台');
            }
        } catch (error) {
            transcriptionText.innerHTML = `
                <div class="error-message">
                    <p>错误：${error.message}</p>
                    <p>建议：</p>
                    <ol>
                        <li>确保视频链接格式正确</li>
                        <li>尝试使用视频的分享链接</li>
                        <li>目前仅支持B站视频</li>
                        <li>手动复制视频简介到文本框</li>
                    </ol>
                </div>`;
            videoContainer.style.display = 'none';
            throw error;
        }
    }

    async fetchBiliSubtitles(bvid, cid) {
        try {
            if (!cid) {
                console.warn('未获取到cid，跳过字幕获取');
                return null;
            }

            // 使用新的API端点
            const apiUrl = `https://api.bilibili.com/x/player/v2?bvid=${bvid}&cid=${cid}`;
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            
            try {
                const response = await fetch(proxyUrl + encodeURIComponent(apiUrl));
                if (!response.ok) {
                    throw new Error('API请求失败');
                }
                
                const data = await response.json();
                
                // 检查返回数据结构
                if (data.code === 0 && data.data && data.data.subtitle) {
                    const subtitles = data.data.subtitle.subtitles || [];
                    if (subtitles.length > 0) {
                        const subtitleUrl = subtitles[0].subtitle_url;
                        if (!subtitleUrl) {
                            console.warn('未找到字幕URL');
                            return null;
                        }

                        // 确保使用HTTPS URL
                        const secureUrl = subtitleUrl.startsWith('//') 
                            ? 'https:' + subtitleUrl 
                            : subtitleUrl.replace(/^http:/, 'https:');

                        // 直接获取字幕内容，不使用代理
                        const subtitleResponse = await fetch(secureUrl);
                        if (!subtitleResponse.ok) {
                            throw new Error('字幕文件获取失败');
                        }

                        const subtitleData = await subtitleResponse.json();
                        if (subtitleData && subtitleData.body) {
                            return subtitleData.body
                                .sort((a, b) => a.from - b.from)
                                .map(item => item.content)
                                .filter(content => content.trim());
                        }
                    }
                }
                
                console.warn('视频没有字幕或字幕格式不正确');
                return null;
            } catch (error) {
                console.warn('字幕获取失败:', error);
                return null;
            }
        } catch (error) {
            console.error('字幕处理失败:', error);
            return null;
        }
    }

    async fetchBiliVideoInfo(bvid) {
        try {
            // 使用代理服务请求B站API
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
            
            const response = await fetch(proxyUrl + encodeURIComponent(apiUrl));
            const data = await response.json();
            
            if (data.code === 0 && data.data) {
                return {
                    title: data.data.title,
                    desc: data.data.desc,
                    cid: data.data.cid,
                    aid: data.data.aid
                };
            }
            return null;
        } catch (error) {
            console.error('获取视频信息失败:', error);
            return null;
        }
    }

    // 添加语音转写方法
    async startSpeechToText() {
        const videoFrame = document.getElementById('videoFrame');
        const transcriptionText = document.getElementById('transcriptionText');
        const speechToTextBtn = document.getElementById('speechToTextBtn');

        if (!videoFrame || !videoFrame.contentWindow) {
            throw new Error('请先加载视频');
        }

        try {
            speechToTextBtn.classList.add('processing');
            speechToTextBtn.disabled = true;

            // 显示转写状态
            transcriptionText.innerHTML += `
                <div class="transcription-status">
                    <div class="status-text">准备开始转写...</div>
                    <div class="progress">
                        <div class="progress-bar"></div>
                    </div>
                </div>`;

            // 设置进度回调
            this.speechRecognizer.setProgressCallback((percent, status) => {
                const statusText = transcriptionText.querySelector('.status-text');
                const progressBar = transcriptionText.querySelector('.progress-bar');
                if (statusText) statusText.textContent = status;
                if (progressBar) progressBar.style.width = `${percent}%`;
            });

            // 开始转写
            await this.speechRecognizer.startVideoTranscription(videoFrame);

        } catch (error) {
            console.error('语音转写失败:', error);
            transcriptionText.innerHTML += `
                <div class="error-message">
                    <p>语音转写失败: ${error.message}</p>
                </div>`;
        } finally {
            speechToTextBtn.classList.remove('processing');
            speechToTextBtn.disabled = false;
        }
    }
}

class TextInputHandler {
    constructor(analyzer) {
        this.analyzer = analyzer;
        this.emotionChart = null;
        this.videoAnalyzer = new VideoAnalyzer(this);
        this.themeExtractor = new ThemeExtractor();
        this.setupEventListeners();
        this.debounceTimer = null;
    }

    debounce(func, wait) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => func(), wait);
    }

    setupEventListeners() {
        // 标签切换
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn));
        });

        // 文件拖放
        const dropZone = document.getElementById('dropZone');
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length) {
                this.handleFileUpload(files[0]);
            }
        });

        // 文件选择
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // 点击上传区域触发文件选择
        dropZone.addEventListener('click', () => {
            fileInput.click();
        });

        // 分析按钮
        const analyzeBtn = document.getElementById('analyzeBtn');
        analyzeBtn.addEventListener('click', () => this.handleAnalysis());

        // 添加清空按钮事件监听
        const clearBtn = document.getElementById('clearBtn');
        clearBtn.addEventListener('click', () => this.clearAll());

        // 添加视频URL输入事件监听
        const videoUrlInput = document.getElementById('videoUrlInput');
        videoUrlInput.addEventListener('change', async (e) => {
            try {
                const url = e.target.value.trim();
                if (url) {
                    await this.videoAnalyzer.handleVideoUrl(url);
                }
            } catch (error) {
                console.error('视频处理失败:', error);
            }
        });

        // 添加输入防抖
        document.getElementById('textInput').addEventListener('input', (e) => {
            this.debounce(() => {
                const text = e.target.value.trim();
                if (text.length > 10) { // 只在文本足够长时触发分析
                    this.handleAnalysis();
                }
            }, 1000); // 1秒后触发
        });
    }

    switchTab(clickedBtn) {
        // 更新按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        clickedBtn.classList.add('active');

        // 更新面板显示
        const targetPanel = clickedBtn.getAttribute('data-tab');
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${targetPanel}-panel`).classList.add('active');
    }

    async handleFileUpload(file) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        loadingIndicator.classList.remove('hidden');

        try {
            const text = await this.readFile(file);
            document.getElementById('textInput').value = text;
            this.switchTab(document.querySelector('[data-tab="text"]'));
        } catch (error) {
            alert('文件读取失败：' + error.message);
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('文件读取错误'));
            reader.readAsText(file);
        });
    }

    async handleAnalysis() {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
        
        try {
            loadingIndicator.classList.remove('hidden');
            
            let text = '';
            switch (activeTab) {
                case 'text':
                    text = document.getElementById('textInput').value.trim();
                    if (!text) {
                        throw new Error('请输入要分析的文本');
                    }
                    break;
                case 'url':
                    const url = document.getElementById('urlInput').value.trim();
                    if (!url) {
                        throw new Error('请输入网页URL');
                    }
                    if (!this.isValidUrl(url)) {
                        throw new Error('请输入有效的URL地址');
                    }
                    text = await this.fetchWebPageContent(url);
                    break;
                case 'file':
                    text = document.getElementById('textInput').value.trim();
                    if (!text) {
                        throw new Error('请先上传文件');
                    }
                    break;
                case 'video':
                    text = document.getElementById('textInput').value.trim();
                    if (!text) {
                        throw new Error('请先获取视频文本');
                    }
                    break;
            }

            if (!text.trim()) {
                throw new Error('未能获取到有效内容');
            }

            // 同时进行情绪分析和主题提取
            const [emotionResult, themes] = await Promise.all([
                this.analyzer.analyze(text),
                this.themeExtractor.extractThemes(text)
            ]);

            // 更新情绪分析结果
            this.updateUI(emotionResult);

            // 更新主题分析结果
            let displayContainer;
            switch (activeTab) {
                case 'url':
                    displayContainer = 'webContentPreview';
                    break;
                case 'text':
                case 'file':
                    displayContainer = 'textInput';
                    break;
                case 'video':
                    displayContainer = 'transcriptionText';
                    break;
            }
            this.themeExtractor.displayThemes(themes, displayContainer);

        } catch (error) {
            const errorMessage = error.message || '分析失败，请稍后重试';
            alert(errorMessage);
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    async fetchWebPageContent(url) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const webContentPreview = document.getElementById('webContentPreview');
        
        try {
            loadingIndicator.classList.remove('hidden');
            webContentPreview.innerHTML = '<div class="loading-message">正在获取网页内容...</div>';
            
            // 尝试多个CORS代理服务
            const proxyServices = [
                'https://api.allorigins.win/raw?url=',
                'https://api.codetabs.com/v1/proxy?quest=',
                'https://cors.sh/'  // 添加新的代理服务
            ];

            let content = null;
            let error = null;

            // 针对搜狐新闻的特殊处理
            const isSohuNews = url.includes('sohu.com');
            const sohuSelectors = [
                '.article',
                '#mp-editor',
                '.article-text',
                '[data-role="original-content"]',
                '.article-content'
            ];

            // 依次尝试不同的代理服务
            for (let proxyUrl of proxyServices) {
                try {
                    const response = await fetch(proxyUrl + encodeURIComponent(url), {
                        headers: {
                            'Origin': window.location.origin,
                            'x-requested-with': 'XMLHttpRequest',
                            // 添加搜狐特定的请求头
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        }
                    });
                    
                    if (response.ok) {
                        const text = await response.text();
                        
                        // 使用 DOMParser 解析 HTML
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(text, 'text/html');
                        
                        // 移除干扰元素
                        doc.querySelectorAll('script, style, link, iframe, .share-wrap, .statement').forEach(el => el.remove());
                        
                        // 尝试多种选择器来获取主要内容
                        const contentSelectors = isSohuNews ? sohuSelectors : [
                            'article',
                            'main',
                            '.article-content',
                            '.article-body',
                            '.post-content',
                            '.content',
                            '#content',
                            '.main-content',
                            '.article'
                        ];
                        
                        // 首先尝试获取文章标题
                        const title = doc.querySelector('h1, .article-title, .title')?.textContent || '';
                        
                        // 然后获取正文内容
                        for (let selector of contentSelectors) {
                            const element = doc.querySelector(selector);
                            if (element) {
                                // 获取所有文本段落
                                const paragraphs = Array.from(element.querySelectorAll('p'))
                                    .map(p => p.textContent.trim())
                                    .filter(text => text.length > 0);
                                
                                if (paragraphs.length > 0) {
                                    content = title + '\n\n' + paragraphs.join('\n');
                                    break;
                                }
                            }
                        }
                        
                        // 如果还是没有找到内容，尝试其他方法
                        if (!content) {
                            const allParagraphs = Array.from(doc.querySelectorAll('p'))
                                .filter(p => {
                                    const text = p.textContent.trim();
                                    return text.length > 30 && // 过滤短文本
                                        !text.includes('版权所有') && // 过滤版权信息
                                        !text.includes('Copyright'); // 过滤版权信息
                                })
                                .map(p => p.textContent.trim());

                            if (allParagraphs.length > 0) {
                                content = title + '\n\n' + allParagraphs.join('\n');
                            }
                        }
                        
                        if (content) {
                            // 显示提取到的内容预览
                            webContentPreview.innerHTML = `
                                <div class="web-content-container">
                                    <h3>提取的网页内容：</h3>
                                    <div class="web-content-text">${this.formatPreviewContent(content)}</div>
                                    <div class="web-content-actions">
                                        <button class="edit-content-btn" onclick="document.getElementById('textInput').value = this.parentElement.previousElementSibling.textContent.trim(); document.getElementById('webContentEditor').style.display = 'block';">
                                            编辑内容
                                        </button>
                                        <button class="analyze-content-btn" onclick="document.getElementById('analyzeBtn').click();">
                                            直接分析
                                        </button>
                                    </div>
                                </div>`;
                            return content;
                        }
                    }
                } catch (e) {
                    error = e;
                    console.warn(`代理服务 ${proxyUrl} 失败:`, e);
                    continue;
                }
            }

            if (!content) {
                throw new Error('无法获取网页内容，请尝试以下方法：\n' +
                    '1. 直接复制文章内容到文本框\n' +
                    '2. 稍后重试\n' +
                    '3. 检查URL是否正确\n' +
                    '4. 尝试使用文章的分享链接');
            }

            return content;
        } catch (error) {
            webContentPreview.innerHTML = `
                <div class="error-message">
                    <p>获取内容失败：${error.message}</p>
                    <p>建议：</p>
                    <ol>
                        <li>检查网址是否正确</li>
                        <li>尝试刷新页面</li>
                        <li>直接复制文章内容到文本框</li>
                    </ol>
                </div>`;
            throw error;
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    }

    formatPreviewContent(content) {
        return content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line)
            .map(line => `<p>${line}</p>`)
            .join('');
    }

    updateUI(result) {
        // 更新情绪条
        const emotionBar = document.getElementById('emotionBar');
        emotionBar.style.width = `${result.intensity * 50}%`;

        // 更新主要情绪
        document.querySelector('#mainEmotion span').textContent = 
            `${this.translateEmotion(result.mainEmotion.emotion)} (强度: ${result.intensity.toFixed(2)})`;

        // 生成并更新分析结论
        const conclusionText = this.generateConclusion(result);
        const conclusionElement = document.querySelector('.conclusion-text');
        if (conclusionElement) {
            conclusionElement.textContent = conclusionText;
        }

        // 更新情绪图表
        this.updateEmotionChart(result.scores);

        // 更新关键词
        this.updateKeywords(result.keywords);
    }

    updateEmotionChart(scores) {
        const ctx = document.getElementById('emotionChart').getContext('2d');
        
        if (this.emotionChart) {
            this.emotionChart.destroy();
        }

        const data = {
            labels: [
                '信心', '成就', '决心', '团结',
                '挑战', '压力', '紧迫'
            ],
            datasets: [{
                label: '情绪分数',
                data: [
                    scores.confidence,
                    scores.achievement,
                    scores.determination,
                    scores.unity,
                    scores.challenge,
                    scores.pressure,
                    scores.urgency
                ],
                backgroundColor: [
                    'rgba(52, 152, 219, 0.5)',  // 信心
                    'rgba(46, 204, 113, 0.5)',  // 成就
                    'rgba(155, 89, 182, 0.5)',  // 决心
                    'rgba(52, 73, 94, 0.5)',    // 团结
                    'rgba(231, 76, 60, 0.5)',   // 挑战
                    'rgba(241, 196, 15, 0.5)',  // 压力
                    'rgba(230, 126, 34, 0.5)'   // 紧迫
                ],
                borderColor: [
                    'rgba(52, 152, 219, 1)',
                    'rgba(46, 204, 113, 1)',
                    'rgba(155, 89, 182, 1)',
                    'rgba(52, 73, 94, 1)',
                    'rgba(231, 76, 60, 1)',
                    'rgba(241, 196, 15, 1)',
                    'rgba(230, 126, 34, 1)'
                ],
                borderWidth: 1
            }]
        };

        const config = {
            type: 'radar',
            data: data,
            options: {
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 5,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        };

        this.emotionChart = new Chart(ctx, config);
    }

    updateKeywords(keywords) {
        const keywordsList = document.getElementById('keywordsList');
        keywordsList.innerHTML = '<h3>情感关键词分析</h3>';
        
        // 创建积极关键词区域
        const positiveDiv = document.createElement('div');
        positiveDiv.className = 'keywords-section positive';
        positiveDiv.innerHTML = '<h4>积极关键词</h4>';
        
        keywords.positive.forEach(({keyword, count}) => {
            const span = document.createElement('span');
            span.className = 'keyword-item positive';
            span.textContent = `${keyword}(${count})`;
            positiveDiv.appendChild(span);
        });
        
        // 创建消极关键词区域
        const negativeDiv = document.createElement('div');
        negativeDiv.className = 'keywords-section negative';
        negativeDiv.innerHTML = '<h4>消极关键词</h4>';
        
        keywords.negative.forEach(({keyword, count}) => {
            const span = document.createElement('span');
            span.className = 'keyword-item negative';
            span.textContent = `${keyword}(${count})`;
            negativeDiv.appendChild(span);
        });
        
        keywordsList.appendChild(positiveDiv);
        keywordsList.appendChild(negativeDiv);
    }

    translateEmotion(emotion) {
        const translations = {
            'confidence': '信心',
            'achievement': '成就',
            'determination': '决心',
            'unity': '团结',
            'challenge': '挑战',
            'pressure': '压力',
            'urgency': '紧迫'
        };
        return translations[emotion] || emotion;
    }

    generateConclusion(result) {
        const { mainEmotion, intensity, scores } = result;
        const emotionType = mainEmotion.emotion;
        const isPositive = ['confidence', 'achievement', 'determination', 'unity'].includes(emotionType);
        
        let conclusion = '';
        
        // 根据主要情绪类型生成基础结论
        if (isPositive) {
            if (intensity > 1.5) {
                conclusion = '文本表现出强烈的积极情绪，';
            } else if (intensity > 1) {
                conclusion = '文本整体呈现积极向上的态度，';
            } else {
                conclusion = '文本带有温和的积极倾向，';
            }
        } else {
            if (intensity > 1.5) {
                conclusion = '文本表现出明显的紧迫感和压力，';
            } else if (intensity > 1) {
                conclusion = '文本反映出一定的挑战性，';
            } else {
                conclusion = '文本显示出轻微的压力特征，';
            }
        }

        // 添加具体情绪分析
        switch (emotionType) {
            case 'confidence':
                conclusion += '体现出较强的信心和确定性。';
                break;
            case 'achievement':
                conclusion += '突出展现了成就感和进步。';
                break;
            case 'determination':
                conclusion += '表达了坚定的决心和目标导向。';
                break;
            case 'unity':
                conclusion += '强调了团结协作的重要性。';
                break;
            case 'challenge':
                conclusion += '指出了需要面对的挑战和问题。';
                break;
            case 'pressure':
                conclusion += '反映出工作或任务的压力。';
                break;
            case 'urgency':
                conclusion += '强调了时间紧迫性和快速行动的需求。';
                break;
        }

        // 添加情绪平衡分析
        const positiveScore = Math.max(scores.confidence, scores.achievement, scores.determination, scores.unity);
        const negativeScore = Math.max(scores.challenge, scores.pressure, scores.urgency);
        
        if (Math.abs(positiveScore - negativeScore) < 1) {
            conclusion += ' 文本情绪较为平衡，同时包含积极因素和现实挑战。';
        } else if (positiveScore > negativeScore) {
            conclusion += ' 整体上保持乐观和建设性的态度。';
        } else {
            conclusion += ' 建议关注压力管理和积极因素的培养。';
        }

        return conclusion;
    }

    clearAll() {
        // 清空所有输入框
        const inputElements = document.querySelectorAll('input, textarea');
        inputElements.forEach(element => {
            element.value = '';
        });
        
        // 清空网页内容预览
        const webContentPreview = document.getElementById('webContentPreview');
        if (webContentPreview) {
            webContentPreview.innerHTML = '';
        }
        
        // 清空视频相关内容
        const videoContainer = document.getElementById('videoContainer');
        const videoFrame = document.getElementById('videoFrame');
        const transcriptionText = document.getElementById('transcriptionText');
        
        if (videoContainer) videoContainer.style.display = 'none';
        if (videoFrame) videoFrame.src = '';
        if (transcriptionText) transcriptionText.innerHTML = '';
        
        // 清空分析结果
        const emotionBar = document.getElementById('emotionBar');
        const mainEmotion = document.querySelector('#mainEmotion span');
        const conclusionText = document.querySelector('.conclusion-text');
        const keywordsList = document.getElementById('keywordsList');
        
        if (emotionBar) emotionBar.style.width = '0%';
        if (mainEmotion) mainEmotion.textContent = '';
        if (conclusionText) conclusionText.textContent = '';
        if (keywordsList) {
            keywordsList.innerHTML = '<h3>情感关键词</h3>';
        }
        
        // 清空图表
        if (this.emotionChart) {
            this.emotionChart.destroy();
            this.emotionChart = null;
            // 重置画布
            const canvas = document.getElementById('emotionChart');
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        // 重置所有编辑器和弹窗
        const webContentEditor = document.getElementById('webContentEditor');
        const contentEditArea = document.getElementById('contentEditArea');
        const fileInput = document.getElementById('fileInput');
        
        if (webContentEditor) webContentEditor.style.display = 'none';
        if (contentEditArea) contentEditArea.value = '';
        if (fileInput) fileInput.value = '';
        
        // 停止所有正在进行的操作
        if (this.videoAnalyzer) {
            this.videoAnalyzer.stopRecognition();
        }
        
        // 隐藏所有加载指示器
        const loadingIndicators = document.querySelectorAll('.loading-indicator, .spinner');
        loadingIndicators.forEach(indicator => {
            indicator.classList.add('hidden');
        });
        
        // 重置所有错误消息
        const errorMessages = document.querySelectorAll('.error-message');
        errorMessages.forEach(message => {
            message.remove();
        });
        
        // 重置拖放区域状态
        const dropZone = document.getElementById('dropZone');
        if (dropZone) {
            dropZone.classList.remove('drag-over');
        }
        
        // 清除任何定时器
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }

    // 添加主题提取方法
    async extractThemes() {
        const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
        let content = '';

        try {
            // 显示加载指示器
            const loadingIndicator = document.getElementById('loadingIndicator');
            loadingIndicator.classList.remove('hidden');

            switch (activeTab) {
                case 'url':
                    const url = document.getElementById('urlInput').value.trim();
                    if (!url) {
                        throw new Error('请输入网页URL');
                    }
                    if (!this.isValidUrl(url)) {
                        throw new Error('请输入有效的URL地址');
                    }
                    // 获取网页内容
                    content = await this.fetchWebPageContent(url);
                    break;
                case 'text':
                    content = document.getElementById('textInput').value;
                    break;
                case 'file':
                    content = document.getElementById('textInput').value;
                    break;
                case 'video':
                    content = document.getElementById('transcriptionText').textContent;
                    break;
            }

            content = content.trim();
            
            if (!content) {
                throw new Error('请先获取或输入需要分析的文本内容');
            }

            const themes = this.themeExtractor.extractThemes(content);
            
            // 根据当前面板选择显示位置
            let displayContainer;
            switch (activeTab) {
                case 'url':
                    displayContainer = 'webContentPreview';
                    break;
                case 'text':
                case 'file':
                    displayContainer = 'textInput';
                    break;
                case 'video':
                    displayContainer = 'transcriptionText';
                    break;
            }

            this.themeExtractor.displayThemes(themes, displayContainer);

        } catch (error) {
            // 显示更友好的错误提示
            const errorHtml = `
                <div class="error-message">
                    <p>${error.message}</p>
                    <p>建议：</p>
                    <ol>
                        <li>确保已输入或获取了文本内容</li>
                        <li>文本内容不能为空</li>
                        <li>尝试重新获取内容</li>
                    </ol>
                </div>
            `;

            // 在当前活动面板中显示错误信息
            switch (activeTab) {
                case 'url':
                    document.getElementById('webContentPreview').innerHTML = errorHtml;
                    break;
                case 'text':
                case 'file':
                    const textContainer = document.getElementById('textInput').parentElement;
                    const existingError = textContainer.querySelector('.error-message');
                    if (existingError) {
                        existingError.remove();
                    }
                    textContainer.insertAdjacentHTML('beforeend', errorHtml);
                    break;
                case 'video':
                    document.getElementById('transcriptionText').innerHTML = errorHtml;
                    break;
            }
        } finally {
            // 隐藏加载指示器
            const loadingIndicator = document.getElementById('loadingIndicator');
            loadingIndicator.classList.add('hidden');
        }
    }
}

class SpeechRecognizer {
    constructor() {
        this.isProcessing = false;
        this.audioContext = null;
        this.audioSource = null;
        this.transcribedText = '';
        this.progressCallback = null;
    }

    async initialize() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            throw new Error('您的浏览器不支持音频处理功能');
        }
    }

    setProgressCallback(callback) {
        this.progressCallback = callback;
    }

    updateProgress(percent, status) {
        if (this.progressCallback) {
            this.progressCallback(percent, status);
        }
    }

    async startVideoTranscription(videoFrame) {
        try {
            await this.initialize();
            this.isProcessing = true;
            this.updateProgress(0, '准备获取视频信息...');

            // 获取视频ID和信息
            const bvid = this.getBvidFromIframe(videoFrame);
            if (!bvid) {
                throw new Error('无法获取视频ID');
            }

            // 获取视频信息
            const videoInfo = await this.fetchBiliVideoInfo(bvid);
            if (!videoInfo) {
                throw new Error('无法获取视频信息');
            }

            this.updateProgress(20, '正在获取字幕...');

            // 尝试获取字幕
            let subtitles = await this.fetchBiliSubtitles(bvid, videoInfo.cid);
            if (!subtitles || subtitles.length === 0) {
                this.updateProgress(40, '无字幕，尝试获取视频简介...');
                // 如果没有字幕，使用视频标题和简介
                subtitles = [
                    videoInfo.title || '',
                    videoInfo.desc || ''
                ].filter(text => text.trim());
            }

            if (subtitles.length === 0) {
                throw new Error('无法获取视频文本内容');
            }

            this.updateProgress(100, '文本获取完成');

            // 更新显示
            this.updateTranscribedText(subtitles.join('\n'));

            return subtitles.join('\n');

        } catch (error) {
            console.error('视频文本获取失败:', error);
            this.updateProgress(0, '获取失败: ' + error.message);
            this.isProcessing = false;
            throw error;
        }
    }

    updateTranscribedText(text) {
        const transcriptionText = document.getElementById('transcriptionText');
        if (transcriptionText) {
            transcriptionText.innerHTML = `
                <div class="transcribed-content">
                    <pre>${text}</pre>
                    <button class="analyze-btn" onclick="document.getElementById('textInput').value = this.previousElementSibling.textContent; document.getElementById('analyzeBtn').click();">
                        分析文本
                    </button>
                </div>`;
        }
    }

    stopRecognition() {
        if (this.audioContext) {
            this.audioContext.close();
        }
        if (this.audioSource) {
            this.audioSource.disconnect();
        }
        this.isProcessing = false;
    }

    getBvidFromIframe(iframe) {
        const src = iframe.src;
        const match = src.match(/bvid=([^&]+)/);
        return match ? match[1] : null;
    }

    async fetchBiliVideoInfo(bvid) {
        try {
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
            
            const response = await fetch(proxyUrl + encodeURIComponent(apiUrl));
            const data = await response.json();
            
            if (data.code === 0 && data.data) {
                return {
                    title: data.data.title,
                    desc: data.data.desc,
                    cid: data.data.cid,
                    duration: data.data.duration
                };
            }
            return null;
        } catch (error) {
            console.error('获取视频信息失败:', error);
            return null;
        }
    }

    async fetchBiliSubtitles(bvid, cid) {
        try {
            if (!cid) {
                console.warn('未获取到cid，跳过字幕获取');
                return null;
            }

            // 使用新的API端点
            const apiUrl = `https://api.bilibili.com/x/player/v2?bvid=${bvid}&cid=${cid}`;
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            
            try {
                const response = await fetch(proxyUrl + encodeURIComponent(apiUrl));
                if (!response.ok) {
                    throw new Error('API请求失败');
                }
                
                const data = await response.json();
                
                // 检查返回数据结构
                if (data.code === 0 && data.data && data.data.subtitle) {
                    const subtitles = data.data.subtitle.subtitles || [];
                    if (subtitles.length > 0) {
                        const subtitleUrl = subtitles[0].subtitle_url;
                        if (!subtitleUrl) {
                            console.warn('未找到字幕URL');
                            return null;
                        }

                        // 确保使用HTTPS URL
                        const secureUrl = subtitleUrl.startsWith('//') 
                            ? 'https:' + subtitleUrl 
                            : subtitleUrl.replace(/^http:/, 'https:');

                        // 直接获取字幕内容，不使用代理
                        const subtitleResponse = await fetch(secureUrl);
                        if (!subtitleResponse.ok) {
                            throw new Error('字幕文件获取失败');
                        }

                        const subtitleData = await subtitleResponse.json();
                        if (subtitleData && subtitleData.body) {
                            return subtitleData.body
                                .sort((a, b) => a.from - b.from)
                                .map(item => item.content)
                                .filter(content => content.trim());
                        }
                    }
                }
                
                console.warn('视频没有字幕或字幕格式不正确');
                return null;
            } catch (error) {
                console.warn('字幕获取失败:', error);
                return null;
            }
        } catch (error) {
            console.error('字幕处理失败:', error);
            return null;
        }
    }
}

class ThemeExtractor {
    constructor() {
        // 扩展停用词列表
        this.stopWords = new Set([
            '的', '了', '和', '是', '就', '都', '而', '及', '与', '这', '那', '有', '在', '中', '为',
            '对', '到', '以', '等', '着', '又', '之', '但', '去', '来', '说', '要', '把', '让',
            '从', '向', '给', '但是', '所以', '因为', '如果', '虽然', '因此', '于是', '故而'
        ]);
        
        // 修改主题词特征
        this.themePatterns = {
            topic: /^[一二三四五六七八九十][、.\s]|^第[一二三四五六七八九十]|[主题重点]|^关于|^对于|^[就针]对/,
            conclusion: /总之|总结|概括|小结|归纳|综上|结论|总的来说|最后/,
            keyPoint: /关键|核心|要点|特点|特征|特色|主要|基本|重要|关于|表明/
        };

        // 修改句子提取参数
        this.maxSentenceLength = 50;  // 最大句子长度
        this.minSentenceLength = 10;  // 最小句子长度
    }

    extractThemes(text, maxThemes = 8) {
        // 分段落
        const paragraphs = text.split(/[\n\r]+/)
            .map(p => p.trim())
            .filter(p => p.length > 0);

        // 提取完整句子
        const sentences = this.extractSentences(paragraphs);
        
        // 按主题特征分类句子
        const categorizedSentences = this.categorizeSentences(sentences);

        // 计算句子得分
        const scoredSentences = this.scoreSentences(categorizedSentences, sentences);

        // 选择最终主题
        return this.selectThemes(scoredSentences, maxThemes);
    }

    extractSentences(paragraphs) {
        const sentences = [];
        const sentencePattern = /[^。！？；.!?;]+[。！？；.!?;]*/g;

        paragraphs.forEach(para => {
            const matches = para.match(sentencePattern);
            if (matches) {
                matches.forEach(sentence => {
                    sentence = sentence.trim();
                    if (this.isValidSentence(sentence)) {
                        sentences.push(sentence);
                    }
                });
            }
        });

        return sentences;
    }

    isValidSentence(sentence) {
        return sentence.length >= this.minSentenceLength && 
               sentence.length <= this.maxSentenceLength &&
               !/^[的了和是就都而及与这那有在中为]+/.test(sentence) &&
               /[。！？；.!?;]$/.test(sentence);
    }

    categorizeSentences(sentences) {
        const categories = {
            mainThemes: [],    // 主要主题
            subThemes: [],     // 相关主题
            keyPoints: []      // 关键要点
        };

        sentences.forEach(sentence => {
            if (this.themePatterns.topic.test(sentence)) {
                categories.mainThemes.push(sentence);
            } else if (this.themePatterns.conclusion.test(sentence)) {
                categories.keyPoints.push(sentence);
            } else if (this.themePatterns.keyPoint.test(sentence)) {
                categories.subThemes.push(sentence);
            }
        });

        return categories;
    }

    scoreSentences(categorizedSentences, allSentences) {
        const scores = {};
        const totalSentences = allSentences.length;

        // 计算每个句子的得分
        Object.entries(categorizedSentences).forEach(([category, sentences]) => {
            sentences.forEach(sentence => {
                let score = 0;
                
                // 位置得分
                const position = allSentences.indexOf(sentence);
                score += (1 - position / totalSentences) * 0.3;

                // 长度得分
                const lengthScore = (sentence.length - this.minSentenceLength) / 
                                  (this.maxSentenceLength - this.minSentenceLength);
                score += lengthScore * 0.2;

                // 关键词得分
                const keywordScore = this.calculateKeywordScore(sentence);
                score += keywordScore * 0.5;

                scores[sentence] = {
                    text: sentence,
                    score: Math.round(score * 100) / 100,
                    category
                };
            });
        });

        return scores;
    }

    calculateKeywordScore(sentence) {
        const keywords = [
            '表明', '说明', '证明', '体现', '反映',
            '重要', '关键', '核心', '主要', '基本',
            '特点', '特征', '特色', '优势', '问题'
        ];

        let score = 0;
        keywords.forEach(keyword => {
            if (sentence.includes(keyword)) {
                score += 0.1;
            }
        });

        return Math.min(score, 1);
    }

    selectThemes(scoredSentences, maxThemes) {
        const themes = {
            mainThemes: [],
            subThemes: [],
            keyPoints: []
        };

        // 按分数排序
        const sortedSentences = Object.values(scoredSentences)
            .sort((a, b) => b.score - a.score);

        // 为每个类别选择最高分的句子
        sortedSentences.forEach(item => {
            const category = item.category === 'mainThemes' ? 'mainThemes' :
                           item.category === 'keyPoints' ? 'keyPoints' : 'subThemes';
            
            if (themes[category].length < Math.ceil(maxThemes / 3)) {
                themes[category].push({
                    phrase: item.text,
                    score: item.score
                });
            }
        });

        return themes;
    }

    displayThemes(themes, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const hasThemes = themes.mainThemes.length > 0 || 
                         themes.subThemes.length > 0 || 
                         themes.keyPoints.length > 0;

        const themeHtml = `
            <div class="theme-container">
                <h3>主题分析结果</h3>
                ${hasThemes ? `
                    <div class="theme-sections">
                        ${this.renderThemeSection('主要主题', themes.mainThemes)}
                        ${this.renderThemeSection('相关主题', themes.subThemes)}
                        ${this.renderThemeSection('关键要点', themes.keyPoints)}
                    </div>
                ` : '<p class="no-themes">未能提取到主题，请尝试输入更多内容</p>'}
            </div>
        `;

        // 根据容器类型决定显示位置
        if (containerId === 'textInput') {
            const textContainer = container.parentElement;
            const existingThemes = textContainer.querySelector('.theme-container');
            if (existingThemes) {
                existingThemes.remove();
            }
            textContainer.insertAdjacentHTML('beforeend', themeHtml);
        } else {
            // 对于其他容器，在内容前面显示结果
            const existingThemes = container.querySelector('.theme-container');
            if (existingThemes) {
                existingThemes.remove();
            }
            container.insertAdjacentHTML('afterbegin', themeHtml);
        }
    }

    renderThemeSection(title, themes) {
        if (!themes || themes.length === 0) return '';
        
        return `
            <div class="theme-section">
                <h4>${title}</h4>
                <ul class="theme-list">
                    ${themes.map(theme => `
                        <li class="theme-item">
                            <span class="theme-text">${theme.phrase}</span>
                            <span class="theme-score">${theme.score}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
}

// 修改初始化代码
document.addEventListener('DOMContentLoaded', async () => {
    const analyzer = new EmotionAnalyzer();
    await analyzer.initialize();
    const inputHandler = new TextInputHandler(analyzer);

    // 文本输入面板按钮事件
    document.getElementById('textAnalyzeBtn').addEventListener('click', () => {
        const text = document.getElementById('textInput').value;
        if (text.trim()) {
            inputHandler.handleAnalysis(text);
        }
    });

    document.getElementById('textClearBtn').addEventListener('click', () => {
        document.getElementById('textInput').value = '';
        inputHandler.clearAll();
    });

    // 视频分析面板按钮事件
    document.getElementById('videoAnalyzeBtn').addEventListener('click', async () => {
        const videoUrl = document.getElementById('videoUrlInput').value;
        if (videoUrl.trim()) {
            try {
                await inputHandler.videoAnalyzer.handleVideoUrl(videoUrl);
                const text = document.getElementById('transcriptionText').textContent;
                if (text.trim()) {
                    inputHandler.handleAnalysis(text);
                }
            } catch (error) {
                alert('视频分析失败：' + error.message);
            }
        } else {
            alert('请输入视频URL');
        }
    });

    // 视频清空按钮事件
    document.getElementById('videoClearBtn').addEventListener('click', () => {
        document.getElementById('videoUrlInput').value = '';
        document.getElementById('transcriptionText').innerHTML = '';
        const videoContainer = document.getElementById('videoContainer');
        const videoFrame = document.getElementById('videoFrame');
        if (videoContainer) videoContainer.style.display = 'none';
        if (videoFrame) videoFrame.src = '';
        if (inputHandler.videoAnalyzer) {
            inputHandler.videoAnalyzer.stopRecognition();
        }
        inputHandler.clearAll();
    });

    // 添加语音转写按钮事件
    document.getElementById('speechToTextBtn').addEventListener('click', async () => {
        try {
            await inputHandler.videoAnalyzer.startSpeechToText();
        } catch (error) {
            alert('语音转写失败: ' + error.message);
        }
    });

    // 修改提取主题按钮事件，移到其他按钮事件之前
    const extractThemeBtn = document.getElementById('extractThemeBtn');
    if (extractThemeBtn) {
        extractThemeBtn.addEventListener('click', (e) => {
            // 阻止事件冒泡
            e.stopPropagation();
            // 阻止默认行为
            e.preventDefault();
            // 直接调用主题提取功能
            inputHandler.extractThemes();
        });
    }

    // 分析情绪按钮事件
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', () => {
            inputHandler.handleAnalysis();
        });
    }

    // 确保初始显示网页分析面板
    inputHandler.switchTab(document.querySelector('[data-tab="url"]'));
}); 