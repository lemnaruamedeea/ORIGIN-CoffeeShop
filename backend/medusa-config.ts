import { loadEnv, defineConfig } from '@medusajs/framework/utils'
import {paymentConfig} from './src/lib/origin-payments-config'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())
const stripe=paymentConfig()

module.exports = defineConfig({
  admin:{backendUrl:process.env.MEDUSA_BACKEND_URL||process.env.RENDER_EXTERNAL_URL},
  modules: stripe.configured ? [{resolve:'@medusajs/medusa/payment',options:{providers:[{resolve:'@medusajs/medusa/payment-stripe',id:'stripe',options:{apiKey:stripe.key,webhookSecret:stripe.webhookSecret||undefined,capture:true,automaticPaymentMethods:false,paymentDescription:'ORIGIN Coffee'}}]}}] : [],
  projectConfig: {
    redisUrl:process.env.REDIS_URL,
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET!,
      cookieSecret: process.env.COOKIE_SECRET!,
    }
  }
})
