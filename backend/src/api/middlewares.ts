import {defineMiddlewares,authenticate} from '@medusajs/framework/http';
export default defineMiddlewares({routes:[{matcher:'/admin/origin/mystery/*',middlewares:[authenticate('user',['session','bearer'])]}]});
