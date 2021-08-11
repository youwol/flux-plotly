import { FluxPack, IEnvironment } from '@youwol/flux-core'
import { AUTO_GENERATED } from '../auto_generated'

export function install(environment: IEnvironment){
    let resource = `${AUTO_GENERATED.name}#${AUTO_GENERATED.version}~assets/style.css`
    return environment.fetchStyleSheets(resource)
}

export let pack = new FluxPack({
    ...AUTO_GENERATED,
    ...{
        install
    }
})

