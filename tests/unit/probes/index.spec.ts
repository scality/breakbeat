import { describe, expect, test } from '@jest/globals';

import { buildProbe } from '../../../src/probes';

import { NoopProbe } from '../../../src/probes/NoopProbe';
import { KafkaConsumerLagProbe } from '../../../src/probes/KafkaConsumerLagProbe';

describe('Probe', () => {
    describe('buildProbe', () => {
        describe('noop', () => {
            test('should build a noop probe', () => {
                const noop = buildProbe({
                    type: 'noop',
                    returnConstantValue: true,
                });

                expect(noop).toBeInstanceOf(NoopProbe);
            });
        });

        describe('kafkaConsumerLag', () => {
            test('should build a noop probe', () => {
                const kcl = buildProbe({
                    type: 'kafkaConsumerLag',
                });

                expect(kcl).toBeInstanceOf(KafkaConsumerLagProbe);
            });
        });

        test('should throw if unknown probe type', () => {
            const config = {
                type: 'unknown',
            };

            // Testing what would happen if transpiled code gave an
            // unsupported value, so disable type checking.
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            expect(() => buildProbe(config)).toThrowErrorMatchingSnapshot();
        });
    });
});
