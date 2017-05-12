import {Component} from 'react'

import Slider from './Slider'

import tap from './tap'

import "./index.scss"

function Preview(current = '', urls = []){
    this.current = current
    this.urls = urls
    this.currentIndex = Math.max(urls.indexOf(current), 0)
    this.render()
    this.addEvents()

    new Slider(this.$root.querySelector('.preview'), this.urls, this.current, {
        close: ()=>{
            this.close()
        },
        onChange: (index) => {
            this.$root.querySelector('.dott').textContent = `${index + 1}/${urls.length}`
        }
    })
}
Preview.prototype = {
    addEvents(){
        tap(this.$root.querySelector('.close')).on('1', this.close.bind(this))
    },
    render(){
        var div = document.createElement('div')
        div.style.cssText += `
            position: fixed;
            top: 0;
            left: 0;
            height: 100%;
            width: 100%;
            z-index: 10000;
        `
        div.innerHTML = `
            <div class="module-image-preview">
                <div class="close"></div>
                <div class="preview">
                    <div class="parent">
                        <div class="preview-item">
                            <img src="" alt=""/>
                        </div>
                        <div class="preview-item">
                            <img src="" alt=""/>
                        </div>
                        <div class="preview-item">
                            <img src="" alt=""/>
                        </div>
                    </div>
                    <div class="dott">
                        ${this.currentIndex + 1}/${this.urls.length}
                    </div>
                </div>
            </div>
        `
        document.body.appendChild(div)
        this.$root = div
    },
    close(){
        document.body.removeChild(this.$root)
    }
}

window.wx = window.wx || {}
window.wx.previewImage = function(obj = {}){
    const {current = '', urls = []} = obj
    return new Preview(current, urls)
}

export default Preview
