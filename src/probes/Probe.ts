export interface Probe {
    check(): Promise<void>;
    get value(): boolean;
}
