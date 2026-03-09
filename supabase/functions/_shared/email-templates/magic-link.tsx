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
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Din inloggningslänk för Odlingsdagboken</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://ysonnvbkrwajacvdkqut.supabase.co/storage/v1/object/public/email-assets/logo-odlingsdagboken.png" width="140" height="auto" alt="Odlingsdagboken" style={{ marginBottom: '24px' }} />
        <Heading style={h1}>Din inloggningslänk</Heading>
        <Text style={text}>
          Klicka på knappen nedan för att logga in på Odlingsdagboken. Länken är giltig en kort stund.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Logga in
        </Button>
        <Text style={footer}>
          Om du inte begärde denna länk kan du ignorera mejlet.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

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
