import * as joi from 'joi';

import { ProbeConfig, probeSchema } from './probes';

export const defaultProbeEvaluateInterval = 60000;
export const defaultStabilizeAfterNSuccesses = 2;

export interface Config {
    probes?: ProbeConfig[];
    nominalEvaluateIntervalMs?: number;
    trippedEvaluateIntervalMs?: number;
    stabilizingEvaluateIntervalMs?: number;
    stabilizeAfterNSuccesses?: number;
}

const topSchema = joi.object<Config, true>({
    probes: joi.array().items(probeSchema).optional(),
    nominalEvaluateIntervalMs: joi.number().positive().default(defaultProbeEvaluateInterval).optional(),
    trippedEvaluateIntervalMs: joi.number().positive().default(defaultProbeEvaluateInterval).optional(),
    stabilizingEvaluateIntervalMs: joi.number().positive().default(defaultProbeEvaluateInterval).optional(),
    stabilizeAfterNSuccesses: joi.number().positive().default(defaultStabilizeAfterNSuccesses).optional(),
});

export function validate(config: unknown): Config {
    if (!config) {
        return validate({});
    }

    const res = topSchema.validate(config);
    if (res.error) {
        throw res.error;
    }

    // joi's ValidationResult union is not discriminated, so `value` stays `any` here
    return res.value as Config;
}

export const configWithDefaults = validate({});
