import type {ExecArgs} from '@medusajs/framework/types';
import {ContainerRegistrationKeys} from '@medusajs/framework/utils';
import {ensureGuestCheckoutStorage} from '../lib/origin-guest-checkout';
import {ensureOrderMailStorage} from '../lib/origin-order-mail';
export default async function setup({container}:ExecArgs){const db=container.resolve(ContainerRegistrationKeys.PG_CONNECTION);await ensureGuestCheckoutStorage(db);await ensureOrderMailStorage(db);container.resolve(ContainerRegistrationKeys.LOGGER).info('Guest checkout and order confirmation storage ready. Existing orders unchanged.');}
