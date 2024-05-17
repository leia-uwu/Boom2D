export const ClientConfig: ClientConfigType = {
    servers: {
        local: {
            name: "Local",
            address: "127.0.0.1:8000",
            https: false
        }
    },
    defaultServer: "local"
};

interface ClientConfigType {
    readonly servers: Record<string, {
        readonly name: string
        readonly address: string
        readonly https: boolean
    }>
    readonly defaultServer: string
}
