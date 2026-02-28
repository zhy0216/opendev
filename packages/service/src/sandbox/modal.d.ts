declare module 'modal' {
  interface SandboxConfig {
    image: string;
    encrypted_ports: number[];
    idle_timeout: number;
  }

  interface SandboxInstance {
    object_id: string;
    tunnels(options: { timeout: number }): Promise<Record<number, { url: string } | undefined>>;
    terminate(): Promise<void>;
  }

  export const Sandbox: {
    create(config: SandboxConfig): Promise<SandboxInstance>;
    from_id(id: string): Promise<SandboxInstance>;
  };
}
