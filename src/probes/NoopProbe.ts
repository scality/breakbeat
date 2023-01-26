import * as joi from '@hapi/joi';

import { Probe } from './Probe';

export const noopProbeSchema = joi.object({
    type: joi.string().valid('noop').required(),
    returnConstantValue: joi.boolean().required(),
});

export type NoopProbeConfig = joi.extractType<typeof noopProbeSchema>;

export class NoopProbe implements Probe {
    config: NoopProbeConfig;

    constructor(config: NoopProbeConfig) {
        this.config = config;
    }

    check(): Promise<void> {
        return Promise.resolve();
    }

    get value() {
        return this.config.returnConstantValue;
    }
}
