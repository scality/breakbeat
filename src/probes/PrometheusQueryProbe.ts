import * as joi from '@hapi/joi';
import 'joi-extract-type';

import { Probe } from './Probe';
import { PrometheusClient, prometheusClientConfigSchema } from './PrometheusClient';

import { Logger } from 'werelogs';

const log = new Logger('breakbeat:probe:prometheusQuery');

export const prometheusQueryProbeSchema = joi.object({
    type: joi.string().valid('prometheusQuery').required(),

    prometheus: prometheusClientConfigSchema.required(),

    query: joi.string().required(),
    threshold: joi.number().required(),
    averagedOverInterval: joi.string().regex(new RegExp('^\\d+[smhd]$')).optional(),
});

export type PrometheusQueryProbeConfig = joi.extractType<typeof prometheusQueryProbeSchema>;

export class PrometheusQueryProbe implements Probe {
    config: PrometheusQueryProbeConfig;
    threshold: number;
    prometheusClient: PrometheusClient;
    observed: number;

    constructor(config: PrometheusQueryProbeConfig) {
        this.prometheusClient = new PrometheusClient(
            config.prometheus, config.query, config.averagedOverInterval);
        this.config = config;
        this.threshold = 0;
        this.observed = 0;
    }

    async check() {
        const v = await this.prometheusClient.instantQuery();
        if (v != null) {
            if (Number.isNaN(v)) {
                log.warn('warning: ignoring received NaN value (interval too long for retention?)');
                return;
            }
            this.observed = v;
        }
    }

    get value() {
        return this.observed < this.config.threshold;
    }
}
