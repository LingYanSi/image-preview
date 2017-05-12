
const [eventstart, eventmove, eventend] =
  window.navigator.userAgent.match(/iphone|android|ipad|ipod/i)
  ? ['touchstart', 'touchmove', 'touchend']
  : ['mousedown', 'mousemove', 'mouseup']

const utils = {
    // 获取位置信息
    getBoundingClientRect($dom){
        const {width, height, top, left, bottom, right} = $dom.getBoundingClientRect()
        return {width, height, top, left, bottom, right}
    },
    // 正方形矩阵计算
    transformMatrix(x, y){
        var xx = Math.sqrt(x.length)
        var yy = Math.sqrt(y.length)

        var m = []
        for (var i = 0; i < xx; i++) {

            for (var j = 0; j < xx; j++) {
                var ele = 0
                for (var z = 0; z < xx; z++) {
                    ele += x[i*xx + z] * y[j + z*xx]
                }
                m.push(ele)
            }
        }

        return m
    },
    // 矩阵连续变换
    transformMatrixs(...args){
        // 反转数组
        return args.reverse().reduce((prev, current) => {
            return this.transformMatrix(prev, current)
        })
    },
    // 获取两点间距离
    getLen(prev){
        return Math.pow(prev.x - prev.x1, 2) +  Math.pow(prev.y - prev.y1, 2)
    },
    // 获取缩放比例
    getScale(prev, current){
        var len1 = this.getLen(prev)
        var len2 = this.getLen(current)

        let SCALE = Math.pow(len2/len1, 1/2)
        SCALE = +SCALE.toFixed(10)

        return SCALE
    },
}
// 图片缩放
/**
 * [Pinch 图片手势缩放]
 * @param {[type]} $ele        [需要缩放的元素：被监听手势的元素]
 * @param {[type]} [$dom=$ele] [被缩放元素，之所以不是同一个元素，比较符合独立、解耦的规范]
 * @param {[type]} moveCB      [缩放移动中对的回调函数]
 * @param {[type]} endCB       [缩放移动结束的回调函数]
 */
