import type {ExecArgs} from '@medusajs/framework/types';
import {ContainerRegistrationKeys} from '@medusajs/framework/utils';
import {ensureWelcomeStorage} from '../lib/origin-welcome';
export default async function setupWelcome({container}:ExecArgs){await ensureWelcomeStorage(container.resolve(ContainerRegistrationKeys.PG_CONNECTION));container.resolve(ContainerRegistrationKeys.LOGGER).info('Welcome mail storage ready; existing customers unchanged.');}
