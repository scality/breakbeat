import * as joi from 'joi';

import { NoopProbe, NoopProbeConfig, noopProbeSchema } from './NoopProbe';
import {
    KafkaConsumerLagProbe,
    KafkaConsumerLagProbeConfig,
    kafkaConsumerLagProbeSchema,
} from './KafkaConsumerLagProbe';
import { PrometheusQueryProbe, PrometheusQueryProbeConfig, prometheusQueryProbeSchema } from './PrometheusQueryProbe';
import { Probe } from './Probe';

export type ProbeConfig = NoopProbeConfig | KafkaConsumerLagProbeConfig | PrometheusQueryProbeConfig;

const probeSchema = joi.alternatives<ProbeConfig>().try(
    noopProbeSchema.required(),
    kafkaConsumerLagProbeSchema.required(),
    prometheusQueryProbeSchema.required(),
);

function buildProbe(probeConfig: ProbeConfig): Probe {
    const type = probeConfig.type;
    switch (type) {
    case 'noop':
        return new NoopProbe(probeConfig);
    case 'kafkaConsumerLag':
        return new KafkaConsumerLagProbe(probeConfig);
    case 'prometheusQuery':
        return new PrometheusQueryProbe(probeConfig);
    }

    // not really dead code for transpiled uses
    const tpe: string = probeConfig['type'];
    throw new Error(`unsupported probe type '${tpe}'`);
}

export {
    Probe,
    buildProbe,
    probeSchema,
};
