
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface ColorPickerProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  id,
  value,
  onChange,
}) => {
  const [color, setColor] = useState<string>(value);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setColor(e.target.value);
    onChange(e.target.value);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    // Validate if it's a proper hex color
    if (/^#([0-9A-F]{3}){1,2}$/i.test(newColor) || newColor === '#') {
      setColor(newColor);
      if (newColor !== '#') {
        onChange(newColor);
      }
    }
  };

  const predefinedColors = [
    '#ffffff', '#000000', '#f44336', '#e91e63', '#9c27b0',
    '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
    '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b',
    '#ffc107', '#ff9800', '#ff5722', '#795548', '#9e9e9e',
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-start text-left font-normal"
        >
          <div className="flex items-center gap-2">
            <div 
              className="h-4 w-4 rounded border" 
              style={{ backgroundColor: color }}
            />
            <span>{color}</span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-2">
          <div className="grid grid-cols-5 gap-2">
            {predefinedColors.map((colorOption) => (
              <button
                key={colorOption}
                type="button"
                onClick={() => {
                  setColor(colorOption);
                  onChange(colorOption);
                }}
                className="h-6 w-6 rounded-md border"
                style={{ backgroundColor: colorOption }}
                aria-label={`Select color ${colorOption}`}
              />
            ))}
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1">
              <Input 
                type="text"
                id={`${id}-hex`}
                value={color}
                onChange={handleHexChange}
                placeholder="#000000"
              />
            </div>
            <div>
              <Input
                type="color"
                id={id} 
                value={color}
                onChange={handleColorChange}
                className="h-10 w-10 p-0 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
