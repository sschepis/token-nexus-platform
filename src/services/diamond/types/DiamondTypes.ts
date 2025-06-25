export interface DiamondOptions {
  blockchain?: string;
  network?: string;
  autoCreate?: boolean;
}

export interface DiamondConfig {
  blockchain: string;
  network: string;
}

export interface FacetInstallationConfig {
  facetInstance: any;
  deploymentTx?: string;
}

export interface FacetCompatibility {
  compatible: boolean;
  reason?: string;
}