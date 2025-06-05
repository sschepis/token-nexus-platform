import { ThemeTemplate } from '../types/theme.types';
import { corporateTheme } from './corporate';
import { modernTheme } from './modern';
import { minimalTheme } from './minimal';

/**
 * Theme Templates Index
 * Provides access to all available theme templates
 */

export const themeTemplates: Record<string, ThemeTemplate> = {
  corporate: corporateTheme,
  modern: modernTheme,
  minimal: minimalTheme
};

export const themeTemplatesList: ThemeTemplate[] = [
  corporateTheme,
  modernTheme,
  minimalTheme
];

/**
 * Gets a theme template by ID
 */
export const getThemeTemplate = (id: string): ThemeTemplate | null => {
  return themeTemplatesList.find(template => template.id === id) || null;
};

/**
 * Gets theme templates by category
 */
export const getThemeTemplatesByCategory = (category: ThemeTemplate['category']): ThemeTemplate[] => {
  return themeTemplatesList.filter(template => template.category === category);
};

/**
 * Gets theme templates by tags
 */
export const getThemeTemplatesByTags = (tags: string[]): ThemeTemplate[] => {
  return themeTemplatesList.filter(template => 
    tags.some(tag => template.tags.includes(tag))
  );
};

/**
 * Gets the most popular theme templates
 */
export const getPopularThemeTemplates = (limit = 5): ThemeTemplate[] => {
  return themeTemplatesList
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
};

/**
 * Searches theme templates by name or description
 */
export const searchThemeTemplates = (query: string): ThemeTemplate[] => {
  const lowercaseQuery = query.toLowerCase();
  return themeTemplatesList.filter(template => 
    template.name.toLowerCase().includes(lowercaseQuery) ||
    template.description.toLowerCase().includes(lowercaseQuery) ||
    template.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};

/**
 * Gets all available theme categories
 */
export const getThemeCategories = (): ThemeTemplate['category'][] => {
  const categories = new Set(themeTemplatesList.map(template => template.category));
  return Array.from(categories);
};

/**
 * Gets all available theme tags
 */
export const getThemeTags = (): string[] => {
  const tags = new Set(themeTemplatesList.flatMap(template => template.tags));
  return Array.from(tags).sort();
};

/**
 * Validates if a theme template exists
 */
export const isValidThemeTemplate = (id: string): boolean => {
  return themeTemplatesList.some(template => template.id === id);
};

// Export individual templates
export { corporateTheme } from './corporate';
export { modernTheme } from './modern';
export { minimalTheme } from './minimal';

// Export types
export type { ThemeTemplate } from '../types/theme.types';