import * as joi from 'joi';

import { Probe } from './Probe';

export interface NoopProbeConfig {
    type: 'noop';
    returnConstantValue: boolean;
}

export const noopProbeSchema = joi.object<NoopProbeConfig, true>({
    type: joi.string().valid('noop' satisfies NoopProbeConfig['type']).required(),
    returnConstantValue: joi.boolean().required(),
});

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
