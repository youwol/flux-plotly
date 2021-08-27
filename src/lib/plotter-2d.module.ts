
import { pack } from './main';
import { Property, Flux, ModuleFlux, BuilderView, RenderView, Schema, expectSome, 
    expectInstanceOf, Scene, createEmptyScene, Context } from '@youwol/flux-core'
import * as Plotly from 'plotly.js'

import { Trace2D } from './models';

let svgIcon = `
<polygon points="427.377,308.65 362.722,308.65 362.722,243.994 365.722,243.994 365.722,305.65 427.377,305.65    "/><polygon points="443.264,307.15 420.878,298.003 426.189,307.15 420.878,316.295     "/><polygon points="364.222,228.108 373.369,250.494 364.222,245.182 355.077,250.494     "/>
<circle cx="380" cy="275.667" r="2.667"/><circle cx="413" cy="282.667" r="2.667"/><circle cx="392" cy="262" r="2.667"/><circle cx="406.254" cy="297.527" r="2.667"/><circle cx="426.673" cy="275.349" r="2.667"/><circle cx="402.536" cy="279.724" r="2.667"/><circle cx="408.921" cy="264.667" r="2.667"/><circle cx="412.921" cy="273" r="2.667"/><circle cx="389.333" cy="293" r="2.667"/><circle cx="406.254" cy="253" r="2.667"/><circle cx="393.333" cy="272.999" r="2.667"/><circle cx="382.667" cy="247.666" r="2.667"/>
`
/**
## Presentation

The scatter plot module is a *scene* for [[ModuleTrace2D|2d traces]]: 
it's purpose is to display 2d traces that reach the input of the module over time.

## Typical usage

Provide 2D traces constructed from the [[ModuleTrace2D|2d trace module]] to the input of the module.

> 👾 2D traces have a **traceId** property defined in the configuration.
> t is an important field to consider when multiple traces will be displayed
> in a viewer: only the latest object received for a particular **traceId** is displayed.

The property **layoutOptions** of the configuration allows to define layout, titles, margins, etc,
see [[ModulePlotter2D.PersistentData]].

## Example

The following example illustrates a simple use of the module:
<iframe 
    title="Simple example"
    width="100%"
    height="500px"
    src="/ui/flux-runner/?id=b6f7ae4b-c106-457c-9de1-2c94aeea5986"> 
</iframe>

The underlying workflow can be accessed [here](/ui/flux-builder/?id=b6f7ae4b-c106-457c-9de1-2c94aeea5986).

## Resources

 Various resources:
 -    [plotly](https://plotly.com/javascript/): underlying rendering library 
 -    [layout](https://plotly.com/javascript/reference/layout/): options available to style the graph's layout
 */
export namespace ModulePlotter2D {


let layoutOptions =  `
// some example here: https://plotly.com/javascript/line-and-scatter/
return {
        title: 'Scatter Plot'
    }
`

    @Schema({ 
        pack: pack,
        description: "Persistent Data of DataframePlot"
    })
    export class PersistentData {

        /**
         * json object that defines the layout.
         * 
         * For instance:
         * ```js
         * return {
         *     title:'Some title',
         *     font:{
         *         family:'Arial',
         *     },
         *     margin: {
         *         t:'20',
         *         b: '25',
         *     }
         * }
         * ``` 
         * 
         * See all available options (here)[https://plotly.com/javascript/reference/layout/]
         */
        @Property({
            description: "layout options",
            type: 'code'
        })
        readonly layoutOptions: string | (({dataframe}) => any) = layoutOptions

        /**
         * 
         * @ignore
         */
        getLayoutOptions() : any {
            return typeof(this.layoutOptions == 'string') 
                ? new Function(this.layoutOptions as string)()
                : this.layoutOptions
        }

        /**
         * 
         * @ignore
         */
        constructor(params : { 
            layoutOptions?: string,
        } = {}) {
            Object.assign(this, params)
        }
    }

    let inputContract = expectSome({
        when:expectInstanceOf({
            typeName:'trace-2D',
            Type: Trace2D,
            attNames:['trace']
        })
    })

    @Flux({
        pack:           pack,
        namespace:      ModulePlotter2D,
        id:             "ModulePlotter2D",
        displayName:    "plotter 2D",
        description:    "2D plotter",
        resources:{
            'technical doc': `${pack.urlCDN}/dist/docs/modules/lib_plotter_2d_module.moduleplotter2d.html`
        }
    })
    @BuilderView({
        namespace:      ModulePlotter2D,
        icon:           svgIcon
    })
    @RenderView({
        namespace:      ModulePlotter2D,
        render:         renderHtmlElement,        
        wrapperDivAttributes: (_) => (
            { 
                style: { 
                    height: "100%",
                    width: "100%",
                    padding: '0.25em'
                }
            }
        )
    })
    export class Module extends ModuleFlux {

        scene: Scene<Trace2D>  = createEmptyScene({
            id:(obj: Trace2D ) => obj.traceId,
            add:(obj: Trace2D ) => this.addTrace(obj),
            remove:(obj: Trace2D ) => this.removeTrace(obj),  
            ready:() => this.renderingDiv != undefined
        })

        currentTraceIndex = 0
        traceIndexes : {[key:string]: number}= {}
        renderingDiv : HTMLDivElement

        constructor(params){ 
            super(params)    
                    
            this.addInput({
                contract: inputContract,
                onTriggered: ({data, configuration, context}) => this.plot(data, configuration, context) 
            })
        }

        setRenderingDiv(renderingDiv: HTMLDivElement) {
            this.init(renderingDiv)
        }
        
        resize(renderingDiv){
            this.init(renderingDiv)          
        }
        
        init(renderingDiv: HTMLDivElement){
            this.renderingDiv = renderingDiv  
            this.scene = this.scene.clearScene()
            this.currentTraceIndex = 0
            this.traceIndexes = {}
            let layoutOptionsFct = this.getPersistentData<PersistentData>().getLayoutOptions()
            Plotly.newPlot( this.renderingDiv, [], layoutOptionsFct )
            this.plot(this.scene.inCache, this.getPersistentData(), undefined)   
        }

        addTrace( trace: Trace2D){
            Plotly.addTraces(this.renderingDiv, [trace.definition]);
            this.traceIndexes[trace.traceId] = this.currentTraceIndex
            this.currentTraceIndex++
        }

        removeTrace( trace: Trace2D){
            let indexTrace = this.traceIndexes[trace.traceId]
            Plotly.deleteTraces(this.renderingDiv, indexTrace)
            Object.entries(this.traceIndexes).forEach( ([k,v]: [string, number]) => {
                if(v>=indexTrace)
                    this.traceIndexes[k] = v-1 
            })
            this.currentTraceIndex--
        }

        plot( traces : Trace2D[], config : PersistentData, context: Context ) {

            let oldScene = this.scene
            this.scene = this.scene.add(traces)

            if(!this.renderingDiv)
                return 
            
            context && context.info("Scene updated", {
                oldScene,
                scene:this.scene
            })    
        }
    }
}

declare var ResizeObserver: any

function renderHtmlElement(mdle) {

    let renderingDiv = <HTMLDivElement>(document.createElement('div'))
    renderingDiv.classList.add("h-100")

    //this timeout is needed to get proper size in setRenderingDiv, otherwise clientWidth=clientHeight==0px
    setTimeout(() => {
        mdle.setRenderingDiv(renderingDiv)
        let observer = new ResizeObserver(() => mdle.resize(renderingDiv))
        observer.observe(renderingDiv)
    }, 0)
    return renderingDiv
}



