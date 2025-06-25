export function categorizeFacet(facetName: string): string {
  if (facetName.includes('ERC721') || facetName.includes('ERC20') || facetName.includes('Token')) return 'token';
  if (facetName.includes('Identity') || facetName.includes('Registry')) return 'identity';
  if (facetName.includes('Marketplace') || facetName.includes('Trade') || facetName.includes('Sale')) return 'marketplace';
  if (facetName.includes('Governance') || facetName.includes('Voting')) return 'governance';
  if (facetName.includes('DiamondCut') || facetName.includes('DiamondLoupe')) return 'core';
  return 'utility';
}

export function checkFacetCompatibility(facet: any): { compatible: boolean; reason?: string } {
  if (!facet.abi || !Array.isArray(facet.abi)) {
    return { compatible: false, reason: 'Missing or invalid ABI' };
  }

  const hasRequiredInterface = facet.abi.some((item: any) => 
    item.type === 'function' && 
    (item.name === 'supportsInterface' || item.name === 'facetAddress')
  );

  if (!hasRequiredInterface) {
    return { compatible: false, reason: 'Missing required diamond interface' };
  }

  return { compatible: true };
}

export function generateFacetDescription(facetName: string, category: string): string {
  const descriptions: Record<string, string> = {
    'DiamondCutFacet': 'Core facet for managing diamond upgrades and modifications',
    'DiamondLoupeFacet': 'Core facet for diamond introspection and facet discovery',
    'OwnershipFacet': 'Core facet for diamond ownership management',
    'ERC721Facet': 'NFT functionality with full ERC721 compliance',
    'ERC20Facet': 'Fungible token functionality with ERC20 compliance',
    'IdentityFacet': 'Decentralized identity management and verification',
    'MarketplaceFacet': 'Peer-to-peer trading and marketplace functionality',
    'GovernanceFacet': 'DAO governance and voting mechanisms'
  };

  if (descriptions[facetName]) {
    return descriptions[facetName];
  }

  const categoryDescriptions: Record<string, string> = {
    'token': 'Token-related functionality and standards compliance',
    'identity': 'Identity management and verification features',
    'marketplace': 'Trading and marketplace capabilities',
    'governance': 'Governance and voting mechanisms',
    'core': 'Essential diamond functionality',
    'utility': 'Additional utility and helper functions'
  };

  return categoryDescriptions[category] || 'Custom facet functionality';
}