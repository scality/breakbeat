import { Config, defaultProbeEvaluateInterval, validate } from './Configuration';
import { Probe, buildProbe } from './probes';

export enum BreakerState {
    Nominal = 0,
    Stabilizing = 1,
    Tripped = 2,
}

export class CircuitBreaker {
    _config: Config;
    _probes: Probe[];

    _evaluateIntervalByAggregateState: {
        [key in BreakerState]: number;
    };

    _aggregateState: BreakerState;
    _stabilizingCounter: number;
    _stabilizeThreshold: number;
    _evaluateTimeoutHandle: NodeJS.Timeout | null;

    // a promise that unit tests can await on, as jest's fake timers
    // get confused with async flows
    _evaluatingPromiseHook: Promise<unknown> | null;

    constructor(config: unknown) {
        this._config = validate(config);
        this._probes = (this._config.probes || []).map(buildProbe);

        this._aggregateState = BreakerState.Nominal;
        this._stabilizingCounter = 0;

        this._stabilizeThreshold = this._config.stabilizeAfterNSuccesses || 0;
        this._evaluateIntervalByAggregateState = {
            [BreakerState.Nominal]: this._config.nominalEvaluateIntervalMs || defaultProbeEvaluateInterval,
            [BreakerState.Stabilizing]: this._config.stabilizingEvaluateIntervalMs || defaultProbeEvaluateInterval,
            [BreakerState.Tripped]: this._config.trippedEvaluateIntervalMs || defaultProbeEvaluateInterval,
        };

        this._evaluateTimeoutHandle = null;
        this._evaluatingPromiseHook = null;
    }

    get state(): BreakerState {
        return this._aggregateState;
    }

    start() {
        this._aggregateState = BreakerState.Nominal;
        this._scheduleNextEvaluation();
    }

    stop() {
        if (this._evaluateTimeoutHandle) {
            clearTimeout(this._evaluateTimeoutHandle);
            this._evaluateTimeoutHandle = null;
        }
    }

    async _evaluate() {
        this._evaluatingPromiseHook = Promise.allSettled(this._probes.map(p => p.check()));
        await this._evaluatingPromiseHook;
        this._evaluatingPromiseHook = null;

        const allOk = this._probes.every(probe => probe.value);

        if (allOk) {
            switch (this._aggregateState) {
            case BreakerState.Tripped:
                this._aggregateState = BreakerState.Stabilizing;
                this._stabilizingCounter = 1;
                break;

            case BreakerState.Stabilizing:
                this._stabilizingCounter++;

                if (this._stabilizingCounter >= this._stabilizeThreshold) {
                    this._aggregateState = BreakerState.Nominal;
                }
                break;

            default:
                break;
            }
        } else {
            this._aggregateState = BreakerState.Tripped;
        }

        // only schedule next if start was called before
        if (this._evaluateTimeoutHandle) {
            this._scheduleNextEvaluation();
        }
    }

    _scheduleNextEvaluation() {
        this._evaluateTimeoutHandle = setTimeout(
            () => void this._evaluate(),
            this._evaluateIntervalMs,
        );
    }

    get _evaluateIntervalMs(): number {
        return this._evaluateIntervalByAggregateState[this._aggregateState];
    }
}
