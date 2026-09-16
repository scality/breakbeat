# breakbeat

![Breakbeat](doc/breakbeat.png)

## About

Rule based stop and go.

## Install

```sh
yarn add @scality/breakbeat
```

Published to npm, and to GitHub Packages as a mirror. To pull from the latter
instead, point the `@scality` scope at it in the project `.npmrc` or your user
one:

```
@scality:registry=https://npm.pkg.github.com
```

Reading from GitHub Packages requires a token with `read:packages`; in CI,
`GITHUB_TOKEN` is enough.

## Examples

```typescript
const { CircuitBreaker, BreakerState } = require('@scality/breakbeat').CircuitBreaker;
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
