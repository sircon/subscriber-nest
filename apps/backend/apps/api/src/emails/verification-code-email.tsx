import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface VerificationCodeEmailProps {
  code: string;
}

export const VerificationCodeEmail = ({
  code,
}: VerificationCodeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your verification code for Audience Safe</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Your Audience Safe Code</Heading>
          <Text style={paragraph}>
            Use this one-time code to finish signing in. It expires in 10 minutes.
          </Text>
          <Section style={codeContainer}>
            <Text style={codeLabel}>Verification code</Text>
            <Text style={codeText}>{code}</Text>
          </Section>
          <Text style={paragraph}>
            For your security, never share this code with anyone.
          </Text>
          <Text style={paragraph}>
            If you didn't request this code, you can safely ignore this email.
          </Text>
          <Text style={footer}>
            © {new Date().getFullYear()} Audience Safe. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
};

const heading = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '0 0 20px',
  textAlign: 'center' as const,
  padding: '0 40px',
};

const paragraph = {
  color: '#4a4a4a',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
  padding: '0 40px',
};

const codeContainer = {
  backgroundColor: '#f5f5f5',
  borderRadius: '8px',
  margin: '24px auto',
  padding: '24px',
  textAlign: 'center' as const,
  maxWidth: '300px',
  border: '1px solid #e6e6e6',
};

const codeLabel = {
  color: '#6b7280',
  fontSize: '12px',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px',
};

const codeText = {
  color: '#1a1a1a',
  fontSize: '36px',
  fontWeight: '700',
  letterSpacing: '6px',
  lineHeight: '1.2',
  margin: '0',
  fontFamily: 'monospace',
};

const footer = {
  color: '#888888',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '32px 0 0',
  padding: '0 40px',
  textAlign: 'center' as const,
};

export default VerificationCodeEmail;
