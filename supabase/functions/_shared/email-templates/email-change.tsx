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

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Bekräfta byte av e-postadress</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://ysonnvbkrwajacvdkqut.supabase.co/storage/v1/object/public/email-assets/logo-odlingsdagboken.png" width="140" height="auto" alt="Odlingsdagboken" style={{ marginBottom: '24px' }} />
        <Heading style={h1}>Bekräfta din nya e-postadress</Heading>
        <Text style={text}>
          Du har begärt att byta e-postadress från{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link> till{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Text style={text}>
          Klicka på knappen nedan för att bekräfta bytet:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Bekräfta ny e-post
        </Button>
        <Text style={footer}>
          Om du inte begärde detta, säkra ditt konto omedelbart.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
