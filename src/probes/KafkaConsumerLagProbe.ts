import * as joi from '@hapi/joi';

import { Probe } from './Probe';

export const kafkaConsumerLagProbeSchema = joi.object({
    type: joi.string().valid('kafkaConsumerLag').required(),
});

export type KafkaConsumerLagProbeConfig = joi.extractType<typeof kafkaConsumerLagProbeSchema>;

export class KafkaConsumerLagProbe implements Probe {
    config: KafkaConsumerLagProbeConfig;

    constructor(config: KafkaConsumerLagProbeConfig) {
        this.config = config;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    check() {
    }

    get value() {
        return false;
    }
}
