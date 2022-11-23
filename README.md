# breakbeat

![Breakbeat](doc/breakbeat.png)

## About

Rule based stop and go.

## Examples

```typescript
const { CircuitBreaker, BreakerState } = require('breakbeat');
const conf = {
    probes: [],
    nominalEvaluateIntervalMs: 30000,
    stabilizeAfterNSuccesses: 2,
};
const b = new CircuitBreaker(conf);
b.start();

const i = setInterval(() => {
    if (b.state === BreakerState.Nominal) {
        console.log('all good, proceeding');
    } else {
        console.log('issue detected, delaying work');
    }
}, 5000);

process.on('beforeExit', (code) => {
    clearInterval(i);
    b.stop();
});
```
