import * as joi from 'joi';

import { Probe } from './Probe';
import { PrometheusClient, PrometheusClientConfig, prometheusClientConfigSchema } from './PrometheusClient';

import { Logger } from 'werelogs';

const log = new Logger('breakbeat:probe:prometheusQuery');

export interface PrometheusQueryProbeConfig {
    type: 'prometheusQuery';
    prometheus: PrometheusClientConfig;
    query: string;
    threshold: number;
    averagedOverInterval?: string;
}

export const prometheusQueryProbeSchema = joi.object<PrometheusQueryProbeConfig, true>({
    type: joi.string().valid('prometheusQuery' satisfies PrometheusQueryProbeConfig['type']).required(),

    prometheus: prometheusClientConfigSchema.required(),

    query: joi.string().required(),
    threshold: joi.number().required(),
    averagedOverInterval: joi.string().regex(new RegExp('^\\d+[smhd]$')).optional(),
});

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
