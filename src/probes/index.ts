import * as joi from '@hapi/joi';
import 'joi-extract-type';

import { NoopProbe, noopProbeSchema } from './NoopProbe';
import { KafkaConsumerLagProbe, kafkaConsumerLagProbeSchema } from './KafkaConsumerLagProbe';
import { Probe } from './Probe';

const probeSchema = joi.alternatives().try(
    noopProbeSchema.required(),
    kafkaConsumerLagProbeSchema.required(),
);

export type ProbeConfig = joi.extractType<typeof probeSchema>;

function buildProbe(probeConfig: ProbeConfig): Probe {
    const type = probeConfig.type;
    switch (type) {
    case 'noop':
        return new NoopProbe(probeConfig);
    case 'kafkaConsumerLag':
        return new KafkaConsumerLagProbe(probeConfig);
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
