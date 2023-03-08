import { describe, expect, test } from '@jest/globals';

import { validate, configWithDefaults } from '../../src/Configuration';

describe('Configuration', () => {
    test('should validate', () => {
        const config = {};
        expect(validate(config)).toStrictEqual(configWithDefaults);
    });

    test('should accept missing configuration', () => {
        expect(() => validate(undefined)).not.toThrow();
    });

    test('should reject invalid configuration', () => {
        const config = {
            probes: 2,
        };
        expect(() => validate(config)).toThrowErrorMatchingSnapshot();
    });
});
