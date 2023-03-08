export interface Probe {
    check(): void;
    get value(): boolean;
}
