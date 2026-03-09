/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Du har blivit inbjuden till Odlingsdagboken</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://ysonnvbkrwajacvdkqut.supabase.co/storage/v1/object/public/email-assets/logo-odlingsdagboken.png" width="140" height="auto" alt="Odlingsdagboken" style={{ marginBottom: '24px' }} />
        <Heading style={h1}>Du har blivit inbjuden!</Heading>
        <Text style={text}>
          Någon har bjudit in dig till{' '}
          <Link href={siteUrl} style={link}><strong>Odlingsdagboken</strong></Link>.
          Klicka på knappen nedan för att acceptera inbjudan och skapa ditt konto.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Acceptera inbjudan
        </Button>
        <Text style={footer}>
          Om du inte väntade dig den här inbjudan kan du ignorera mejlet.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#242A30',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#6B7280',
  lineHeight: '1.6',
  margin: '0 0 28px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const button = {
  backgroundColor: '#4A7C59',
  color: '#FEFDFB',
  fontSize: '15px',
  borderRadius: '12px',
  padding: '14px 24px',
  textDecoration: 'none',
  fontWeight: '600' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0' }
