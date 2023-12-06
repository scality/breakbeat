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

        test('should always be in nominal state', async () => {
            b = new CircuitBreaker({});
            await b._evaluate();
            expect(b.state).toStrictEqual(BreakerState.Nominal);
        });
    });

    describe('missing configuration', () => {
        test('should init', () => {
            expect(() => new CircuitBreaker(undefined)).not.toThrow();
        });

        test('should always be in nominal state', async () => {
            b = new CircuitBreaker(undefined);
            await b._evaluate();
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

        test('should not schedule next evaluation if not started', async () => {
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

            await b._evaluate();
            expect(b._evaluateTimeoutHandle).toBeFalsy();
            expect(s).not.toBeCalled();
        });

        [
            {
                it: 'Nominal -> Nominal',
                initialState: BreakerState.Nominal,
                isStateNominal: true,
            },
            {
                it: 'Stabilizing -> Stabilizing',
                initialState: BreakerState.Stabilizing,
                isStateNominal: true,
            },
            {
                it: 'Tripped -> Tripped',
                initialState: BreakerState.Tripped,
                isStateNominal: false,
            },
        ].forEach(args => {
            test(`should not call evaluation callback if the state didn't change : ${args.it}`, async () => {
                const config = {
                    probes: [
                        {
                            type: 'noop',
                            returnConstantValue: args.isStateNominal,
                        },
                    ],
                    stabilizeAfterNSuccesses: 2,
                };
                
                b = new CircuitBreaker(config);

                b._aggregateState = args.initialState;
                
                const handler = jest.fn();
                b.once('state-changed', handler);
                
                await b._evaluate();
                expect(b._evaluateTimeoutHandle).toBeFalsy();
                expect(handler).not.toBeCalled();
            });
        });

        [
            {
                it: 'Nominal -> Tripped',
                initialState: BreakerState.Nominal,
                finalState: BreakerState.Tripped,
                isStateNominal: false,
            },
            {
                it: 'Tripped -> Stabilizing',
                initialState: BreakerState.Tripped,
                finalState: BreakerState.Stabilizing,
                isStateNominal: true,
            },
            {
                it: 'Stabilizing -> Nominal',
                initialState: BreakerState.Stabilizing,
                finalState: BreakerState.Nominal,
                isStateNominal: true,
            },
            {
                it: 'Stabilizing -> Tripped',
                initialState: BreakerState.Stabilizing,
                finalState: BreakerState.Tripped,
                isStateNominal: false,
            },
        ].forEach(args => {
            test(`should call evaluation callback if the state changed : ${args.it}`, async () => {
                jest.useFakeTimers();

                const config = {
                    probes: [
                        {
                            type: 'noop',
                            returnConstantValue: args.isStateNominal,
                        },
                    ],
                    stabilizeAfterNSuccesses: 1,
                };
                
                b = new CircuitBreaker(config);
    
                b._aggregateState = args.initialState;

                const handler = jest.fn(state => {
                    expect(state).toStrictEqual(args.finalState);
                });
                b.once('state-changed', handler);
                
                await b._evaluate();
                expect(b._evaluateTimeoutHandle).toBeFalsy();

                jest.runAllTicks();
                expect(handler).toBeCalled();
            });
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
