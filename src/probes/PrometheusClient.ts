import * as joi from '@hapi/joi';
import 'joi-extract-type';

import { PrometheusDriver } from 'prometheus-query';
import { Logger } from 'werelogs';

const log = new Logger('breakbeat:prometheusClient');

export const prometheusClientConfigSchema = joi.object({
    endpoint: joi.string().uri({
        scheme: ['http', 'https'],
        allowRelative: false,
    }).required(),
    timeout: joi.number().optional(),
});

export type PrometheusClientConfig = joi.extractType<typeof prometheusClientConfigSchema>;

type InstantResult = {
    value: {
        value: number,
    },
};

export class PrometheusClient {
    prom: PrometheusDriver;
    q: string;

    constructor(config: PrometheusClientConfig, q: string, interval?: string) {
        this.prom = new PrometheusDriver({
            endpoint: config.endpoint,
            timeout:  config.timeout,
        });

        this.q = interval ?
            `sum(avg_over_time(${q}[${interval}]))` :
            `sum(${q})`;
    }

    async instantQuery(): Promise<number | null> {
        try {
            const res = await this.prom.instantQuery(this.q);

            // res.result is an any[]
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const series: InstantResult[] = res.result;
            if (series.length == 0) {
                return null;
            }

            return series[0].value.value;
        } catch (error: unknown) {
            log.error('unable to query prometheus', { error });
            return null;
        }
    }
}
