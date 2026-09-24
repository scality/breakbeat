import * as joi from 'joi';

import { PrometheusQueryProbe } from './PrometheusQueryProbe';
import { PrometheusClientConfig, prometheusClientConfigSchema } from './PrometheusClient';

export interface KafkaConsumerLagProbeConfig {
    type: 'kafkaConsumerLag';
    prometheus: PrometheusClientConfig;
    wantTotalLagLessThan: number;
    averagedOverInterval?: string;
    consumerGroupName: string;
    topicName?: string;
}

export const kafkaConsumerLagProbeSchema = joi.object<KafkaConsumerLagProbeConfig, true>({
    type: joi.string().valid('kafkaConsumerLag' satisfies KafkaConsumerLagProbeConfig['type']).required(),

    prometheus: prometheusClientConfigSchema.required(),

    wantTotalLagLessThan: joi.number().greater(0).required(),
    averagedOverInterval: joi.string().regex(new RegExp('^\\d+[smhd]$')).optional(),
    consumerGroupName: joi.string().required(),
    topicName: joi.string().optional(),
});

export class KafkaConsumerLagProbe extends PrometheusQueryProbe {
    constructor(config: KafkaConsumerLagProbeConfig) {
        const topic = config.topicName ? `,topic="${config.topicName}"` : '';
        const q = `kafka_consumergroup_group_lag{
            group="${config.consumerGroupName}"
            ${topic}
        }`;

        super({
            type: 'prometheusQuery',
            prometheus: config.prometheus,
            query: q,
            threshold: config.wantTotalLagLessThan,
            averagedOverInterval: config.averagedOverInterval,
        });
    }
}
