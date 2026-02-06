import type { SourceAdapter, TargetAdapter } from "./types.js";

export class AdapterRegistry {
  private sources = new Map<string, SourceAdapter>();
  private targets = new Map<string, TargetAdapter>();

  registerSource(adapter: SourceAdapter): void {
    this.sources.set(adapter.name, adapter);
  }

  registerTarget(adapter: TargetAdapter): void {
    this.targets.set(adapter.name, adapter);
  }

  getSource(name: string): SourceAdapter {
    const adapter = this.sources.get(name);
    if (!adapter) {
      throw new Error(`Unknown source adapter: "${name}"`);
    }
    return adapter;
  }

  getTarget(name: string): TargetAdapter {
    const adapter = this.targets.get(name);
    if (!adapter) {
      throw new Error(`Unknown target adapter: "${name}"`);
    }
    return adapter;
  }

  listSources(): string[] {
    return [...this.sources.keys()];
  }

  listTargets(): string[] {
    return [...this.targets.keys()];
  }

  async detectSource(path: string): Promise<SourceAdapter | undefined> {
    for (const adapter of this.sources.values()) {
      if (await adapter.detect(path)) {
        return adapter;
      }
    }
    return undefined;
  }
}
