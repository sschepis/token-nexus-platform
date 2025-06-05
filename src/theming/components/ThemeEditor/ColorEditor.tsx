import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Palette, 
  Eye, 
  Copy, 
  Check, 
  AlertTriangle,
  RefreshCw,
  Pipette
} from 'lucide-react';
import { OrganizationTheme } from '../../types/theme.types';
import { updateCurrentTheme } from '@/store/slices/themeSlice';
import type { AppDispatch } from '@/store/store';

interface ColorEditorProps {
  theme: OrganizationTheme;
  organizationId: string;
}

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
  showContrast?: boolean;
  contrastBackground?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  value,
  onChange,
  description,
  showContrast = false,
  contrastBackground = '#ffffff'
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy color:', error);
    }
  }, [value]);

  const calculateContrast = useCallback((color1: string, color2: string): number => {
    // Simplified contrast calculation
    // In production, use a proper color library
    const getLuminance = (hex: string): number => {
      const rgb = parseInt(hex.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    };

    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }, []);

  const contrastRatio = showContrast ? calculateContrast(value, contrastBackground) : 0;
  const contrastLevel = contrastRatio >= 7 ? 'AAA' : contrastRatio >= 4.5 ? 'AA' : 'Fail';

  return (
    <div className="space-y-2">
      <Label htmlFor={`color-${label}`} className="text-sm font-medium">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Input
            id={`color-${label}`}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-12 h-10 p-1 border rounded cursor-pointer"
          />
        </div>
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-sm"
          placeholder="#000000"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="px-2"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {showContrast && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Contrast:</span>
          <Badge 
            variant={contrastLevel === 'AAA' ? 'default' : contrastLevel === 'AA' ? 'secondary' : 'destructive'}
            className="text-xs"
          >
            {contrastRatio.toFixed(1)}:1 ({contrastLevel})
          </Badge>
        </div>
      )}
    </div>
  );
};

