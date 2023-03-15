import * as joi from '@hapi/joi';
import 'joi-extract-type';

import { PrometheusQueryProbe } from './PrometheusQueryProbe';
import { prometheusClientConfigSchema } from './PrometheusClient';

export const kafkaConsumerLagProbeSchema = joi.object({
    type: joi.string().valid('kafkaConsumerLag').required(),

    prometheus: prometheusClientConfigSchema.required(),

    wantTotalLagLessThan: joi.number().greater(0).required(),
    averagedOverInterval: joi.string().regex(new RegExp('^\\d+[smhd]$')).optional(),
    consumerGroupName: joi.string().required(),
    topicName: joi.string().optional(),
});

export type KafkaConsumerLagProbeConfig = joi.extractType<typeof kafkaConsumerLagProbeSchema>;

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
