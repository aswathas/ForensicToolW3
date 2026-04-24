declare module 'cors' {
  import { RequestHandler } from 'express'
  function cors(options?: cors.CorsOptions): RequestHandler
  namespace cors {
    interface CorsOptions {
      origin?: string | string[] | boolean | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void)
      credentials?: boolean
      methods?: string | string[]
      allowedHeaders?: string | string[]
      exposedHeaders?: string | string[]
      maxAge?: number
      preflightContinue?: boolean
      optionsSuccessStatus?: number
    }
  }
  export = cors
}