class Pinch {
    // onChange
    // onEnd
    // onZoom
    // zoom = 1
    // toogle
    // setMatrix
    zoom = 1
    MAX_ZOOM = 1
    matrix = [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]
    state = {
        // 存储元素的初始状态：坐标、宽高
        dimension : {
            width: window.innerWidth,
            height: window.innerHeight
        },
        // 滑动速度
        speed: {
            x: 0,
            y: 0,
            time: 0,
        },
        // 上一个位置
        prev: {
            x: 0,
            y: 0,
            x1: 0,
            y1: 0
        },
        // 当前位置
        current: {
            x: 0,
            y: 0,
            x1: 0,
            y1: 0
        },
        // 单指滑动方向
        singleDirection: undefined,
        // 有效触摸点， 是否在滑动中
        num: 0,
        moving: false,
        transitioning : false,
        loaded: false,
        // touchmove时把渲染任务假如队列，等到requestAnimationFrame时候，合并任务，只渲染一次
        queue: [],
        // 是否start
        canMove: false,
    }
    // 动画执行完毕
    transitionend = event => {
        const {$dom, state} = this

        event && event.stopPropagation()

        state.singleDirection = undefined
        // 移除transition
        $dom.style.cssText += `;transition: none;`
        state.transitioning = false
    }
    // 图片加载完毕
    load = () => {
        const {$dom, state} = this
        state.loaded = true
        state.origin = utils.getBoundingClientRect($dom)
        $dom.parentElement.classList.remove('loading')
        $dom.style.cssText += `; visibility: visible;`
        this.MAX_ZOOM = $dom.naturalWidth / $dom.clientWidth
    }
    // 执行requestAnimationFrame中的任务
    render = () => {
        requestAnimationFrame(()=>{
            var queue = this.state.queue
            if(queue.length) {
                queue[queue.length - 1]()
                queue.splice(0, queue.length)
            }
        })
    }
    // 当screen resize后，需要重置orign dimension数据
    windowResize = () => {
        let {state} = this
        var dimension = {
            width: window.innerWidth,
            height: window.innerHeight
        }

        state.origin.left += (dimension.width - state.dimension.width)/2
        state.origin.top += (dimension.height - state.dimension.height)/2

        state.dimension = dimension
    }
    toggle(center, SCALE = 2){
        SCALE = Math.min(this.MAX_ZOOM, SCALE)
        let {matrix, state, $dom} = this
        if( matrix[0] != 1 || matrix[12] != 0 || matrix[13]!=0 ){
            matrix = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]
        } else {
            // 放大两倍
            matrix = [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]

            state.current = center = center || {
                x: state.dimension.width/2,
                y: state.dimension.height/2,
                x1: state.dimension.width/2,
                y1: state.dimension.height/2,
            }

            // 获取以点为缩放中心缩放后的矩阵
            matrix = this.getScaledMatrix(SCALE, matrix, center, state.origin)
            // 边界校验
            const {TX, TY} = this.getOverflow(SCALE, matrix[12], matrix[13])

            matrix[12] = TX
            matrix[13] = TY
        }
        this.setMatrix($dom, matrix, true)
    }
    /**
     * [getScaledMatrix 获取缩放后矩阵]
     * @param  {Number} [SCALE=1]    [放大倍数]
     * @param  {Array}  [matrix=[]]  [当前矩阵]
     * @param  {Object} [current={}] [当前坐标]
     * @param  {Object} [origin={}]  [原始坐标]
     * @return {Array}              [新矩阵]
     */
    getScaledMatrix(SCALE = 1, matrix = [], current = {}, origin = {}){

        // 在这里，我们设置transform-origin: 0 0 0;然后所有的计算以图片的左上角为基准，这样方便计算位置变换后的位移
        // 1. 计算出current中点相对于左上角的坐标
        // 2. 根据缩放比例，计算出中点坐标的相对位移
        // 3. 矩阵 -> 缩放后矩阵 -> 位移矫正
        var fuck = {
            x: (current.x + current.x1)/2 - (origin.left + matrix[12]),
            y: (current.y + current.y1)/2 - (origin.top + matrix[13])
        }

        // 计算位移
        var fu = {
            x: - fuck.x * (SCALE - 1),
            y: - fuck.y * (SCALE - 1)
        }

        // 计算缩放后矩阵
        var m = [
            SCALE, 0, 0, 0,
            0, SCALE, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ]
        matrix = utils.transformMatrixs(matrix, m)

        // 位移纠正
        var S = matrix[0]
        m = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            fu.x/S, fu.y/S, 0, 1,
        ]

        matrix = utils.transformMatrixs(matrix, m)

        return matrix
    }
    // 边界校验
    checkBorder(SCALE, TX, TY){
        const data = this.getOverflow(SCALE, TX, TY)
        TX = data.TX
        TY = data.TY

        return {TX, TY}
    }
    // 获取溢出量
    // 根据元素自身width height top left 获取放大SCALE倍后元素的最大，最小偏移
    getOverflow(SCALE, TX, TY){
        const {state} = this
        var OF_X = 0
        var OF_Y = OF_X

        // 边界校验
        var d_width = state.dimension.width
        var d_height = state.dimension.height
        var {width, height, top, left} = state.origin
        // max translateX
        var MAX_TX = width*SCALE - d_width > 0 ? -left : -width*(SCALE - 1)/2
        // min translateX
        var MIN_TX = width*SCALE - d_width > 0 ? -width*(SCALE - 1) +left : -width*(SCALE - 1)/2
        // max translateY
        var MAX_TY =  height*SCALE - d_height > 0 ? -top : -height*(SCALE - 1)/2
        // min translateY
        var MIN_TY =  height*SCALE - d_height > 0 ? -height*(SCALE - 1) + top : -height*(SCALE - 1)/2

        if (TX > MAX_TX) OF_X = TX - MAX_TX
        if (TX < MIN_TX) OF_X = TX - MIN_TX

        if (TY > MAX_TY) OF_Y = TY - MAX_TY
        if (TY < MIN_TY) OF_Y = TY - MIN_TY

        TX = Math.min(TX, MAX_TX)
        TX = Math.max(TX, MIN_TX)

        TY = Math.min(TY, MAX_TY)
        TY = Math.max(TY, MIN_TY)

        ;[OF_X, OF_Y, TX, TY, MAX_TX, MIN_TX, MAX_TY, MIN_TY] =
            [OF_X, OF_Y, TX, TY, MAX_TX, MIN_TX, MAX_TY, MIN_TY].map(item => item == 0 ? item : +(+item).toFixed(6))

        return {
            OF_X,
            OF_Y,
            TX,
            TY,
            MAX_TX,
            MIN_TX,
            MAX_TY,
            MIN_TY,
        }
    }
    /**
     * [setMatrix 修改元素transform]
     * @param {DOM}  $ele                [HTMLElement]
     * @param {Array}  matrix              [新4x4矩阵]
     * @param {Boolean} [animation=false]   [是否执行东环]
     * @param {Number}  [ANIMATION_TIME=.3] [动画时间长度]
     */
    setMatrix($ele, matrix = [], animation = false, ANIMATION_TIME = .3){
        if (!$ele) return

        this.matrix = matrix = matrix.map(item => item == 0 ? item : +(+item).toFixed(6))
        this.zoom = (+matrix[0]).toFixed(5)
        var str =';transform: matrix3d(' + matrix.join(',') + ');'

        if(!animation) {
            $ele.style.cssText += str
        } else {
            $ele.style.cssText += `;transition: transform ${ANIMATION_TIME}s;`
            $ele.clientHeight
            $ele.style.cssText += str
        }
    }
    addEvents(){
        const {state, $ele, $dom} = this
        if(state.addEventListener) return
        state.addEventListener = true
        $ele.addEventListener(eventstart, this.touchstart)
        $ele.addEventListener(eventmove, this.touchmove)
        $ele.addEventListener(eventend, this.touchend)
        // $ele.addEventListener('touchcancel', touchend)

        if ($dom.tagName.toLowerCase() == 'img' && state.loaded == false) {
            if ($dom.complete) {
                this.load()
            } else {
                $dom.parentElement.classList.add('loading')
                $dom.addEventListener('load', this.load)
            }
        } else {
            state.loaded = true
        }

        // resize时，修改基础数据
        window.addEventListener('resize', this.windowResize)
        $dom.addEventListener('transitionend', this.transitionend)
    }
    removeEvents(){
        const {state, $dom, $ele} = this
        state.addEventListener = false

        $ele.removeEventListener(eventstart, this.touchstart)
        $ele.removeEventListener(eventmove, this.touchmove)
        $ele.removeEventListener(eventend, this.touchend)
        // $ele.removeEventListener('touchcancel', touchend)

        $dom.removeEventListener('transitionend', this.transitionend)
        $dom.removeEventListener('load', this.load)
        window.removeEventListener('resize', this.windowResize)
    }
    destory(){
        this.removeEvents()
        this.state = null
        this.matrix = null
    }
    touchstart = event => {
        let {state} = this
        event.preventDefault()

        var touches = event.touches || [event]
        var touch1 = touches[0]
        var touch2 = touches[1] || {}

        // 确保没transition
        this.transitionend()

        if(!state.moving || state.num < 2){
            state.num = touches.length
            state.current = state.prev = {
                x: touch1.clientX,
                y: touch1.clientY,
                x1: touch2.clientX,
                y1: touch2.clientY
            }
            // 缓存时间
            state.speed.time = Date.now()
            state.num == 2 && this.options.onChange && this.options.onChange(0, 0, state.dimension)
        }
        state.canMove = true
    }
    touchmove = event => {
        let {state, $dom, matrix} = this

        event.preventDefault()
        event.stopPropagation()

        if(state.transitioning || !state.canMove) return

        state.moving = true
        var touches = event.touches || [event]
        // var [touch1, touch2] = touches
        var touch1 = touches[0]
        var touch2 = touches[1]

        state.queue.push( () => {
            if (state.loaded && state.num == 2 && touches.length==2) {
                state.current =  {
                    x: touch1.clientX,
                    y: touch1.clientY,
                    x1: touch2.clientX,
                    y1: touch2.clientY
                }
                // 双指触摸
                var SCALE = utils.getScale(state.prev, state.current)
                // x,y轴缩放

                matrix = this.getScaledMatrix(SCALE, matrix, state.current, state.origin)

                // 保存当前信息，用于下次计算缩放比例
                state.prev = state.current

                this.setMatrix($dom, matrix)

            } else if (state.num == 1 && touches.length == 1) {
                state.current =  {
                    x: touch1.clientX,
                    y: touch1.clientY
                }

                var translateX = state.current.x - state.prev.x
                var translateY = state.current.y - state.prev.y

                // if(Math.abs(translateX) > 14 || Math.abs(translateY) > 14) return
                // 单只触摸
                SCALE = matrix[0]

                // 如果缩放比例等于1，监听手指是左右滑动还是上下滑动
                let sdY , sdX
                if(state.singleDirection === undefined ) {
                    state.singleDirection  = Math.abs(translateX) > Math.abs(translateY)
                }
                sdX = +state.singleDirection
                sdY = +(!sdX)

                if(SCALE > 1) {
                    state.singleDirection = sdX = sdY = 1
                }
                // x,y轴位移
                var m = [
                    1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    translateX/SCALE*sdX, translateY/SCALE*sdY, 0, 1,
                ]

                // 得到位移后矩阵
                matrix = utils.transformMatrixs(matrix, m)

                // 在这里可以对位移做处理
                const {OF_X, OF_Y, TX, TY} = this.getOverflow(matrix[0], matrix[12], matrix[13])
                // window.$log.textContent = `${OF_X} ${OF_Y}`
                // $log.textContent = '1 finger move'

                this.options.onChange && this.options.onChange(OF_X, OF_Y, state.dimension)

                // init[12] = TX
                matrix[13] = TY

                // 保存当前信息
                state.prev = state.current

                this.setMatrix($dom, matrix)

                // x,y方向，滑动速度
                var speed = state.speed
                var time = Date.now()
                speed.x = translateX/(time - speed.time) * sdX
                speed.y = translateY/(time - speed.time) * sdY
                speed.time = time
            }
        })
        this.render()
    }
    touchend = event => {
        let {state, $dom, matrix} = this

        event.preventDefault()
        state.canMove = false

        if(state.transitioning) return
        // 滑动结束，在下一次touchstart前，不要在再执行touchmove事件
        state.transitioning = true

        // 结束滑动任务
        state.queue.push(()=>{
            if(state.moving){
                // 双指变单指后，要改变state.prev为剩下的那一finger，不然后造成变化突兀
                // 不过需要注意的是手指滑动会阻塞js执行，因此当两个fingertouchend的间隔很小的时候会造成touch也不存在了
                if(state.num == 2){
                    const touch = event.touches[0]
                    state.prev = touch ? {
                        x: touch.clientX,
                        y: touch.clientY
                    } : state.prev
                }

                // 如果缩放比例小于1，就恢复原状
                var SCALE = matrix[0]
                if(SCALE <= 1 && state.num == 2){
                    matrix = this.getScaledMatrix(1/SCALE, matrix, state.current, state.origin)
                }

                // 缓存当前缩放比例，位移
                SCALE = matrix[0]
                var TX_CACHE = matrix[12]
                var TY_CACHE = matrix[13]

                // 检测是否溢出
                var {OF_X, OF_Y} = this.getOverflow(SCALE, matrix[12], matrix[13])

                // 如果是单指滑动，并且x方向溢出
                if(this.options.onEnd && OF_X != 0 && state.num == 1){
                    state.moving = state.num = 0
                    let {OF_X, OF_Y, MAX_TX ,MIN_TX, TX, TY} = this.getOverflow(SCALE, matrix[12], matrix[13])

                    matrix[12] = OF_X > 0 ? MAX_TX : MIN_TX
                    matrix[13] = TY

                    // 如果是单张图片，就执行动画
                    this.setMatrix($dom, matrix, this.options.isSingle)
                    this.options.onEnd(OF_X, OF_Y, state.dimension)

                    return
                }

                // 根据滑动速度，模拟真实滑动
                if(state.num == 1){
                    // 速度系数
                    const K = 200
                    var speed = state.speed
                    matrix[12] += speed.x * K
                    matrix[13] += speed.y * K

                    // 重置掉
                    state.speed = {
                        x: 0,
                        y: 0,
                        time: 0
                    }
                }

                // 是否开启最大缩放校验
                if (this.options.maxZoomCheck && Math.min(SCALE, this.MAX_ZOOM) != SCALE) {
                    matrix = this.getScaledMatrix(this.MAX_ZOOM / SCALE, matrix, state.current, state.origin)
                    SCALE = matrix[0]
                }
                // 边界校验，返回TX, TY [x轴位移， y轴位移]
                var { TX, TY} = this.getOverflow(SCALE, matrix[12], matrix[13])

                state.num == Math.max(--state.num, 0)

                // 如果
                if(TX != TX_CACHE || TY != TY_CACHE){
                    state.moving = false
                    state.num = 0
                    state.transitioning = true

                    matrix[12] = TX
                    matrix[13] = TY

                    this.setMatrix($dom, matrix, true)
                } else {
                    state.moving = !!state.num
                }
            }
        })
        this.render()
    }
    /**
     * [constructor description]
     * @method constructor
     * @param  {DOM}    $ele         [接受事件监听元素]
     * @param  {DOM}    [$dom=$ele]  [被缩放元素]
     * @param  {Object}    [options={}] [可选参数]
     * @return {Pinch}                 [description]
     */
    constructor($ele, $dom = $ele, options = {maxZoomCheck: false, isSingle: false}){
        this.$ele = $ele
        this.$dom = $dom
        this.options = options
        this.state.origin = utils.getBoundingClientRect($dom)
        // 设定transform-origin为左上角
        $dom.style.cssText += ';visibility: hidden ;transform-origin: 0 0 0;'

        this.addEvents()

        this.setMatrix($dom, this.matrix)
    }
}
// z轴旋转
// var w = [
//     Math.cos(-Math.PI/4), Math.sin(-Math.PI/4), 0, 0,
//     -Math.sin(-Math.PI/4), Math.cos(-Math.PI/4), 0, 0,
//     0, 0, 1, 0,
//     0, 0, 0, 1
//     ]


export default Pinch
