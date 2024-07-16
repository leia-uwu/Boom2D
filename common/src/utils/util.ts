export function assert(value: unknown, message?: string | Error): asserts value {
    if (!value) {
        const error =
            message instanceof Error
                ? message
                : new Error(message ?? "Assertation failed");
        throw error;
    }
}
