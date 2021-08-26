
import { pack } from './main';
import { ReplaySubject } from 'rxjs';
import { Property, Flux, ModuleFlux, BuilderView, RenderView, Schema, freeContract, expectSome, expectInstanceOf, Scene, createEmptyScene, Context } from '@youwol/flux-core'
import * as Plotly from 'plotly.js-gl2d-dist'

import { DataFrame} from '@youwol/dataframe'
import { ModuleSerie2D } from './serie-2d.module';
import { Serie2D } from './models';

let svgIcon = `
<polygon points="427.377,308.65 362.722,308.65 362.722,243.994 365.722,243.994 365.722,305.65 427.377,305.65    "/><polygon points="443.264,307.15 420.878,298.003 426.189,307.15 420.878,316.295     "/><polygon points="364.222,228.108 373.369,250.494 364.222,245.182 355.077,250.494     "/>
<circle cx="380" cy="275.667" r="2.667"/><circle cx="413" cy="282.667" r="2.667"/><circle cx="392" cy="262" r="2.667"/><circle cx="406.254" cy="297.527" r="2.667"/><circle cx="426.673" cy="275.349" r="2.667"/><circle cx="402.536" cy="279.724" r="2.667"/><circle cx="408.921" cy="264.667" r="2.667"/><circle cx="412.921" cy="273" r="2.667"/><circle cx="389.333" cy="293" r="2.667"/><circle cx="406.254" cy="253" r="2.667"/><circle cx="393.333" cy="272.999" r="2.667"/><circle cx="382.667" cy="247.666" r="2.667"/>
`
/**
## Presentation

The scatter plot module is a *scene* for [[ModuleSerie2D|2d series]]: 
it's purpose is to display 2d series that reach the input of the module over time.

## Typical usage

Provide 2D series constructed from the [[ModuleSerie2D|2d serie module]] to the input of the module.

> 👾 2D series have a **serieId** property defined in the configuration.
> t is an important field to consider when multiple series will be displayed
> in a viewer: only the latest object received for a particular **serieId** is displayed.

The property **layoutOptions** of the configuration allows to define layout, titles, margins, etc,
see [[ModuleScatterPlot.PersistentData]].

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
export namespace ModuleScatterPlot {


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
            typeName:'serie-2D',
            Type: Serie2D,
            attNames:['serie']
        })
    })

    @Flux({
        pack:           pack,
        namespace:      ModuleScatterPlot,
        id:             "ModuleScatterPlot",
        displayName:    "ScatterPlot",
        description:    "Scatter plot module",
        resources:{
            'technical doc': `${pack.urlCDN}/dist/docs/modules/lib_scatter_plot_module.modulescatterplot.html`
        }
    })
    @BuilderView({
        namespace:      ModuleScatterPlot,
        icon:           svgIcon
    })
    @RenderView({
        namespace:      ModuleScatterPlot,
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

        scene: Scene<Serie2D>  = createEmptyScene({
            id:(obj: Serie2D ) => obj.serieId,
            add:(obj: Serie2D ) => this.addTrace(obj),
            remove:(obj: Serie2D ) => this.removeTrace(obj),  
            ready:() => this.renderingDiv != undefined
        })

        currentTraceIndex = 0
        serieIndexes : {[key:string]: number}= {}
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
            this.serieIndexes = {}
            let layoutOptionsFct = this.getPersistentData<PersistentData>().getLayoutOptions()
            Plotly.newPlot( this.renderingDiv, [], layoutOptionsFct )
            this.plot(this.scene.inCache, this.getPersistentData(), undefined)   
        }

        addTrace( serie: Serie2D){
            Plotly.addTraces(this.renderingDiv, [serie.definition]);
            this.serieIndexes[serie.serieId] = this.currentTraceIndex
            this.currentTraceIndex++
        }

        removeTrace( serie: Serie2D){
            let indexSerie = this.serieIndexes[serie.serieId]
            Plotly.deleteTraces(this.renderingDiv, indexSerie)
            Object.entries(this.serieIndexes).forEach( ([k,v]: [string, number]) => {
                if(v>=indexSerie)
                    this.serieIndexes[k] = v-1 
            })
            this.currentTraceIndex--
        }

        plot( series : Serie2D[], config : PersistentData, context: Context ) {

            let oldScene = this.scene
            this.scene = this.scene.add(series)

            if(!this.renderingDiv)
                return 
            
            context && context.info("Scene updated", {
                oldScene,
                scene:this.scene
            })    

            /*this.cachedDataframe = dataframe
            if( !this.renderingDiv )
                return 
                
            let xSerie= config.xColumnName != "" 
                ? dataframe.series[config.xColumnName] 
                : dataframe.index

            let renderingOptionsFct = config.getRenderingOptions()

            let series = config
            .columnsToPlot()
            .map( column => ({column, xSerie, ySerie: dataframe.series[column], dataframe} ) )
            .map( (dataPlot) => renderingOptionsFct(dataPlot) )

            let layoutOptionsFct = config.getLayoutOptions()
            Plotly.purge(this.renderingDiv)
            Plotly.newPlot( this.renderingDiv, series, layoutOptionsFct({dataframe}) )    */
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



