import * as joi from '@hapi/joi';
import 'joi-extract-type';

import { Probe } from './Probe';
import { PrometheusClient, prometheusClientConfigSchema } from './PrometheusClient';

import { Logger } from 'werelogs';

const log = new Logger('breakbeat:probe:kafkaConsumerLag');

export const kafkaConsumerLagProbeSchema = joi.object({
    type: joi.string().valid('kafkaConsumerLag').required(),

    prometheus: prometheusClientConfigSchema.required(),

    wantTotalLagLessThan: joi.number().greater(0).required(),
    averagedOverInterval: joi.string().regex(new RegExp('^\\d+[smhd]$')).optional(),
    consumerGroupName: joi.string().required(),
    topicName: joi.string().optional(),
});

export type KafkaConsumerLagProbeConfig = joi.extractType<typeof kafkaConsumerLagProbeSchema>;

export class KafkaConsumerLagProbe implements Probe {
    config: KafkaConsumerLagProbeConfig;
    lag: number;
    prometheusClient: PrometheusClient;

    constructor(config: KafkaConsumerLagProbeConfig) {
        const topic = config.topicName ? `,topic="${config.topicName}"` : '';
        const q = `kafka_consumergroup_group_lag{
            group="${config.consumerGroupName}"
            ${topic}
        }`;

        this.prometheusClient = new PrometheusClient(
            config.prometheus, q, config.averagedOverInterval);
        this.config = config;
        this.lag = 0;
    }

    async check() {
        const v = await this.prometheusClient.instantQuery();
        if (v != null) {
            if (Number.isNaN(v)) {
                log.warn('warning: ignoring received NaN value (interval too long for retention?)');
                return;
            }
            this.lag = v;
        }
    }

    get value() {
        return this.lag < this.config.wantTotalLagLessThan;
    }
}
