/**
 * [Tap description]
 * @param {[type]}   $ele     [被监听元素]
 * @param {Function} callback [回调函数]
 * @param {[type]}   NUM      [点击次数]
 * @param {[type]}   TIME     [点击时间间隔]
 */

const PC = !navigator.userAgent.toLowerCase().match(/android|phone|ipod|ipad/g)

const TOUCHSTART = PC ? 'mousedown' : 'touchstart'
const TOUCHMOVE  = PC ? 'mousemove' : 'touchmove'
const TOUCHEND   = PC ? 'mouseup' : 'touchend'

// 符合标准，就给来一个settimeout()
// 应该提供一个可监听点击次数的函数
// 会返回on('1', function(){
//
// }).on('2', function(){
//
// }).on('swipe', function(){
//
// }).on('zoom', function(){
//
// })

class  Event {
    __cache = {}
    on(name, callback){
        let {__cache} = this
        __cache[name] = __cache[name] || []
        if (callback) {
            __cache[name].push(callback)
        } else {
            __cache[name].forEach(cb => cb())
        }
        return this
    }
    off(name, callback){
        let {__cache} = this
        if (!name) {
            this.__cache = {}
            return this
        }

        if (name && callback) {
            __cache[name] = (__cache[name] || []).filter(cb => cb === callback)
            return this
        }

        __cache[name] = []
        return this
    }
    trigger(name, ...args){
        let {__cache} = this
        ;(__cache[name] || []).forEach(cb => cb(...args))
        return this
    }
}

class Tap extends Event {
    constructor($ele, TIME = 300){
        super()
        this.$ele = $ele
        this.TIME = TIME
        this.reset()
        this.__addEvents()
    }
    reset(){
        this.state = {
            times: [],
            recording: false,
            first: false
        }
    }
    __touchstart = event => {
        let {state, TIME } = this

        clearTimeout(this.__timeout)
        state.times.push({
            start: Date.now()
        })
        state.recording = true
    }
    __touchmove = event => {
        this.state.recording = false
    }
    __touchend = event => {
        let {state, TIME} = this
        // 得到连续点击次数，判断有没有比当前连续点击次数更大的事件监听，如果有就setTimeout，没有立即执行
        // 在下次touchstart的时候，清除所有setTimeout，因为按理说你已经执行了

        if (state.recording) {
            state.times[state.times.length - 1].end = Date.now()
            let times = state.times.length
            let keys = Object.keys(this.__cache).map(i => +i)

            if (keys.indexOf(times) > -1 && this.__testTIME()) {
                this.__timeout = setTimeout(()=>{
                    this.reset()
                    this.trigger(times, event)
                }, Math.max(...keys) == times ? 0 : TIME)
            } else {
                if (Math.max(...keys) == times) {
                    this.reset()
                }
            }
        } else {
            this.reset()
        }
    }
    __testTIME(){
        const {state, TIME} = this
        return state.times.every((item, index, arr) => {
            if (index > 0) {
                return item.end - arr[index -1].start < TIME
            } else {
                return true
            }
        })
    }
    __addEvents(){
        const {$ele} = this
        $ele.addEventListener(TOUCHSTART, this.__touchstart)
        $ele.addEventListener(TOUCHMOVE, this.__touchmove)
        $ele.addEventListener(TOUCHEND, this.__touchend)
    }
    __removeEvents(){
        const {$ele} = this
        $ele.removeEventListener(TOUCHSTART, this.__touchstart)
        $ele.removeEventListener(TOUCHMOVE, this.__touchmove)
        $ele.removeEventListener(TOUCHEND, this.__touchend)
    }
    destory(){
        this.off()
        this.__removeEvents()
    }
}

export default Tap
