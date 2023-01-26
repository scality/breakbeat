import { afterEach, beforeEach, describe, expect, test, jest } from '@jest/globals';

import { CircuitBreaker, BreakerState } from '../../src/CircuitBreaker';
import { defaultProbeEvaluateInterval } from '../../src/Configuration';

describe('CircuitBreaker', () => {
    let b: CircuitBreaker;

    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        if (b?._evaluateTimeoutHandle) {
            clearTimeout(b._evaluateTimeoutHandle);
        }
    });

    describe('default configuration', () => {
        test('should init', () => {
            expect(() => new CircuitBreaker({})).not.toThrow();
        });

        test('should always be in nominal state', () => {
            b = new CircuitBreaker({});
            b._evaluate();
            expect(b.state).toStrictEqual(BreakerState.Nominal);
        });
    });

    describe('missing configuration', () => {
        test('should init', () => {
            expect(() => new CircuitBreaker(undefined)).not.toThrow();
        });

        test('should always be in nominal state', () => {
            b = new CircuitBreaker(undefined);
            b._evaluate();
            expect(b.state).toStrictEqual(BreakerState.Nominal);
        });
    });

    test('should throw if config does not validate', () => {
        const config = {
            probes: 2,
        };
        expect(() => new CircuitBreaker(config)).toThrowErrorMatchingSnapshot();
    });

    describe('_evaluate', () => {
        test('should set state to nominal if all probes evaluate to true', async () => {
            const config = {
                probes: [
                    {
                        type: 'noop',
                        returnConstantValue: true,
                    },
                ],
            };
            b = new CircuitBreaker(config);
            await b._evaluate();
            expect(b.state).toStrictEqual(BreakerState.Nominal);
        });

        test('should set state to tripped if one probe evaluates to false', async () => {
            const config = {
                probes: [
                    {
                        type: 'noop',
                        returnConstantValue: false,
                    },
                    {
                        type: 'noop',
                        returnConstantValue: true,
                    },
                ],
            };
            b = new CircuitBreaker(config);
            await b._evaluate();
            expect(b.state).toStrictEqual(BreakerState.Tripped);
        });

        test('should set state to stabilizing if all probes evaluate to true after being tripped', async () => {
            const config = {
                probes: [
                    {
                        type: 'noop',
                        returnConstantValue: true,
                    },
                ],
            };
            b = new CircuitBreaker(config);
            b._aggregateState = BreakerState.Tripped;
            await b._evaluate();
            expect(b.state).toStrictEqual(BreakerState.Stabilizing);
        });

        test('should set state to nominal if all probes evaluate to true N times while stabilizing', async () => {
            const config = {
                probes: [
                    {
                        type: 'noop',
                        returnConstantValue: true,
                    },
                ],
                stabilizeAfterNSuccesses: 2,
            };
            b = new CircuitBreaker(config);

            b._aggregateState = BreakerState.Tripped;

            await b._evaluate();
            expect(b.state).toStrictEqual(BreakerState.Stabilizing);

            await b._evaluate();
            expect(b.state).toStrictEqual(BreakerState.Nominal);
        });

        test('should schedule next evaluation if started', async () => {
            const config = {
                probes: [
                    {
                        type: 'noop',
                        returnConstantValue: true,
                    },
                ],
            };
            b = new CircuitBreaker(config);
            b.start();

            const s = jest.spyOn(b, '_scheduleNextEvaluation');

            await b._evaluate();
            expect(b._evaluateTimeoutHandle).toBeTruthy();
            expect(s).toBeCalled();
        });

        test('should not schedule next evaluation if not started', () => {
            const config = {
                probes: [
                    {
                        type: 'noop',
                        returnConstantValue: true,
                    },
                ],
            };
            b = new CircuitBreaker(config);
            const s = jest.spyOn(b, '_scheduleNextEvaluation');

            b._evaluate();
            expect(b._evaluateTimeoutHandle).toBeFalsy();
            expect(s).not.toBeCalled();
        });
    });

    describe('start', () => {
        test('should store interval handler', () => {
            const config = {
                probes: [
                    {
                        type: 'noop',
                        returnConstantValue: true,
                    },
                ],
            };

            b = new CircuitBreaker(config);
            b.start();

            expect(b._evaluateTimeoutHandle).toBeTruthy();
        });

        test('should periodically evaluate', async () => {
            const config = {
                probes: [
                    {
                        type: 'noop',
                        returnConstantValue: true,
                    },
                ],
            };

            b = new CircuitBreaker(config);
            const s = jest.spyOn(b, '_evaluate');

            b.start();

            await b._evaluatingPromiseHook;
            jest.advanceTimersByTime(defaultProbeEvaluateInterval + 1);
            expect(s).toBeCalledTimes(1);

            await b._evaluatingPromiseHook;
            jest.advanceTimersByTime(defaultProbeEvaluateInterval);
            expect(s).toBeCalledTimes(2);
        });

        test('should periodically evaluate using appropriate interval for state', async () => {
            const config = {
                probes: [
                    {
                        type: 'noop',
                        returnConstantValue: false,
                    },
                ],
                trippedEvaluateIntervalMs: defaultProbeEvaluateInterval * 2,
            };

            b = new CircuitBreaker(config);
            const s = jest.spyOn(b, '_evaluate');

            b.start();

            await b._evaluatingPromiseHook;
            jest.advanceTimersByTime(defaultProbeEvaluateInterval + 1);
            expect(s).toBeCalledTimes(1);

            await b._evaluatingPromiseHook;
            jest.advanceTimersByTime(defaultProbeEvaluateInterval);
            expect(s).toBeCalledTimes(1);

            await b._evaluatingPromiseHook;
            jest.advanceTimersByTime(defaultProbeEvaluateInterval);
            expect(s).toBeCalledTimes(2);
        });

        test('should initialize status to nominal', () => {
            const config = {
                probes: [
                    {
                        type: 'noop',
                        returnConstantValue: true,
                    },
                ],
            };

            b = new CircuitBreaker(config);
            b._aggregateState = BreakerState.Tripped;
            b.start();

            expect(b.state).toStrictEqual(BreakerState.Nominal);
        });
    });

    describe('stop', () => {
        test('should stop periodic evaluation', () => {
            const config = {
                probes: [
                    {
                        type: 'noop',
                        returnConstantValue: false,
                    },
                ],
            };

            b = new CircuitBreaker(config);
            const s = jest.spyOn(b, '_evaluate');

            b.start();

            jest.advanceTimersByTime(defaultProbeEvaluateInterval + 1);
            expect(s).toBeCalledTimes(1);

            b.stop();

            jest.advanceTimersByTime(defaultProbeEvaluateInterval);
            expect(s).toBeCalledTimes(1);
        });

        test('should clear interval handler', () => {
            const config = {
                probes: [
                    {
                        type: 'noop',
                        returnConstantValue: false,
                    },
                ],
            };

            b = new CircuitBreaker(config);
            const s = jest.spyOn(b, '_evaluate');

            b.start();

            jest.advanceTimersByTime(defaultProbeEvaluateInterval + 1);
            expect(s).toBeCalledTimes(1);

            b.stop();
            expect(b._evaluateTimeoutHandle).toBeFalsy();
        });
    });
});
