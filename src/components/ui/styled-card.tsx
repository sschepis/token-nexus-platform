
import React from 'react';
import tw, { styled } from 'twin.macro';

// Using twin.macro to create styled components with Tailwind classes
const StyledCardWrapper = styled.div`
  ${tw`rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-xl`}
  
  &:hover {
    ${tw`transform -translate-y-1`}
  }
`;

const StyledCardHeader = styled.div<{ $color?: 'primary' | 'secondary' | 'accent' | 'default' }>`
  ${tw`p-4 flex items-center justify-between`}
  
  ${({ $color }) => {
    switch ($color) {
      case 'primary':
        return tw`bg-primary text-primary-foreground`;
      case 'secondary':
        return tw`bg-secondary text-secondary-foreground`;
      case 'accent':
        return tw`bg-accent text-accent-foreground`;
      default:
        return tw`bg-card text-card-foreground`;
    }
  }}
`;

const StyledCardBody = styled.div`
  ${tw`p-6 bg-card text-card-foreground`}
`;

const StyledCardFooter = styled.div`
  ${tw`p-4 border-t bg-muted/20`}
`;

interface StyledCardProps {
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerColor?: 'primary' | 'secondary' | 'accent' | 'default';
  className?: string;
}

export function StyledCard({
  header,
  children,
  footer,
  headerColor = 'default',
  className = '',
}: StyledCardProps) {
  return (
    <StyledCardWrapper className={className}>
      {header && <StyledCardHeader $color={headerColor}>{header}</StyledCardHeader>}
      <StyledCardBody>{children}</StyledCardBody>
      {footer && <StyledCardFooter>{footer}</StyledCardFooter>}
    </StyledCardWrapper>
  );
}

// Example usage:
// <StyledCard 
//   header={<h3 className="text-lg font-semibold">Card Title</h3>}
//   footer={<p className="text-sm text-muted-foreground">Footer content</p>}
//   headerColor="primary"
// >
//   <p>Card content goes here</p>
// </StyledCard>
