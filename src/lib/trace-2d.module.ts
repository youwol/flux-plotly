
import { pack } from './main';
import { Property, Flux, ModuleFlux, BuilderView, Schema, freeContract, Pipe, Context } from '@youwol/flux-core'
import {Serie} from '@youwol/dataframe'
import { Trace2D } from './models';

let svgIcon = `
<polygon points="427.377,308.65 362.722,308.65 362.722,243.994 365.722,243.994 365.722,305.65 427.377,305.65    "/><polygon points="443.264,307.15 420.878,298.003 426.189,307.15 420.878,316.295     "/><polygon points="364.222,228.108 373.369,250.494 364.222,245.182 355.077,250.494     "/>
<circle cx="380" cy="275.667" r="2.667"/><circle cx="413" cy="282.667" r="2.667"/><circle cx="392" cy="262" r="2.667"/><circle cx="406.254" cy="297.527" r="2.667"/><circle cx="426.673" cy="275.349" r="2.667"/><circle cx="402.536" cy="279.724" r="2.667"/><circle cx="408.921" cy="264.667" r="2.667"/><circle cx="412.921" cy="273" r="2.667"/><circle cx="389.333" cy="293" r="2.667"/><circle cx="406.254" cy="253" r="2.667"/><circle cx="393.333" cy="272.999" r="2.667"/><circle cx="382.667" cy="247.666" r="2.667"/>
`
/**
## Presentation

A 2D trace can be displayed in a [[ModulePlotter2D]].
It includes the definition of the x and y coordinates as well as styling properties.

## Typical usage

The creation of a 2D trace requires:
    - some incoming data from which the **x** and **y** point coordinates will be created
    - some styling properties (color, labels, etc) through the module configuration.

> 👾 The trace has a **traceId** property defined in the configuration.
> It is an important field to consider when multiple traces will be displayed
> in a viewer, see [[ModulePlotter2D| scatter plot module documentation]].

### Extracting coordinates from incoming data

The conversion between the data part of the incoming message and the coordinates of the 2D trace is achieved using 
the configuration's **coordinates** property. 
It defines a function that take in argument the data part of the incoming message and return an
object with **x** and **y** properties: the list of abscises and coordinates of the points.

For instance when the incoming data is a dataframe with at least 2 columns **A** and **B**:
* ```js
         * return (data) => {
         *     return { 
         *         x: data.traces.A,  // assume the column A exists in the dataframe
         *         y: data.traces.B   // assume the column B exists in the dataframe
         *     }
         * } 
         * ``` 

### Styling

Some styling properties are directly exposed through the module's configuration (e.g. **mode**),
while others can be provided as a json data-structure using the **extraOptions** field of the 
configuration.

More details can be found [[ModuleTrace2D.PersistentData|here]]

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
 -    [line and scatter plots](https://plotly.com/javascript/line-charts/): options available to style a trace
 */
export namespace ModuleTrace2D {


    /**
     * The display mode that can be used in plotly
     */
    export enum DisplayMode{
        Markers = "markers",
        Lines = "lines",
        MarkersLines = "lines+markers"
    }

    let defaultCoordinates =  `
return  (data) => {
    return { 
        x: [-1,1], 
        y: [1,-1],
        mode: 'markers'
    }
}   
`
    /**
     * Configuration of the module
     */
    @Schema({ 
        pack: pack
    })
    export class PersistentData {

        /**
         * Id of the trace.
         * When included in a scene (e.g. a Plotter2D module), only the latest
         * trace included for a particular 'traceId' is displayed.
         */
        @Property({
            description: "id of the trace"
        })
        readonly traceId: string = "trace2D"

        /**
         * Display name of the trace
         */
        @Property({
            description: "display name of the trace"
        })
        readonly traceName: string = "trace2D"

        /**
         * A function that maps the incoming data to the coordinates (x,y).
         * The argument 'data' is the data part of the incoming message
         * The return object must contains x,y properties as array of numbers of same size.
         * 
         * An example from an incoming message that contains a dataframe in the data part:
         * ```js
         * return (data) => {
         *     return { 
         *         x: data.traces.A,  // assume the column A exists in the dataframe
         *         y: data.traces.B   // assume the column B exists in the dataframe
         *     }
         * } 
         * ``` 
         */
        @Property({
            description: "Define the coordinates (x,y) from incoming data",
            type: 'code'
        })
        readonly definition: string  | ((data:any) => any )= defaultCoordinates

        /**
         * 
         * @ignore
         */
        getDefinition(data: any){
            return this.definition instanceof Function
                ? this.definition(data) 
                : new Function(this.definition)()(data)
        }
        

        /**
         * 
         * @ignore
         */
        constructor(params : { 
            traceId?: string,
            traceName?: string,
            definition?: string, 
        } = {}) {
            Object.assign(this, params)
        }
    }


    @Flux({
        pack:           pack,
        namespace:      ModuleTrace2D,
        id:             "Trace2D",
        displayName:    "Trace 2D",
        description:    "A 2D trace",
        resources: {
            'technical doc': `${pack.urlCDN}/dist/docs/modules/lib_trace_2d_module.moduletrace2d.html`
        }
    })
    @BuilderView({
        namespace:      ModuleTrace2D,
        icon:           svgIcon
    })
    export class Module extends ModuleFlux {

        output$ : Pipe<Trace2D> 

        constructor(params){ 
            super(params)    
                    
            this.addInput({
                contract: freeContract(),
                onTriggered: ({data, configuration, context}) => this.createTrace(data, configuration, context) 
            })
            this.output$ = this.addOutput()
        }

        createTrace( data : any, config : PersistentData, context: Context ) {


            let definition = config.getDefinition(data)
            if(definition.x && definition.x instanceof Serie){
                definition.x = definition.x.array
            }
            if(definition.y && definition.y instanceof Serie){
                definition.y = definition.y.array
            }
            
            let trace = {
                ...definition,
                ...{name : config.traceName}
            }

            this.output$.next({data:new Trace2D(config.traceId, config.traceName, trace), context})  
        }
    }
}