export const ColorEditor: React.FC<ColorEditorProps> = ({ theme, organizationId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [previewColor, setPreviewColor] = useState<string | null>(null);

  const updateColor = useCallback((path: string, value: string) => {
    const pathParts = path.split('.');
    const update: Record<string, unknown> = {};
    
    // Build nested update object
    let current: Record<string, unknown> = update;
    for (let i = 0; i < pathParts.length - 1; i++) {
      current[pathParts[i]] = {};
      current = current[pathParts[i]] as Record<string, unknown>;
    }
    current[pathParts[pathParts.length - 1]] = value;

    dispatch(updateCurrentTheme(update));
  }, [dispatch]);

  const generateColorPalette = useCallback((baseColor: string) => {
    // Generate a neutral palette based on the base color
    // This is a simplified implementation
    const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
    const palette: Record<string, string> = {};
    
    shades.forEach((shade, index) => {
      const lightness = 95 - (index * 8.5);
      palette[shade.toString()] = `hsl(0, 0%, ${lightness}%)`;
    });

    return palette;
  }, []);

  const applyGeneratedPalette = useCallback(() => {
    const palette = generateColorPalette(theme.colors.primary);
    dispatch(updateCurrentTheme({
      colors: {
        neutral: palette
      }
    }));
  }, [theme.colors.primary, generateColorPalette, dispatch]);

  const resetToDefaults = useCallback(() => {
    // Reset to platform defaults
    dispatch(updateCurrentTheme({
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
        accent: '#8b5cf6',
        background: '#ffffff',
        surface: '#f8fafc',
        text: {
          primary: '#1e293b',
          secondary: '#475569',
          muted: '#94a3b8'
        },
        border: '#e2e8f0',
        input: '#e2e8f0',
        ring: '#3b82f6',
        destructive: '#ef4444',
        warning: '#f59e0b',
        success: '#10b981',
        info: '#06b6d4'
      }
    }));
  }, [dispatch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color Palette
          </h3>
          <p className="text-sm text-muted-foreground">
            Customize your organization's color scheme
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={applyGeneratedPalette}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate Palette
          </Button>
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            Reset to Defaults
          </Button>
        </div>
      </div>

      {/* Primary Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Primary Colors</CardTitle>
          <CardDescription>
            Main brand colors that define your organization's identity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ColorPicker
              label="Primary"
              value={theme.colors.primary}
              onChange={(value) => updateColor('colors.primary', value)}
              description="Main brand color used for buttons, links, and highlights"
              showContrast
              contrastBackground={theme.colors.background}
            />
            <ColorPicker
              label="Secondary"
              value={theme.colors.secondary}
              onChange={(value) => updateColor('colors.secondary', value)}
              description="Secondary brand color for accents and variations"
              showContrast
              contrastBackground={theme.colors.background}
            />
            <ColorPicker
              label="Accent"
              value={theme.colors.accent}
              onChange={(value) => updateColor('colors.accent', value)}
              description="Accent color for special highlights and call-to-actions"
              showContrast
              contrastBackground={theme.colors.background}
            />
          </div>
        </CardContent>
      </Card>

      {/* Background Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Background Colors</CardTitle>
          <CardDescription>
            Colors used for backgrounds and surfaces
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ColorPicker
              label="Background"
              value={theme.colors.background}
              onChange={(value) => updateColor('colors.background', value)}
              description="Main background color for the application"
            />
            <ColorPicker
              label="Surface"
              value={theme.colors.surface}
              onChange={(value) => updateColor('colors.surface', value)}
              description="Color for cards, modals, and elevated surfaces"
            />
          </div>
        </CardContent>
      </Card>

      {/* Text Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Text Colors</CardTitle>
          <CardDescription>
            Colors used for text content with proper contrast ratios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ColorPicker
              label="Primary Text"
              value={theme.colors.text.primary}
              onChange={(value) => updateColor('colors.text.primary', value)}
              description="Main text color for headings and important content"
              showContrast
              contrastBackground={theme.colors.background}
            />
            <ColorPicker
              label="Secondary Text"
              value={theme.colors.text.secondary}
              onChange={(value) => updateColor('colors.text.secondary', value)}
              description="Secondary text color for body content"
              showContrast
              contrastBackground={theme.colors.background}
            />
            <ColorPicker
              label="Muted Text"
              value={theme.colors.text.muted}
              onChange={(value) => updateColor('colors.text.muted', value)}
              description="Muted text color for captions and less important content"
              showContrast
              contrastBackground={theme.colors.background}
            />
          </div>
        </CardContent>
      </Card>

      {/* UI Element Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">UI Elements</CardTitle>
          <CardDescription>
            Colors for borders, inputs, and interactive elements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ColorPicker
              label="Border"
              value={theme.colors.border}
              onChange={(value) => updateColor('colors.border', value)}
              description="Color for borders and dividers"
            />
            <ColorPicker
              label="Input Background"
              value={theme.colors.input}
              onChange={(value) => updateColor('colors.input', value)}
              description="Background color for form inputs"
            />
            <ColorPicker
              label="Focus Ring"
              value={theme.colors.ring}
              onChange={(value) => updateColor('colors.ring', value)}
              description="Color for focus indicators and rings"
            />
          </div>
        </CardContent>
      </Card>

      {/* Status Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Colors</CardTitle>
          <CardDescription>
            Colors for different states and feedback messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ColorPicker
              label="Success"
              value={theme.colors.success}
              onChange={(value) => updateColor('colors.success', value)}
              description="Color for success states and positive feedback"
              showContrast
              contrastBackground={theme.colors.background}
            />
            <ColorPicker
              label="Warning"
              value={theme.colors.warning}
              onChange={(value) => updateColor('colors.warning', value)}
              description="Color for warning states and caution messages"
              showContrast
              contrastBackground={theme.colors.background}
            />
            <ColorPicker
              label="Error"
              value={theme.colors.destructive}
              onChange={(value) => updateColor('colors.destructive', value)}
              description="Color for error states and destructive actions"
              showContrast
              contrastBackground={theme.colors.background}
            />
            <ColorPicker
              label="Info"
              value={theme.colors.info}
              onChange={(value) => updateColor('colors.info', value)}
              description="Color for informational messages and neutral feedback"
              showContrast
              contrastBackground={theme.colors.background}
            />
          </div>
        </CardContent>
      </Card>

      {/* Color Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Color Preview</CardTitle>
          <CardDescription>
            Preview how your colors work together
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Sample UI Elements */}
            <div 
              className="p-4 rounded-lg border"
              style={{ 
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                color: theme.colors.text.primary
              }}
            >
              <h4 className="font-semibold mb-2" style={{ color: theme.colors.text.primary }}>
                Sample Content
              </h4>
              <p className="mb-3" style={{ color: theme.colors.text.secondary }}>
                This is how your text will look with the selected colors.
              </p>
              <div className="flex gap-2 mb-3">
                <button 
                  className="px-3 py-1 rounded text-sm font-medium"
                  style={{ 
                    backgroundColor: theme.colors.primary,
                    color: '#ffffff'
                  }}
                >
                  Primary Button
                </button>
                <button 
                  className="px-3 py-1 rounded text-sm font-medium border"
                  style={{ 
                    backgroundColor: 'transparent',
                    borderColor: theme.colors.border,
                    color: theme.colors.text.primary
                  }}
                >
                  Secondary Button
                </button>
              </div>
              <div className="flex gap-2">
                <span 
                  className="px-2 py-1 rounded text-xs"
                  style={{ 
                    backgroundColor: `${theme.colors.success}20`,
                    color: theme.colors.success
                  }}
                >
                  Success
                </span>
                <span 
                  className="px-2 py-1 rounded text-xs"
                  style={{ 
                    backgroundColor: `${theme.colors.warning}20`,
                    color: theme.colors.warning
                  }}
                >
                  Warning
                </span>
                <span 
                  className="px-2 py-1 rounded text-xs"
                  style={{ 
                    backgroundColor: `${theme.colors.destructive}20`,
                    color: theme.colors.destructive
                  }}
                >
                  Error
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility Notice */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Accessibility Tip:</strong> Ensure sufficient color contrast for text readability. 
          Aim for at least 4.5:1 contrast ratio for normal text and 3:1 for large text to meet WCAG AA standards.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ColorEditor;