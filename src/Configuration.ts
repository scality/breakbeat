import * as joi from '@hapi/joi';
import 'joi-extract-type';

import { probeSchema } from './probes';

export const defaultProbeEvaluateInterval = 60000;
export const defaultStabilizeAfterNSuccesses = 2;

const topSchema = joi.object({
    probes: joi.array().items(probeSchema).optional(),
    nominalEvaluateIntervalMs: joi.number().positive().default(defaultProbeEvaluateInterval).optional(),
    trippedEvaluateIntervalMs: joi.number().positive().default(defaultProbeEvaluateInterval).optional(),
    stabilizingEvaluateIntervalMs: joi.number().positive().default(defaultProbeEvaluateInterval).optional(),
    stabilizeAfterNSuccesses: joi.number().positive().default(defaultStabilizeAfterNSuccesses).optional(),
});

export type Config = joi.extractType<typeof topSchema>;

export function validate(config: unknown): Config {
    if (!config) {
        return validate({});
    }

    const res = topSchema.validate(config);
    if (res.error) {
        throw res.error;
    }

    return res.value;
}

export const configWithDefaults = validate({});
