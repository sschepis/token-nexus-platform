import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  LoadingAnimation, 
  SuccessAnimation, 
  ErrorAnimation,
  TokenCreatedAnimation,
  WelcomeAnimation 
} from '@/components/animations';
import { AnimatedButton } from '@/components/ui/animated-button';

const AnimationsDemo = () => {
  const [showTokenSuccess, setShowTokenSuccess] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Lottie Animations Demo</h1>
        <p className="text-muted-foreground">
          Showcase of integrated Lottie animations in the Token Nexus Platform
        </p>
      </div>

      {/* Loading Animations */}
      <Card>
        <CardHeader>
          <CardTitle>Loading Animations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <LoadingAnimation type="spinner" size="lg" />
              <p className="mt-2 text-sm">Spinner</p>
            </div>
            <div className="text-center">
              <LoadingAnimation type="dots" size="lg" />
              <p className="mt-2 text-sm">Dots</p>
            </div>
            <div className="text-center">
              <LoadingAnimation type="pulse" size="lg" />
              <p className="mt-2 text-sm">Pulse</p>
            </div>
            <div className="text-center">
              <LoadingAnimation type="progress" size="lg" />
              <p className="mt-2 text-sm">Progress</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Animations */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback Animations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <SuccessAnimation size="lg" />
              <p className="mt-2 text-sm">Success</p>
            </div>
            <div className="text-center">
              <ErrorAnimation size="lg" />
              <p className="mt-2 text-sm">Error</p>
            </div>
            <div className="text-center">
              <SuccessAnimation size="lg" />
              <p className="mt-2 text-sm">Checkmark</p>
            </div>
            <div className="text-center">
              <ErrorAnimation size="lg" />
              <p className="mt-2 text-sm">Cross</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Animated Buttons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AnimatedButton
              loadingAnimation={true}
              onClick={async () => {
                await new Promise(resolve => setTimeout(resolve, 2000));
              }}
            >
              Loading Button
            </AnimatedButton>
            
            <AnimatedButton
              successAnimation={true}
              onClick={async () => {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }}
            >
              Success Button
            </AnimatedButton>
            
            <AnimatedButton
              loadingAnimation={true}
              successAnimation={true}
              hoverAnimation={true}
              onClick={async () => {
                await new Promise(resolve => setTimeout(resolve, 1500));
              }}
            >
              Full Animation
            </AnimatedButton>
          </div>
        </CardContent>
      </Card>

      {/* Milestone Animations */}
      <Card>
        <CardHeader>
          <CardTitle>Milestone Celebrations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => setShowTokenSuccess(true)}
              className="h-20"
            >
              Show Token Creation Success
            </Button>
            
            <Button
              onClick={() => setShowWelcome(true)}
              className="h-20"
            >
              Show Welcome Animation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading States with Text */}
      <Card>
        <CardHeader>
          <CardTitle>Loading States with Text</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <LoadingAnimation 
              type="spinner" 
              size="md" 
              showText={true} 
              text="Loading dashboard..." 
            />
            <LoadingAnimation 
              type="dots" 
              size="md" 
              showText={true} 
              text="Processing transaction..." 
            />
            <LoadingAnimation 
              type="progress" 
              size="md" 
              showText={true} 
              text="Deploying contract..." 
            />
          </div>
        </CardContent>
      </Card>

      {/* Overlay Animations */}
      {showTokenSuccess && (
        <TokenCreatedAnimation
          overlay={true}
          title="Token Created Successfully!"
          description="Your new token has been deployed to the blockchain and is ready to use."
          onComplete={() => setShowTokenSuccess(false)}
        />
      )}

      {showWelcome && (
        <WelcomeAnimation
          overlay={true}
          title="Welcome to Token Nexus!"
          description="Let's get started with your blockchain journey."
          onComplete={() => setShowWelcome(false)}
        />
      )}
    </div>
  );
};

export default AnimationsDemo;