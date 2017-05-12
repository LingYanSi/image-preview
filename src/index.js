import {Component} from 'react'

import Slider from './Slider'

import tap from './tap'

import "./index.scss"

class Preview extends Component{
    constructor(props){
        super(props)
        this.state = {
            index: Math.max(this.props.arr.indexOf(this.props.src), 0)
        }
    }
    componentDidMount(){
        // document.body.addEventListener('touchmove',this.preventDefault)
        // window.$log = this.refs.log
        const {src, arr} = this.props
        new Slider(this.refs.preview, arr, src, {
            close: ()=>{
                this.close()
            },
            onChange: (index) => {
                this.setState({
                    index
                })
            }
        })

        tap(this.ref.close).on('1', ()=>{
            this.close()
        })
    }
    componentWillUnmount(){
        document.body.removeEventListener('touchmove',this.preventDefault)
    }
    preventDefault(event){
        event.preventDefault()
    }
    close = ()=>{
        this.props.close && this.props.close()
    }
    render(){
        const {src, arr} = this.props

        return <div className="module-image-preview">
            <div className="close" ref="close"></div>
            <div className="preview" ref="preview">
                <div ref="$parent">
                    <div className="preview-item">
                        <img src="" alt=""/>
                    </div>
                    <div className="preview-item">
                        <img src="" alt=""/>
                    </div>
                    <div className="preview-item">
                        <img src="" alt=""/>
                    </div>
                </div>
                <div className="log" ref="log"></div>
                <div className="dott">
                    {this.state.index + 1}/{arr.length}
                </div>
            </div>
        </div>
    }
}

export default Preview
