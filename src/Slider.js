
import Pinch from './newPinch'
import Tap from './tap'


/*
    $ele: 父元素
    arr: 图片数组
    url: 当前图片
*/

const TRANSITION      = `;transition: .3s;`
const TRANSITION_NONE = `;transition: none;`
const TRANSFORM_NONE  = `;transform: none;`
const CURRENT_STYLE   = `;transform: translate3D( 0% , -50%, 0);`
const NEXT_STYLE      = `;transform: translate3D( 100% , -50%, 0);`
const PREV_STYLE      = `;transform: translate3D( -100% , -50%, 0);`

const PC = !navigator.userAgent.toLowerCase().match(/android|phone|ipod|ipad/g)
// 缓存图片状态
let imageLoadStatusCache = {}

function setTranslate(translate){
    return `;transform: translate3D( ${translate} , -50%, 0);`
}

function setHtml($dom, src = '') {
    // if (PC) {
    //     $dom.style.cssText += `;height: 100%; background-image: url(${src});`
    // } else {
        PC && $dom.classList.add('pc')
        if (!imageLoadStatusCache[src]) {
            $dom.querySelector('img').src = ''
        }
        $dom.querySelector('img').src = src

        // 缓存图片状态
        if (!imageLoadStatusCache[src]) {
            $dom.querySelector('img').onload = ()=>{
                imageLoadStatusCache[src] = true
            }
        }
    // }
}

class Slider {
    constructor($ele, arr = [], url = '', options = {}){
        this.$ele = $ele
        this.arr = arr
        this.options = options

        this.$items = [].slice.call($ele.querySelectorAll('.preview-item'))
        this.endNum = 0
        this.currentIndex = arr.indexOf(url)

        $ele.tabIndex = '198765214'
        $ele.focus()
        $ele.addEventListener('keyup', event => {
            const keyCode = event.keyCode

            switch (keyCode) {
                case 37: {
                    this.prev()
                    break
                }
                case 39: {
                    this.next()
                    break
                }
                case 27: {
                    options.close && options.close()
                    break
                }
            }
        })

        this.load = ()=>{
            // 如果是pc，关闭Pinch
            if (PC) {
                // return
            }

            this.pinch = new Pinch(this.$ele, this.$img, {
                isSingle: this.arr.length < 2,
                onChange: (TX, TY, dimension)=>{
                    if (this.arr.length < 2) return
                    if(TX < 0){
                        this.$next.style.cssText += setTranslate(`${TX + dimension.width}px`)
                        this.$prev.style.cssText += PREV_STYLE
                    }else {
                        this.$prev.style.cssText += setTranslate(`${TX - dimension.width}px`)
                        this.$next.style.cssText += NEXT_STYLE
                    }
                },
                onEnd: (TX, TY, dimension) => {
                    if (this.arr.length < 2) return

                    const MAX = 100
                    if(TX == 0) return
                    this.$current.style.cssText += setTranslate(`${TX}px`)
                    this.$next.clientHeight

                    if(TX<0){
                        Math.abs(TX) > MAX ? this.next() : this.recover(this.$next, NEXT_STYLE)
                    }else {
                        Math.abs(TX) > MAX ? this.prev() : this.recover(this.$prev, PREV_STYLE)
                    }
                    // 移除事件监听，避免有不必要的响应
                    this.pinch.removeEvents()
                }
            })


            this.tap = new Tap(this.$img, 500).on('2', event => {
                const touch = event.changedTouches ? event.changedTouches[0] : event
                const center = {
                    x: touch.clientX,
                    y: touch.clientY,
                    x1: touch.clientX,
                    y1: touch.clientY
                }
                // 添加放大中心
                this.pinch.toggle(center)
            }).on('1', event => {
                this.pinch.zoom == 1 && this.options.close && this.options.close()
                // 不在放大状态，就关闭modal
            })

            // this.tap = Tap(this.$img, (event)=> {
            //     const touch = event.changedTouches ? event.changedTouches[0] : event
            //     const center = {
            //         x: touch.clientX,
            //         y: touch.clientY,
            //         x1: touch.clientX,
            //         y1: touch.clientY
            //     }
            //     // 添加放大中心
            //     this.pinch.toggle(center)
            // }, 2, 600)
        }

        this.end = ()=>{
            this.endNum++
            if(this.endNum < 2) return
            this.endNum = 0

            let $dom = this.direction == 0 ? this.$current : (this.direction<0 ? this.$prev : this.$next)
            if($dom != this.$current){
                this.$img.style.cssText += TRANSITION_NONE
                // debugger
                this.$img.removeEventListener('load', this.load)
                this.$ele.removeEventListener('transitionend', this.end)

                if (this.pinch) {
                    this.pinch.destory()
                    this.tap.destory()
                }
            }else {
                // 恢复时间监听
                this.pinch && this.pinch.addEvents()
            }

            this.$current.style.cssText += TRANSITION_NONE
            this.$current.classList.remove('current')
            $dom !== this.$current && (this.$current.querySelector('img').style.cssText += TRANSFORM_NONE)

            this.$prev.style.cssText += TRANSITION_NONE
            this.$prev.querySelector('img').style.cssText += TRANSFORM_NONE

            this.$next.style.cssText += TRANSITION_NONE
            this.$next.querySelector('img').style.cssText += TRANSFORM_NONE

            this.options.onChange && this.options.onChange(this.checkIndex(this.currentIndex + this.direction), this.currentIndex)
            this.currentIndex = this.checkIndex(this.currentIndex + this.direction)

            this.init($dom)
        }
        this.init()
    }
    next(){
        this.$current.style.cssText += TRANSITION
        this.$next.style.cssText += TRANSITION
        this.$next.clientHeight
        this.$next.style.cssText += CURRENT_STYLE
        this.$current.style.cssText += PREV_STYLE
        this.direction = 1
    }
    prev(){
        this.$current.style.cssText += TRANSITION
        this.$prev.style.cssText += TRANSITION
        this.$prev.clientHeight
        this.$prev.style.cssText += CURRENT_STYLE
        this.$current.style.cssText +=  NEXT_STYLE
        this.direction = -1
    }
    recover($dom, style){
        this.$current.style.cssText += TRANSITION
        $dom.style.cssText += TRANSITION
        this.$next.clientHeight
        $dom.style.cssText += style
        this.$current.style.cssText += CURRENT_STYLE
        this.direction = 0
    }
    checkIndex(index){
        if(index < 0) {
            return this.arr.length - 1
        }
        if( index > this.arr.length - 1) {
            return 0
        }
        return index
    }
    init($dom){
        this.direction = 0
        if($dom){
            if($dom == this.$current ) return
        }

        this.$current = $dom || this.$items[0]
        this.$current.classList.add('current')
        this.$current.style.cssText += CURRENT_STYLE
        this.$ele.addEventListener('transitionend', this.end)

        let $img = this.$img = this.$current.querySelector('img')
        // 需要图片加载完再显示
        setHtml(this.$current, this.arr[this.currentIndex])
        this.load()

        this.$next = this.$current.nextElementSibling || this.$items[0]
        this.$next.style.cssText += NEXT_STYLE
        // setHtml(this.$next, '')
        setHtml(this.$next, this.arr[this.currentIndex + 1] || this.arr[0])

        this.$prev = this.$current.previousElementSibling || this.$items[this.$items.length - 1]
        this.$prev.style.cssText += PREV_STYLE
        // setHtml(this.$next, '')
        setHtml(this.$prev, this.arr[this.currentIndex - 1] || this.arr[this.arr.length - 1])
    }
}

export default Slider
